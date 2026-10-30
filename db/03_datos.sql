USE torneo_futbol5;

-- ---------- Usuarios de la aplicación ----------
-- Contraseñas guardadas como hash SHA-256 (el backend compara contra el mismo hash)
--   admin@ucu.edu.uy      / admin123
--   planillero@ucu.edu.uy / planillero123
INSERT INTO login (correo, contrasena, rol) VALUES
    ('admin@ucu.edu.uy', SHA2('admin123', 256), 'administrador'),
    ('planillero@ucu.edu.uy', SHA2('planillero123', 256), 'planillero');

-- ---------- Datos maestros ----------
INSERT INTO facultad (id_facultad, nombre) VALUES
    (1, 'Ingeniería y Tecnologías'),
    (2, 'Derecho'),
    (3, 'Ciencias Empresariales'),
    (4, 'Psicología'),
    (5, 'Ciencias de la Salud'),
    (6, 'Ciencias Humanas');

INSERT INTO turno (id_turno, hora_inicio, hora_fin) VALUES
    (1, '18:00:00', '19:00:00'),
    (2, '19:00:00', '20:00:00'),
    (3, '20:00:00', '21:00:00'),
    (4, '21:00:00', '22:00:00'),
    (5, '22:00:00', '23:00:00');

INSERT INTO complejo (id_complejo, nombre, direccion, departamento) VALUES
    (1, 'Complejo Malvín', 'Av. Italia 4500', 'Montevideo'),
    (2, 'Fútbol 5 Carrasco', 'Av. Arocena 1600', 'Montevideo');

INSERT INTO cancha (nombre_cancha, id_complejo, superficie, techada) VALUES
    ('Cancha 1', 1, 'sintetico', FALSE),
    ('Cancha 2', 1, 'sintetico', TRUE),
    ('Central', 2, 'parquet', TRUE);

INSERT INTO torneo (id_torneo, nombre, anio, semestre, fecha_inicio, fecha_fin, estado) VALUES
    (1, 'Torneo Interfacultades 2026 - 2do semestre', 2026, 2, '2026-08-31', '2026-11-30', 'en_curso'),
    (2, 'Torneo Interfacultades 2027 - 1er semestre', 2027, 1, '2027-03-15', '2027-07-15', 'inscripcion');

-- ---------- Jugadores (CI 4E0000N: equipo E, jugador N) ----------
INSERT INTO jugador (ci, nombre, apellido, email, fecha_nacimiento, id_facultad, tipo) VALUES
    ('4100001', 'Martín', 'Pereira', 'martin.pereira@correo.ucu.edu.uy', '2002-03-14', 1, 'grado'),
    ('4100002', 'Lucas', 'Fernández', 'lucas.fernandez@correo.ucu.edu.uy', '2001-07-22', 1, 'grado'),
    ('4100003', 'Diego', 'Suárez', 'diego.suarez@correo.ucu.edu.uy', '2003-01-05', 1, 'grado'),
    ('4100004', 'Pablo', 'Rodríguez', 'pablo.rodriguez@ucu.edu.uy', '1985-11-30', 1, 'docente'),
    ('4100005', 'Nicolás', 'Gómez', 'nicolas.gomez@correo.ucu.edu.uy', '1998-05-17', 1, 'posgrado'),
    ('4100006', 'Federico', 'Silva', 'federico.silva@correo.ucu.edu.uy', '2004-09-09', 1, 'grado'),
    ('4100007', 'Agustín', 'Méndez', 'agustin.mendez@correo.ucu.edu.uy', '2005-02-11', 1, 'grado'),

    ('4200001', 'Santiago', 'López', 'santiago.lopez@correo.ucu.edu.uy', '2000-04-02', 2, 'grado'),
    ('4200002', 'Joaquín', 'Martínez', 'joaquin.martinez@correo.ucu.edu.uy', '2001-12-19', 2, 'grado'),
    ('4200003', 'Matías', 'González', 'matias.gonzalez@correo.ucu.edu.uy', '2002-08-08', 2, 'grado'),
    ('4200004', 'Bruno', 'Castro', 'bruno.castro@correo.ucu.edu.uy', '1997-06-25', 2, 'posgrado'),
    ('4200005', 'Gonzalo', 'Ramírez', 'gonzalo.ramirez@ucu.edu.uy', '1980-10-10', 2, 'funcionario'),

    ('4300001', 'Facundo', 'Díaz', 'facundo.diaz@correo.ucu.edu.uy', '2003-03-03', 3, 'grado'),
    ('4300002', 'Rodrigo', 'Acosta', 'rodrigo.acosta@correo.ucu.edu.uy', '2002-11-21', 3, 'grado'),
    ('4300003', 'Emiliano', 'Sosa', 'emiliano.sosa@correo.ucu.edu.uy', '2001-01-29', 3, 'grado'),
    ('4300004', 'Ignacio', 'Romero', 'ignacio.romero@correo.ucu.edu.uy', '1999-07-07', 3, 'posgrado'),
    ('4300005', 'Andrés', 'Benítez', 'andres.benitez@ucu.edu.uy', '1978-02-14', 3, 'docente'),
    ('4300006', 'Tomás', 'Núñez', 'tomas.nunez@correo.ucu.edu.uy', '2004-12-01', 3, 'grado'),

    ('4400001', 'Sebastián', 'Cabrera', 'sebastian.cabrera@correo.ucu.edu.uy', '2002-05-05', 4, 'grado'),
    ('4400002', 'Maximiliano', 'Olivera', 'maximiliano.olivera@correo.ucu.edu.uy', '2003-09-15', 4, 'grado'),
    ('4400003', 'Franco', 'Vázquez', 'franco.vazquez@correo.ucu.edu.uy', '2001-04-27', 4, 'grado'),
    ('4400004', 'Alejandro', 'Morales', 'alejandro.morales@correo.ucu.edu.uy', '1996-10-03', 4, 'posgrado'),
    ('4400005', 'Germán', 'Ríos', 'german.rios@ucu.edu.uy', '1983-08-18', 4, 'funcionario'),

    ('4500001', 'Valentín', 'Torres', 'valentin.torres@correo.ucu.edu.uy', '2002-02-20', 5, 'grado'),
    ('4500002', 'Kevin', 'Álvarez', 'kevin.alvarez@correo.ucu.edu.uy', '2003-06-12', 5, 'grado'),
    ('4500003', 'Mauro', 'Giménez', 'mauro.gimenez@correo.ucu.edu.uy', '2000-12-24', 5, 'grado'),
    ('4500004', 'Leandro', 'Ruiz', 'leandro.ruiz@correo.ucu.edu.uy', '1995-03-31', 5, 'posgrado'),
    ('4500005', 'Cristian', 'Medina', 'cristian.medina@ucu.edu.uy', '1987-01-16', 5, 'docente'),

    ('4600001', 'Juan', 'Herrera', 'juan.herrera@correo.ucu.edu.uy', '2001-10-30', 6, 'grado'),
    ('4600002', 'Felipe', 'Aguirre', 'felipe.aguirre@correo.ucu.edu.uy', '2002-07-04', 6, 'grado'),
    ('4600003', 'Marcos', 'Ferreira', 'marcos.ferreira@correo.ucu.edu.uy', '2003-05-23', 6, 'grado'),
    ('4600004', 'Ezequiel', 'Rojas', 'ezequiel.rojas@correo.ucu.edu.uy', '1998-09-12', 6, 'posgrado'),
    ('4600005', 'Hernán', 'Molina', 'hernan.molina@ucu.edu.uy', '1982-04-08', 6, 'funcionario');

-- ---------- Equipos y planteles del torneo 1 ----------
INSERT INTO equipo (id_equipo, nombre, id_torneo, id_facultad) VALUES
    (1, 'Ingenieros FC', 1, 1),
    (2, 'Leguleyos', 1, 2),
    (3, 'Balance FC', 1, 3),
    (4, 'Mente Sana', 1, 4),
    (5, 'Bisturí FC', 1, 5),
    (6, 'Letras Unidas', 1, 6);

INSERT INTO equipo_jugador_torneo (id_equipo, ci_jugador, id_torneo, numero_camiseta)
SELECT CAST(SUBSTRING(ci, 2, 1) AS UNSIGNED), ci, 1, CAST(RIGHT(ci, 1) AS UNSIGNED) * 2 - 1
FROM jugador
WHERE ci <> '4100007';

UPDATE equipo SET ci_capitan = CONCAT('4', id_equipo, '00001') WHERE id_equipo BETWEEN 1 AND 6;

-- Un equipo del torneo 2 (en inscripción) para probar el ABM de planteles
INSERT INTO equipo (id_equipo, nombre, id_torneo, id_facultad) VALUES (7, 'Ingenieros FC', 2, 1);

-- ---------- Partidos del torneo 1 ----------
-- Fechas 1 a 3 jugadas, fecha 4 por jugarse (con un partido postergado)
INSERT INTO partido (id_partido, id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo, estado) VALUES
    (1, 1, 1, 1, 2, '2026-09-07', 1, 'Cancha 1', 1, 'jugado'),
    (2, 1, 1, 3, 4, '2026-09-07', 2, 'Cancha 1', 1, 'jugado'),
    (3, 1, 1, 5, 6, '2026-09-07', 1, 'Central', 2, 'jugado'),
    (4, 1, 2, 1, 3, '2026-09-14', 1, 'Cancha 1', 1, 'jugado'),
    (5, 1, 2, 2, 5, '2026-09-14', 2, 'Cancha 2', 1, 'jugado'),
    (6, 1, 2, 4, 6, '2026-09-14', 3, 'Central', 2, 'jugado'),
    (7, 1, 3, 1, 4, '2026-09-21', 1, 'Cancha 1', 1, 'jugado'),
    (8, 1, 3, 2, 6, '2026-09-21', 2, 'Cancha 1', 1, 'jugado'),
    (9, 1, 3, 3, 5, '2026-09-21', 4, 'Central', 2, 'jugado'),
    (10, 1, 4, 1, 5, '2026-11-09', 1, 'Cancha 1', 1, 'programado'),
    (11, 1, 4, 2, 4, '2026-11-09', 2, 'Cancha 1', 1, 'programado'),
    (12, 1, 4, 3, 6, '2026-10-05', 3, 'Cancha 2', 1, 'postergado');

-- Planillas de las fechas 1 y 2: todo el plantel salvo los camiseta 11 (suplentes que no jugaron)
INSERT INTO planilla_partido (id_partido, ci_jugador, id_equipo)
SELECT p.id_partido, ejt.ci_jugador, ejt.id_equipo
FROM partido p
JOIN equipo_jugador_torneo ejt ON ejt.id_equipo IN (p.id_equipo_local, p.id_equipo_visitante)
WHERE p.numero_fecha IN (1, 2) AND p.estado = 'jugado' AND ejt.numero_camiseta <> 11;

-- ---------- Tarjetas y sanciones de las fechas 1 y 2 ----------
INSERT INTO tarjeta (id_tarjeta, id_partido, ci_jugador, minuto, color) VALUES
    (1, 1, '4100002', 20, 'amarilla'),
    (2, 2, '4300002', 33, 'amarilla'),
    (3, 3, '4600002', 41, 'amarilla'),
    (4, 4, '4300002', 15, 'amarilla'),
    (5, 5, '4200002', 47, 'roja');

INSERT INTO sancion_jugador (id_sancion, ci_jugador, id_torneo, motivo, numero_fecha_inicio, cantidad_fechas, id_tarjeta, descripcion) VALUES
    (1, '4200002', 1, 'roja', 3, 1, 5, NULL);

-- Planillas de la fecha 3, sin los suspendidos para esa fecha
INSERT INTO planilla_partido (id_partido, ci_jugador, id_equipo)
SELECT p.id_partido, ejt.ci_jugador, ejt.id_equipo
FROM partido p
JOIN equipo_jugador_torneo ejt ON ejt.id_equipo IN (p.id_equipo_local, p.id_equipo_visitante)
WHERE p.numero_fecha = 3 AND p.estado = 'jugado' AND ejt.numero_camiseta <> 11
  AND NOT EXISTS (SELECT 1 FROM sancion_jugador s
                  WHERE s.ci_jugador = ejt.ci_jugador AND s.id_torneo = p.id_torneo
                    AND p.numero_fecha BETWEEN s.numero_fecha_inicio AND s.numero_fecha_inicio + s.cantidad_fechas - 1);

INSERT INTO tarjeta (id_tarjeta, id_partido, ci_jugador, minuto, color) VALUES
    (6, 9, '4300002', 12, 'amarilla'),
    (7, 8, '4600002', 38, 'amarilla'),
    (8, 7, '4400003', 55, 'roja');

INSERT INTO sancion_jugador (id_sancion, ci_jugador, id_torneo, motivo, numero_fecha_inicio, cantidad_fechas, id_tarjeta, descripcion) VALUES
    (2, '4300002', 1, 'acumulacion_amarillas', 4, 1, 6, NULL),
    (3, '4400003', 1, 'roja', 4, 1, 8, NULL),
    (4, '4400003', 1, 'disciplinaria', 5, 2, NULL, 'Agresión verbal al árbitro tras la expulsión');

-- ---------- Goles ----------
INSERT INTO gol (id_partido, ci_jugador, minuto, autogol) VALUES
    -- Fecha 1: Ingenieros 2-1 Leguleyos | Balance 1-1 Mente Sana | Bisturí 3-0 Letras Unidas
    (1, '4100001', 10, FALSE), (1, '4100002', 30, FALSE), (1, '4200001', 40, FALSE),
    (2, '4300001', 15, FALSE), (2, '4400002', 45, FALSE),
    (3, '4500001', 5, FALSE), (3, '4500001', 22, FALSE), (3, '4600003', 50, TRUE),
    -- Fecha 2: Ingenieros 0-2 Balance | Leguleyos 2-2 Bisturí | Mente Sana 1-0 Letras Unidas
    (4, '4300001', 12, FALSE), (4, '4300002', 33, FALSE),
    (5, '4200001', 8, FALSE), (5, '4200003', 20, FALSE), (5, '4500001', 35, FALSE), (5, '4500002', 55, FALSE),
    (6, '4400001', 25, FALSE),
    -- Fecha 3: Ingenieros 3-1 Mente Sana | Leguleyos 0-1 Letras Unidas | Balance 1-2 Bisturí
    (7, '4100001', 3, FALSE), (7, '4100001', 18, FALSE), (7, '4100003', 40, FALSE), (7, '4400002', 50, FALSE),
    (8, '4600001', 44, FALSE),
    (9, '4300003', 10, FALSE), (9, '4500001', 30, FALSE), (9, '4500003', 58, FALSE);
