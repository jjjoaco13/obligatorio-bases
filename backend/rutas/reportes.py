from flask import Blueprint, g, jsonify

import validaciones as v
from auth import ADMIN, requiere
from db import cursor
from errores import ApiError

bp = Blueprint('reportes', __name__)

# Cada reporte es una consulta SQL; los alias de columna son los encabezados que muestra el frontend.
# Los que dependen de una edición reciben el parámetro %(torneo)s.
REPORTES = {
    'posiciones': {
        'titulo': 'Tabla de posiciones',
        'sql': '''
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
            ORDER BY `Pts` DESC, `DG` DESC, `GF` DESC, e.nombre
        ''',
    },
    'goleadores': {
        'titulo': 'Tabla de goleadores (top 10)',
        'sql': '''
            SELECT CONCAT(j.nombre, ' ', j.apellido) AS `Jugador`, e.nombre AS `Equipo`, COUNT(*) AS `Goles`
            FROM gol g
            JOIN partido p ON p.id_partido = g.id_partido
            JOIN planilla_partido pp ON pp.id_partido = g.id_partido AND pp.ci_jugador = g.ci_jugador
            JOIN equipo e ON e.id_equipo = pp.id_equipo
            JOIN jugador j ON j.ci = g.ci_jugador
            WHERE p.id_torneo = %(torneo)s AND p.estado = 'jugado' AND NOT g.autogol
            GROUP BY j.ci, j.nombre, j.apellido, e.nombre
            ORDER BY `Goles` DESC, `Jugador`
            LIMIT 10
        ''',
    },
    'fair_play': {
        'titulo': 'Fair play por equipo (amarilla = 1, roja = 3; menor es mejor)',
        'sql': '''
            SELECT e.nombre AS `Equipo`,
                   COALESCE(SUM(t.color = 'amarilla'), 0) AS `Amarillas`,
                   COALESCE(SUM(t.color = 'roja'), 0) AS `Rojas`,
                   COALESCE(SUM(CASE t.color WHEN 'amarilla' THEN 1 WHEN 'roja' THEN 3 ELSE 0 END), 0) AS `Puntaje`
            FROM equipo e
            LEFT JOIN planilla_partido pp ON pp.id_equipo = e.id_equipo
            LEFT JOIN tarjeta t ON t.id_partido = pp.id_partido AND t.ci_jugador = pp.ci_jugador
            WHERE e.id_torneo = %(torneo)s
            GROUP BY e.id_equipo, e.nombre
            ORDER BY `Puntaje`, e.nombre
        ''',
    },
    'promedio_goles': {
        'titulo': 'Promedio de goles por partido (por fecha y en toda la edición)',
        'sql': '''
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
            ORDER BY orden
        ''',
    },
    'canchas': {
        'titulo': 'Canchas más utilizadas',
        'sql': '''
            SELECT c.nombre AS `Complejo`, ca.nombre_cancha AS `Cancha`, COUNT(p.id_partido) AS `Partidos`
            FROM cancha ca
            JOIN complejo c ON c.id_complejo = ca.id_complejo
            LEFT JOIN partido p ON p.nombre_cancha = ca.nombre_cancha AND p.id_complejo = ca.id_complejo
                               AND p.id_torneo = %(torneo)s AND p.estado IN ('programado', 'jugado')
            GROUP BY c.id_complejo, c.nombre, ca.nombre_cancha
            ORDER BY `Partidos` DESC, c.nombre, ca.nombre_cancha
        ''',
    },
    'turnos': {
        'titulo': 'Turnos más utilizados',
        'sql': '''
            SELECT CONCAT(LEFT(t.hora_inicio, 5), ' a ', LEFT(t.hora_fin, 5)) AS `Turno`,
                   COUNT(p.id_partido) AS `Partidos`
            FROM turno t
            LEFT JOIN partido p ON p.id_turno = t.id_turno
                               AND p.id_torneo = %(torneo)s AND p.estado IN ('programado', 'jugado')
            GROUP BY t.id_turno, t.hora_inicio, t.hora_fin
            ORDER BY `Partidos` DESC, t.hora_inicio
        ''',
    },
    'jugadores_facultad': {
        'titulo': 'Jugadores por facultad y tipo',
        'sql': '''
            SELECT f.nombre AS `Facultad`,
                   COALESCE(SUM(j.tipo = 'grado'), 0) AS `Grado`,
                   COALESCE(SUM(j.tipo = 'posgrado'), 0) AS `Posgrado`,
                   COALESCE(SUM(j.tipo = 'docente'), 0) AS `Docente`,
                   COALESCE(SUM(j.tipo = 'funcionario'), 0) AS `Funcionario`,
                   COUNT(j.ci) AS `Total`
            FROM facultad f
            LEFT JOIN jugador j ON j.id_facultad = f.id_facultad
            GROUP BY f.id_facultad, f.nombre
            ORDER BY `Total` DESC, f.nombre
        ''',
    },
    'sin_planilla': {
        'titulo': 'Jugadores inscriptos que nunca figuraron en una planilla',
        'sql': '''
            SELECT CONCAT(j.nombre, ' ', j.apellido) AS `Jugador`, j.ci AS `CI`,
                   e.nombre AS `Equipo`, ejt.numero_camiseta AS `Camiseta`
            FROM equipo_jugador_torneo ejt
            JOIN jugador j ON j.ci = ejt.ci_jugador
            JOIN equipo e ON e.id_equipo = ejt.id_equipo
            WHERE ejt.id_torneo = %(torneo)s
              AND NOT EXISTS (SELECT 1 FROM planilla_partido pp
                              WHERE pp.ci_jugador = ejt.ci_jugador AND pp.id_equipo = ejt.id_equipo)
            ORDER BY e.nombre, j.apellido
        ''',
    },
    'sanciones_equipo': {
        'titulo': 'Sanciones por equipo y motivo',
        'sql': '''
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
            ORDER BY `Total` DESC, e.nombre
        ''',
    },
    'estados_partidos': {
        'titulo': 'Partidos jugados vs. postergados / cancelados',
        'sql': '''
            SELECT estado AS `Estado`, COUNT(*) AS `Partidos`,
                   ROUND(100 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS `Porcentaje`
            FROM partido
            WHERE id_torneo = %(torneo)s
            GROUP BY estado
            ORDER BY `Partidos` DESC
        ''',
    },
    # ---- Consultas adicionales propuestas por el equipo ----
    'amonestados': {
        'titulo': 'Extra: jugadores más amonestados',
        'sql': '''
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
            LIMIT 10
        ''',
    },
    'goles_facultad': {
        'titulo': 'Extra: goles convertidos por facultad',
        'sql': '''
            SELECT f.nombre AS `Facultad`, COUNT(g.id_gol) AS `Goles`
            FROM facultad f
            JOIN equipo e ON e.id_facultad = f.id_facultad AND e.id_torneo = %(torneo)s
            LEFT JOIN planilla_partido pp ON pp.id_equipo = e.id_equipo
            LEFT JOIN gol g ON g.id_partido = pp.id_partido AND g.ci_jugador = pp.ci_jugador AND NOT g.autogol
            GROUP BY f.id_facultad, f.nombre
            ORDER BY `Goles` DESC, f.nombre
        ''',
    },
    'edad_equipos': {
        'titulo': 'Extra: edad promedio de los planteles',
        'sql': '''
            SELECT e.nombre AS `Equipo`, COUNT(*) AS `Jugadores`,
                   ROUND(AVG(TIMESTAMPDIFF(YEAR, j.fecha_nacimiento, CURDATE())), 1) AS `Edad promedio`,
                   MIN(TIMESTAMPDIFF(YEAR, j.fecha_nacimiento, CURDATE())) AS `Menor`,
                   MAX(TIMESTAMPDIFF(YEAR, j.fecha_nacimiento, CURDATE())) AS `Mayor`
            FROM equipo e
            JOIN equipo_jugador_torneo ejt ON ejt.id_equipo = e.id_equipo
            JOIN jugador j ON j.ci = ejt.ci_jugador
            WHERE e.id_torneo = %(torneo)s
            GROUP BY e.id_equipo, e.nombre
            ORDER BY `Edad promedio`
        ''',
    },
}


@bp.get('/reportes')
@requiere(ADMIN)
def listar_reportes():
    return jsonify([{'clave': clave, 'titulo': r['titulo']} for clave, r in REPORTES.items()])


@bp.get('/reportes/<clave>')
@requiere(ADMIN)
def ver_reporte(clave):
    reporte = REPORTES.get(clave)
    if not reporte:
        raise ApiError('El reporte no existe.', 404)
    params = {'torneo': v.entero_query('torneo', obligatorio=True)}
    with cursor(g.rol) as cur:
        cur.execute(reporte['sql'], params)
        filas = cur.fetchall()
        columnas = list(cur.column_names)
    return jsonify(titulo=reporte['titulo'], columnas=columnas,
                   filas=[[fila[c] for c in columnas] for fila in filas])
