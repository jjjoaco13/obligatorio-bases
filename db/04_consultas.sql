-- Consultas SQL del backend (backend/rutas/*.py). Referencia: no se ejecuta.
-- %s y %(nombre)s son parámetros: el backend los pasa aparte, sin concatenarlos (evita inyección SQL).

-- ===== INICIO DE SESIÓN (sesion.py) =====

-- Login: buscar usuario por correo (la contraseña se compara con bcrypt) (POST /login)
SELECT correo, contrasena, rol FROM login WHERE correo = %s;

-- ===== FACULTADES, TURNOS Y TORNEOS (catalogos.py) =====

-- Listar facultades (GET /facultades)
SELECT id_facultad, nombre FROM facultad ORDER BY nombre;

-- Listar turnos (GET /turnos)
SELECT id_turno, hora_inicio, hora_fin FROM turno ORDER BY hora_inicio;

-- Listar torneos (GET /torneos)
SELECT id_torneo, nombre, anio, semestre, fecha_inicio, fecha_fin, estado
FROM torneo
ORDER BY anio DESC, semestre DESC;

-- Crear torneo (POST /torneos)
INSERT INTO torneo (nombre, anio, semestre, fecha_inicio, fecha_fin, estado)
VALUES (%(nombre)s, %(anio)s, %(semestre)s, %(fecha_inicio)s, %(fecha_fin)s, %(estado)s);

-- Modificar torneo (PUT /torneos/<int:id_torneo>)
-- Verificar que exista el torneo
SELECT 1 FROM torneo WHERE id_torneo = %s;
UPDATE torneo SET nombre = %(nombre)s, anio = %(anio)s, semestre = %(semestre)s,
    fecha_inicio = %(fecha_inicio)s, fecha_fin = %(fecha_fin)s, estado = %(estado)s
WHERE id_torneo = %(id_torneo)s;

-- Eliminar torneo (DELETE /torneos/<int:id_torneo>)
DELETE FROM torneo WHERE id_torneo = %s;

-- Jugadores inscriptos en un torneo (GET /torneos/<int:id_torneo>/inscriptos)
SELECT j.ci, j.nombre, j.apellido, e.id_equipo, e.nombre AS equipo
FROM equipo_jugador_torneo ejt
JOIN jugador j ON j.ci = ejt.ci_jugador
JOIN equipo e ON e.id_equipo = ejt.id_equipo
WHERE ejt.id_torneo = %s
ORDER BY j.apellido, j.nombre;

-- ===== JUGADORES (jugadores.py) =====

-- Listar jugadores (GET /jugadores)
SELECT j.ci, j.nombre, j.apellido, j.email, j.fecha_nacimiento, j.tipo,
       j.id_facultad, f.nombre AS facultad
FROM jugador j
JOIN facultad f ON f.id_facultad = j.id_facultad  -- opcional: WHERE j.id_facultad = %s
ORDER BY j.apellido, j.nombre;

-- Crear jugador (POST /jugadores)
-- Verificar que la cédula no esté registrada
SELECT 1 FROM jugador WHERE ci = %s;
INSERT INTO jugador (ci, nombre, apellido, email, fecha_nacimiento, id_facultad, tipo)
VALUES (%(ci)s, %(nombre)s, %(apellido)s, %(email)s, %(fecha_nacimiento)s, %(id_facultad)s, %(tipo)s);

-- Modificar jugador (PUT /jugadores/<ci>)
-- Facultad actual del jugador
SELECT id_facultad FROM jugador WHERE ci = %s;
-- No cambiar la facultad si integra un plantel de otra facultad
SELECT 1 FROM equipo_jugador_torneo ejt
JOIN equipo e ON e.id_equipo = ejt.id_equipo
WHERE ejt.ci_jugador = %s AND e.id_facultad <> %s;
UPDATE jugador SET nombre = %(nombre)s, apellido = %(apellido)s, email = %(email)s,
    fecha_nacimiento = %(fecha_nacimiento)s, id_facultad = %(id_facultad)s, tipo = %(tipo)s
WHERE ci = %(ci)s;

-- Eliminar jugador (DELETE /jugadores/<ci>)
-- No borrar un jugador que integra un plantel
SELECT 1 FROM equipo_jugador_torneo WHERE ci_jugador = %s;
DELETE FROM jugador WHERE ci = %s;

-- ===== EQUIPOS Y PLANTELES (equipos.py) =====

-- Obtener un equipo con el estado de su torneo (auxiliar)
SELECT e.id_equipo, e.nombre, e.id_torneo, e.id_facultad, e.ci_capitan, t.estado AS estado_torneo
FROM equipo e JOIN torneo t ON t.id_torneo = e.id_torneo
WHERE e.id_equipo = %s;

-- Listar equipos (GET /equipos)
SELECT e.id_equipo, e.nombre, e.id_torneo, t.nombre AS torneo, t.estado AS estado_torneo,
       e.id_facultad, f.nombre AS facultad, e.ci_capitan,
       CONCAT(c.nombre, ' ', c.apellido) AS capitan,
       (SELECT COUNT(*) FROM equipo_jugador_torneo ejt WHERE ejt.id_equipo = e.id_equipo) AS cantidad_jugadores
FROM equipo e
JOIN torneo t ON t.id_torneo = e.id_torneo
JOIN facultad f ON f.id_facultad = e.id_facultad
LEFT JOIN jugador c ON c.ci = e.ci_capitan  -- opcional: WHERE e.id_torneo = %s
ORDER BY e.nombre;

-- Crear equipo (POST /equipos)
-- El torneo tiene que estar en inscripción
SELECT estado FROM torneo WHERE id_torneo = %s;
INSERT INTO equipo (nombre, id_torneo, id_facultad)
VALUES (%(nombre)s, %(id_torneo)s, %(id_facultad)s);

-- Modificar equipo (PUT /equipos/<int:id_equipo>)
-- ¿El equipo tiene plantel?
SELECT 1 FROM equipo_jugador_torneo WHERE id_equipo = %s;
-- El capitán tiene que ser del plantel
SELECT 1 FROM equipo_jugador_torneo WHERE id_equipo = %s AND ci_jugador = %s;
UPDATE equipo SET nombre = %s, id_facultad = %s, ci_capitan = %s WHERE id_equipo = %s;

-- Eliminar equipo (DELETE /equipos/<int:id_equipo>)
-- No borrar un equipo que ya tiene partidos
SELECT 1 FROM partido WHERE id_equipo_local = %s OR id_equipo_visitante = %s;
-- Se borra en orden: capitán, plantel y equipo
UPDATE equipo SET ci_capitan = NULL WHERE id_equipo = %s;
DELETE FROM equipo_jugador_torneo WHERE id_equipo = %s;
DELETE FROM equipo WHERE id_equipo = %s;

-- Listar el plantel de un equipo (GET /equipos/<int:id_equipo>/plantel)
SELECT ejt.ci_jugador AS ci, j.nombre, j.apellido, j.tipo, ejt.numero_camiseta,
       (e.ci_capitan = ejt.ci_jugador) AS es_capitan
FROM equipo_jugador_torneo ejt
JOIN jugador j ON j.ci = ejt.ci_jugador
JOIN equipo e ON e.id_equipo = ejt.id_equipo
WHERE ejt.id_equipo = %s
ORDER BY ejt.numero_camiseta;

-- Agregar un jugador al plantel (POST /equipos/<int:id_equipo>/plantel)
-- Facultad y tipo del jugador
SELECT id_facultad, tipo FROM jugador WHERE ci = %s;
-- Máximo 10 jugadores y máximo 2 docentes o funcionarios
SELECT COUNT(*) AS total,
       COALESCE(SUM(j.tipo IN ('docente', 'funcionario')), 0) AS docentes_funcionarios
FROM equipo_jugador_torneo ejt JOIN jugador j ON j.ci = ejt.ci_jugador
WHERE ejt.id_equipo = %s;
-- Un jugador no puede integrar dos equipos de la misma edición
SELECT e.nombre FROM equipo_jugador_torneo ejt JOIN equipo e ON e.id_equipo = ejt.id_equipo
WHERE ejt.ci_jugador = %s AND ejt.id_torneo = %s;
INSERT INTO equipo_jugador_torneo (id_equipo, ci_jugador, id_torneo, numero_camiseta)
VALUES (%s, %s, %s, %s);

-- Quitar un jugador del plantel (DELETE /equipos/<int:id_equipo>/plantel/<ci>)
DELETE FROM equipo_jugador_torneo WHERE id_equipo = %s AND ci_jugador = %s;

-- ===== COMPLEJOS Y CANCHAS (complejos.py) =====

-- Listar complejos (GET /complejos)
SELECT c.id_complejo, c.nombre, c.direccion, c.departamento,
       (SELECT COUNT(*) FROM cancha ca WHERE ca.id_complejo = c.id_complejo) AS cantidad_canchas
FROM complejo c
ORDER BY c.nombre;

-- Crear complejo (POST /complejos)
INSERT INTO complejo (nombre, direccion, departamento)
VALUES (%(nombre)s, %(direccion)s, %(departamento)s);

-- Modificar complejo (PUT /complejos/<int:id_complejo>)
-- Verificar que exista el complejo
SELECT 1 FROM complejo WHERE id_complejo = %s;
UPDATE complejo SET nombre = %(nombre)s, direccion = %(direccion)s, departamento = %(departamento)s
WHERE id_complejo = %(id_complejo)s;

-- Eliminar complejo (DELETE /complejos/<int:id_complejo>)
-- No borrar un complejo con canchas
SELECT 1 FROM cancha WHERE id_complejo = %s;
DELETE FROM complejo WHERE id_complejo = %s;

-- Listar canchas (GET /canchas)
SELECT ca.nombre_cancha, ca.id_complejo, c.nombre AS complejo, ca.superficie, ca.techada
FROM cancha ca JOIN complejo c ON c.id_complejo = ca.id_complejo  -- opcional: WHERE ca.id_complejo = %s
ORDER BY c.nombre, ca.nombre_cancha;

-- Crear cancha (POST /complejos/<int:id_complejo>/canchas)
-- Verificar que exista el complejo
SELECT 1 FROM complejo WHERE id_complejo = %s;
-- Verificar si la cancha existe
SELECT 1 FROM cancha WHERE id_complejo = %s AND nombre_cancha = %s;
INSERT INTO cancha (nombre_cancha, id_complejo, superficie, techada) VALUES (%s, %s, %s, %s);

-- Modificar cancha (PUT /complejos/<int:id_complejo>/canchas/<nombre_cancha>)
-- Verificar si la cancha existe
SELECT 1 FROM cancha WHERE id_complejo = %s AND nombre_cancha = %s;
UPDATE cancha SET superficie = %s, techada = %s WHERE id_complejo = %s AND nombre_cancha = %s;

-- Eliminar cancha (DELETE /complejos/<int:id_complejo>/canchas/<nombre_cancha>)
-- No borrar una cancha con partidos
SELECT 1 FROM partido WHERE id_complejo = %s AND nombre_cancha = %s;
DELETE FROM cancha WHERE id_complejo = %s AND nombre_cancha = %s;

-- ===== PARTIDOS (partidos.py) =====

-- Ver y listar partidos, con el resultado calculado desde los goles (autogol suma al rival)
SELECT p.id_partido, p.id_torneo, t.nombre AS torneo, p.numero_fecha, p.dia, p.id_turno,
       tu.hora_inicio, tu.hora_fin, p.nombre_cancha, p.id_complejo, c.nombre AS complejo, p.estado,
       p.id_equipo_local, el.nombre AS equipo_local, p.id_equipo_visitante, ev.nombre AS equipo_visitante,
       (SELECT COUNT(*) FROM gol g
        JOIN planilla_partido pp ON pp.id_partido = g.id_partido AND pp.ci_jugador = g.ci_jugador
        WHERE g.id_partido = p.id_partido
          AND ((pp.id_equipo = p.id_equipo_local AND NOT g.autogol)
            OR (pp.id_equipo = p.id_equipo_visitante AND g.autogol))) AS goles_local,
       (SELECT COUNT(*) FROM gol g
        JOIN planilla_partido pp ON pp.id_partido = g.id_partido AND pp.ci_jugador = g.ci_jugador
        WHERE g.id_partido = p.id_partido
          AND ((pp.id_equipo = p.id_equipo_visitante AND NOT g.autogol)
            OR (pp.id_equipo = p.id_equipo_local AND g.autogol))) AS goles_visitante
FROM partido p
JOIN torneo t ON t.id_torneo = p.id_torneo
JOIN turno tu ON tu.id_turno = p.id_turno
JOIN complejo c ON c.id_complejo = p.id_complejo
JOIN equipo el ON el.id_equipo = p.id_equipo_local
JOIN equipo ev ON ev.id_equipo = p.id_equipo_visitante
WHERE p.id_partido = %s;  -- al listar: filtros opcionales por torneo y fecha

-- Reglas de programación de un partido (se usan al crear y al modificar)
-- El día tiene que estar dentro de las fechas del torneo
SELECT fecha_inicio, fecha_fin, estado FROM torneo WHERE id_torneo = %s;
-- Ambos equipos de la misma edición y con al menos 5 jugadores
SELECT e.nombre, e.id_torneo,
       (SELECT COUNT(*) FROM equipo_jugador_torneo ejt WHERE ejt.id_equipo = e.id_equipo) AS jugadores
FROM equipo e WHERE e.id_equipo = %s;
-- Verificar que exista el turno
SELECT 1 FROM turno WHERE id_turno = %s;
-- Verificar que exista la cancha
SELECT 1 FROM cancha WHERE nombre_cancha = %s AND id_complejo = %s;
-- No repetir rival en la edición (salvo partido cancelado)
SELECT 1 FROM partido
WHERE id_torneo = %s AND estado <> 'cancelado' AND id_partido <> %s
  AND LEAST(id_equipo_local, id_equipo_visitante) = LEAST(%s, %s)
  AND GREATEST(id_equipo_local, id_equipo_visitante) = GREATEST(%s, %s);
-- Un equipo no juega dos partidos en la misma fecha
SELECT 1 FROM partido
WHERE id_torneo = %s AND numero_fecha = %s AND estado <> 'cancelado' AND id_partido <> %s
  AND (id_equipo_local IN (%s, %s) OR id_equipo_visitante IN (%s, %s));
-- La cancha no puede tener dos partidos en el mismo día y turno
SELECT 1 FROM partido
WHERE dia = %s AND id_turno = %s AND nombre_cancha = %s AND id_complejo = %s
  AND estado IN ('programado', 'jugado') AND id_partido <> %s;
-- Horario del turno (para controlar si el partido ya pasó)
SELECT hora_inicio, hora_fin FROM turno WHERE id_turno = %s;

-- Crear partido (POST /partidos)
INSERT INTO partido (id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante,
                     dia, id_turno, nombre_cancha, id_complejo, estado)
VALUES (%(id_torneo)s, %(numero_fecha)s, %(id_equipo_local)s, %(id_equipo_visitante)s,
        %(dia)s, %(id_turno)s, %(nombre_cancha)s, %(id_complejo)s, %(estado)s);

-- Modificar partido (PUT /partidos/<int:id_partido>)
UPDATE partido SET numero_fecha = %(numero_fecha)s, id_equipo_local = %(id_equipo_local)s,
    id_equipo_visitante = %(id_equipo_visitante)s, dia = %(dia)s, id_turno = %(id_turno)s,
    nombre_cancha = %(nombre_cancha)s, id_complejo = %(id_complejo)s, estado = %(estado)s
WHERE id_partido = %(id_partido)s;

-- Cambiar el estado de un partido (PATCH /partidos/<int:id_partido>/estado)
UPDATE partido SET estado = %s WHERE id_partido = %s;

-- Eliminar partido (DELETE /partidos/<int:id_partido>)
-- No borrar un partido que ya tiene planilla
SELECT 1 FROM planilla_partido WHERE id_partido = %s;
DELETE FROM partido WHERE id_partido = %s;

-- ===== PLANILLAS, GOLES Y TARJETAS (planillas.py) =====

-- Verificar que el jugador figure en la planilla (antes de un gol o tarjeta)
-- ¿Ya figura en la planilla?
SELECT 1 FROM planilla_partido WHERE id_partido = %s AND ci_jugador = %s;

-- Ver la planilla de un partido (GET /partidos/<int:id_partido>/planilla)
SELECT ejt.ci_jugador AS ci, j.nombre, j.apellido, ejt.id_equipo, ejt.numero_camiseta,
                  (pp.ci_jugador IS NOT NULL) AS en_planilla,
   EXISTS (SELECT 1 FROM sancion_jugador s
           WHERE s.ci_jugador = ejt.ci_jugador AND s.id_torneo = %(torneo)s
             AND %(fecha)s BETWEEN s.numero_fecha_inicio AND s.numero_fecha_inicio + s.cantidad_fechas - 1)
AS suspendido
           FROM equipo_jugador_torneo ejt
           JOIN jugador j ON j.ci = ejt.ci_jugador
           LEFT JOIN planilla_partido pp ON pp.id_partido = %(partido)s AND pp.ci_jugador = ejt.ci_jugador
           WHERE ejt.id_equipo IN (%(local)s, %(visitante)s)
           ORDER BY ejt.numero_camiseta;
SELECT g.id_gol, g.ci_jugador, j.nombre, j.apellido, pp.id_equipo, g.minuto, g.autogol
FROM gol g
JOIN jugador j ON j.ci = g.ci_jugador
JOIN planilla_partido pp ON pp.id_partido = g.id_partido AND pp.ci_jugador = g.ci_jugador
WHERE g.id_partido = %s
ORDER BY g.minuto, g.id_gol;
SELECT t.id_tarjeta, t.ci_jugador, j.nombre, j.apellido, pp.id_equipo, t.minuto, t.color
FROM tarjeta t
JOIN jugador j ON j.ci = t.ci_jugador
JOIN planilla_partido pp ON pp.id_partido = t.id_partido AND pp.ci_jugador = t.ci_jugador
WHERE t.id_partido = %s
ORDER BY t.minuto, t.id_tarjeta;

-- Agregar un jugador a la planilla (POST /partidos/<int:id_partido>/planilla)
-- El jugador tiene que ser del plantel de uno de los dos equipos
SELECT id_equipo FROM equipo_jugador_torneo
WHERE ci_jugador = %s AND id_equipo IN (%s, %s);
-- ¿Está suspendido en esta fecha?
SELECT EXISTS (SELECT 1 FROM sancion_jugador s WHERE s.ci_jugador = %(ci)s AND s.id_torneo = %(torneo)s AND %(fecha)s BETWEEN s.numero_fecha_inicio AND s.numero_fecha_inicio + s.cantidad_fechas - 1) AS s;
-- ¿Ya figura en la planilla?
SELECT 1 FROM planilla_partido WHERE id_partido = %s AND ci_jugador = %s;
INSERT INTO planilla_partido (id_partido, ci_jugador, id_equipo) VALUES (%s, %s, %s);

-- Quitar un jugador de la planilla (DELETE /partidos/<int:id_partido>/planilla/<ci>)
-- No quitar de la planilla a un jugador con goles o tarjetas
SELECT 1 FROM gol WHERE id_partido = %s AND ci_jugador = %s;
SELECT 1 FROM tarjeta WHERE id_partido = %s AND ci_jugador = %s;
DELETE FROM planilla_partido WHERE id_partido = %s AND ci_jugador = %s;

-- Agregar gol (POST /partidos/<int:id_partido>/goles)
INSERT INTO gol (id_partido, ci_jugador, minuto, autogol) VALUES (%s, %s, %s, %s);

-- Eliminar gol (DELETE /goles/<int:id_gol>)
-- Partido del gol (para controlar si se puede editar)
SELECT id_partido FROM gol WHERE id_gol = %s;
DELETE FROM gol WHERE id_gol = %s;

-- Agregar tarjeta (y sanción automática si corresponde) (POST /partidos/<int:id_partido>/tarjetas)
-- Un jugador no puede recibir dos rojas en el mismo partido
SELECT 1 FROM tarjeta WHERE id_partido = %s AND ci_jugador = %s AND color = 'roja';
INSERT INTO tarjeta (id_partido, ci_jugador, minuto, color) VALUES (%s, %s, %s, %s);
-- Amarillas del jugador en el torneo (cada 3, una fecha de suspensión)
SELECT COUNT(*) AS total FROM tarjeta t JOIN partido p ON p.id_partido = t.id_partido
WHERE t.ci_jugador = %s AND p.id_torneo = %s AND t.color = 'amarilla';
-- Sanción automática de 1 fecha para la fecha siguiente
INSERT INTO sancion_jugador (ci_jugador, id_torneo, motivo, numero_fecha_inicio, cantidad_fechas, id_tarjeta)
VALUES (%s, %s, %s, %s, 1, %s);

-- Eliminar tarjeta (y su sanción automática) (DELETE /tarjetas/<int:id_tarjeta>)
-- Partido de la tarjeta (para controlar si se puede editar)
SELECT id_partido FROM tarjeta WHERE id_tarjeta = %s;
-- Primero se borra la sanción que generó la tarjeta
DELETE FROM sancion_jugador WHERE id_tarjeta = %s;
DELETE FROM tarjeta WHERE id_tarjeta = %s;

-- ===== SANCIONES (sanciones.py) =====

-- Listar sanciones (GET /sanciones)
SELECT s.id_sancion, s.ci_jugador, j.nombre, j.apellido, e.nombre AS equipo, s.id_torneo,
       s.motivo, s.numero_fecha_inicio, s.cantidad_fechas,
       s.numero_fecha_inicio + s.cantidad_fechas - 1 AS numero_fecha_fin,
       s.id_tarjeta, s.descripcion
FROM sancion_jugador s
JOIN jugador j ON j.ci = s.ci_jugador
JOIN equipo_jugador_torneo ejt ON ejt.ci_jugador = s.ci_jugador AND ejt.id_torneo = s.id_torneo
JOIN equipo e ON e.id_equipo = ejt.id_equipo  -- opcional: WHERE s.id_torneo = %s
ORDER BY s.numero_fecha_inicio DESC, j.apellido;

-- Crear sanción disciplinaria (POST /sanciones)
-- El jugador tiene que estar inscripto en el torneo
SELECT 1 FROM equipo_jugador_torneo WHERE ci_jugador = %(ci_jugador)s AND id_torneo = %(id_torneo)s;
INSERT INTO sancion_jugador (ci_jugador, id_torneo, motivo, numero_fecha_inicio, cantidad_fechas, descripcion)
VALUES (%(ci_jugador)s, %(id_torneo)s, 'disciplinaria', %(numero_fecha_inicio)s, %(cantidad_fechas)s, %(descripcion)s);

-- Modificar sanción (PUT /sanciones/<int:id_sancion>)
-- Motivo actual de la sanción
SELECT motivo FROM sancion_jugador WHERE id_sancion = %s;
UPDATE sancion_jugador SET numero_fecha_inicio = %s, cantidad_fechas = %s, descripcion = %s
WHERE id_sancion = %s;

-- Eliminar sanción (DELETE /sanciones/<int:id_sancion>)
DELETE FROM sancion_jugador WHERE id_sancion = %s;

-- ===== REPORTES (reportes.py) ===== %(torneo)s = edición elegida

-- 1. Tabla de posiciones
WITH resultados AS (
    SELECT p.id_partido, p.id_equipo_local AS id_local, p.id_equipo_visitante AS id_visitante,
           SUM(CASE WHEN (pp.id_equipo = p.id_equipo_local AND NOT g.autogol)
                      OR (pp.id_equipo = p.id_equipo_visitante AND g.autogol) THEN 1 ELSE 0 END) AS goles_local,
           SUM(CASE WHEN (pp.id_equipo = p.id_equipo_visitante AND NOT g.autogol)
                      OR (pp.id_equipo = p.id_equipo_local AND g.autogol) THEN 1 ELSE 0 END) AS goles_visitante
    FROM partido p
    LEFT JOIN gol g ON g.id_partido = p.id_partido
    LEFT JOIN planilla_partido pp ON pp.id_partido = g.id_partido AND pp.ci_jugador = g.ci_jugador
    WHERE p.id_torneo = %(torneo)s AND p.estado = 'jugado'
    GROUP BY p.id_partido, p.id_equipo_local, p.id_equipo_visitante
),
lineas AS (
    SELECT id_local AS id_equipo, goles_local AS gf, goles_visitante AS gc FROM resultados
    UNION ALL
    SELECT id_visitante, goles_visitante, goles_local FROM resultados
)
SELECT e.nombre AS `Equipo`, f.nombre AS `Facultad`,
       COUNT(l.id_equipo) AS `PJ`,
       COALESCE(SUM(l.gf > l.gc), 0) AS `PG`,
       COALESCE(SUM(l.gf = l.gc), 0) AS `PE`,
       COALESCE(SUM(l.gf < l.gc), 0) AS `PP`,
       COALESCE(SUM(l.gf), 0) AS `GF`,
       COALESCE(SUM(l.gc), 0) AS `GC`,
       COALESCE(SUM(l.gf) - SUM(l.gc), 0) AS `DG`,
       COALESCE(SUM(3 * (l.gf > l.gc) + (l.gf = l.gc)), 0) AS `Pts`
FROM equipo e
JOIN facultad f ON f.id_facultad = e.id_facultad
LEFT JOIN lineas l ON l.id_equipo = e.id_equipo
WHERE e.id_torneo = %(torneo)s
GROUP BY e.id_equipo, e.nombre, f.nombre
ORDER BY `Pts` DESC, `DG` DESC, `GF` DESC, e.nombre;

-- 2. Tabla de goleadores
SELECT CONCAT(j.nombre, ' ', j.apellido) AS `Jugador`, e.nombre AS `Equipo`, COUNT(*) AS `Goles`
FROM gol g
JOIN partido p ON p.id_partido = g.id_partido
JOIN planilla_partido pp ON pp.id_partido = g.id_partido AND pp.ci_jugador = g.ci_jugador
JOIN equipo e ON e.id_equipo = pp.id_equipo
JOIN jugador j ON j.ci = g.ci_jugador
WHERE p.id_torneo = %(torneo)s AND p.estado = 'jugado' AND NOT g.autogol
GROUP BY j.ci, j.nombre, j.apellido, e.nombre
ORDER BY `Goles` DESC, `Jugador`
LIMIT 10;

-- 3. Fair play por equipo
SELECT e.nombre AS `Equipo`,
       COALESCE(SUM(t.color = 'amarilla'), 0) AS `Amarillas`,
       COALESCE(SUM(t.color = 'roja'), 0) AS `Rojas`,
       COALESCE(SUM(CASE t.color WHEN 'amarilla' THEN 1 WHEN 'roja' THEN 3 ELSE 0 END), 0) AS `Puntaje`
FROM equipo e
LEFT JOIN planilla_partido pp ON pp.id_equipo = e.id_equipo
LEFT JOIN tarjeta t ON t.id_partido = pp.id_partido AND t.ci_jugador = pp.ci_jugador
WHERE e.id_torneo = %(torneo)s
GROUP BY e.id_equipo, e.nombre
ORDER BY `Puntaje`, e.nombre;

-- 4. Promedio de goles por partido
SELECT `Fecha`, `Partidos`, `Goles`, `Promedio` FROM (
    SELECT CONCAT('Fecha ', p.numero_fecha) AS `Fecha`, p.numero_fecha AS orden,
           COUNT(DISTINCT p.id_partido) AS `Partidos`, COUNT(g.id_gol) AS `Goles`,
           ROUND(COUNT(g.id_gol) / COUNT(DISTINCT p.id_partido), 2) AS `Promedio`
    FROM partido p LEFT JOIN gol g ON g.id_partido = p.id_partido
    WHERE p.id_torneo = %(torneo)s AND p.estado = 'jugado'
    GROUP BY p.numero_fecha
    UNION ALL
    SELECT 'Toda la edición', 999999,
           COUNT(DISTINCT p.id_partido), COUNT(g.id_gol),
           ROUND(COUNT(g.id_gol) / NULLIF(COUNT(DISTINCT p.id_partido), 0), 2)
    FROM partido p LEFT JOIN gol g ON g.id_partido = p.id_partido
    WHERE p.id_torneo = %(torneo)s AND p.estado = 'jugado'
) AS promedios
ORDER BY orden;

-- 5. Canchas más utilizadas
SELECT c.nombre AS `Complejo`, ca.nombre_cancha AS `Cancha`, COUNT(p.id_partido) AS `Partidos`
FROM cancha ca
JOIN complejo c ON c.id_complejo = ca.id_complejo
LEFT JOIN partido p ON p.nombre_cancha = ca.nombre_cancha AND p.id_complejo = ca.id_complejo
                   AND p.id_torneo = %(torneo)s AND p.estado IN ('programado', 'jugado')
GROUP BY c.id_complejo, c.nombre, ca.nombre_cancha
ORDER BY `Partidos` DESC, c.nombre, ca.nombre_cancha;

-- 6. Turnos más utilizados
SELECT CONCAT(LEFT(t.hora_inicio, 5), ' a ', LEFT(t.hora_fin, 5)) AS `Turno`,
       COUNT(p.id_partido) AS `Partidos`
FROM turno t
LEFT JOIN partido p ON p.id_turno = t.id_turno
                   AND p.id_torneo = %(torneo)s AND p.estado IN ('programado', 'jugado')
GROUP BY t.id_turno, t.hora_inicio, t.hora_fin
ORDER BY `Partidos` DESC, t.hora_inicio;

-- 7. Jugadores por facultad y tipo
SELECT f.nombre AS `Facultad`,
       COALESCE(SUM(j.tipo = 'grado'), 0) AS `Grado`,
       COALESCE(SUM(j.tipo = 'posgrado'), 0) AS `Posgrado`,
       COALESCE(SUM(j.tipo = 'docente'), 0) AS `Docente`,
       COALESCE(SUM(j.tipo = 'funcionario'), 0) AS `Funcionario`,
       COUNT(j.ci) AS `Total`
FROM facultad f
LEFT JOIN jugador j ON j.id_facultad = f.id_facultad
GROUP BY f.id_facultad, f.nombre
ORDER BY `Total` DESC, f.nombre;

-- 8. Jugadores inscriptos que nunca figuraron en una planilla
SELECT CONCAT(j.nombre, ' ', j.apellido) AS `Jugador`, j.ci AS `CI`,
       e.nombre AS `Equipo`, ejt.numero_camiseta AS `Camiseta`
FROM equipo_jugador_torneo ejt
JOIN jugador j ON j.ci = ejt.ci_jugador
JOIN equipo e ON e.id_equipo = ejt.id_equipo
WHERE ejt.id_torneo = %(torneo)s
  AND NOT EXISTS (SELECT 1 FROM planilla_partido pp
                  WHERE pp.ci_jugador = ejt.ci_jugador AND pp.id_equipo = ejt.id_equipo)
ORDER BY e.nombre, j.apellido;

-- 9. Sanciones por equipo y motivo
SELECT e.nombre AS `Equipo`,
       COALESCE(SUM(s.motivo = 'roja'), 0) AS `Roja`,
       COALESCE(SUM(s.motivo = 'acumulacion_amarillas'), 0) AS `Acumulación de amarillas`,
       COALESCE(SUM(s.motivo = 'disciplinaria'), 0) AS `Disciplinaria`,
       COUNT(s.id_sancion) AS `Total`
FROM equipo e
LEFT JOIN equipo_jugador_torneo ejt ON ejt.id_equipo = e.id_equipo
LEFT JOIN sancion_jugador s ON s.ci_jugador = ejt.ci_jugador AND s.id_torneo = ejt.id_torneo
WHERE e.id_torneo = %(torneo)s
GROUP BY e.id_equipo, e.nombre
ORDER BY `Total` DESC, e.nombre;

-- 10. Partidos jugados vs. postergados / cancelados
SELECT estado AS `Estado`, COUNT(*) AS `Partidos`,
       ROUND(100 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS `Porcentaje`
FROM partido
WHERE id_torneo = %(torneo)s
GROUP BY estado
ORDER BY `Partidos` DESC;

-- 11. Jugadores más tarjeteados (propia)
SELECT CONCAT(j.nombre, ' ', j.apellido) AS `Jugador`, e.nombre AS `Equipo`,
       SUM(t.color = 'amarilla') AS `Amarillas`, SUM(t.color = 'roja') AS `Rojas`
FROM tarjeta t
JOIN partido p ON p.id_partido = t.id_partido
JOIN planilla_partido pp ON pp.id_partido = t.id_partido AND pp.ci_jugador = t.ci_jugador
JOIN equipo e ON e.id_equipo = pp.id_equipo
JOIN jugador j ON j.ci = t.ci_jugador
WHERE p.id_torneo = %(torneo)s
GROUP BY j.ci, j.nombre, j.apellido, e.nombre
ORDER BY `Rojas` DESC, `Amarillas` DESC, `Jugador`
LIMIT 10;

-- 12. Goles convertidos por facultad (propia)
SELECT f.nombre AS `Facultad`, COUNT(g.id_gol) AS `Goles`
FROM facultad f
JOIN equipo e ON e.id_facultad = f.id_facultad AND e.id_torneo = %(torneo)s
LEFT JOIN planilla_partido pp ON pp.id_equipo = e.id_equipo
LEFT JOIN gol g ON g.id_partido = pp.id_partido AND g.ci_jugador = pp.ci_jugador AND NOT g.autogol
GROUP BY f.id_facultad, f.nombre
ORDER BY `Goles` DESC, f.nombre;

-- 13. Edad promedio de los planteles (propia)
SELECT e.nombre AS `Equipo`, COUNT(*) AS `Jugadores`,
       ROUND(AVG(TIMESTAMPDIFF(YEAR, j.fecha_nacimiento, CURDATE())), 1) AS `Edad promedio`,
       MIN(TIMESTAMPDIFF(YEAR, j.fecha_nacimiento, CURDATE())) AS `Menor`,
       MAX(TIMESTAMPDIFF(YEAR, j.fecha_nacimiento, CURDATE())) AS `Mayor`
FROM equipo e
JOIN equipo_jugador_torneo ejt ON ejt.id_equipo = e.id_equipo
JOIN jugador j ON j.ci = ejt.ci_jugador
WHERE e.id_torneo = %(torneo)s
GROUP BY e.id_equipo, e.nombre
ORDER BY `Edad promedio`;
