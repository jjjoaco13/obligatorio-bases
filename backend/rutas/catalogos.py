from flask import Blueprint, g, jsonify

import validaciones as v
from auth import ADMIN, PLANILLERO, requiere
from db import cursor, todos, uno
from errores import ApiError

bp = Blueprint('catalogos', __name__)

ESTADOS_TORNEO = ('inscripcion', 'en_curso', 'finalizado')


@bp.get('/facultades')
@requiere(ADMIN, PLANILLERO)
def listar_facultades():
    with cursor(g.rol) as cur:
        return jsonify(todos(cur, 'SELECT id_facultad, nombre FROM facultad ORDER BY nombre'))


@bp.get('/turnos')
@requiere(ADMIN, PLANILLERO)
def listar_turnos():
    with cursor(g.rol) as cur:
        return jsonify(todos(cur, 'SELECT id_turno, hora_inicio, hora_fin FROM turno ORDER BY hora_inicio'))


# ---------- Torneos ----------

@bp.get('/torneos')
@requiere(ADMIN, PLANILLERO)
def listar_torneos():
    with cursor(g.rol) as cur:
        return jsonify(todos(cur, '''
            SELECT id_torneo, nombre, anio, semestre, fecha_inicio, fecha_fin, estado
            FROM torneo
            ORDER BY anio DESC, semestre DESC
        '''))


def _datos_torneo(datos):
    torneo = {
        'nombre': v.texto(datos, 'nombre', 100),
        'anio': v.entero(datos, 'anio', 2000, 2100),
        'semestre': v.entero(datos, 'semestre', 1, 2),
        'fecha_inicio': v.fecha(datos, 'fecha_inicio'),
        'fecha_fin': v.fecha(datos, 'fecha_fin'),
        'estado': v.opcion(datos, 'estado', ESTADOS_TORNEO),
    }
    if torneo['fecha_fin'] < torneo['fecha_inicio']:
        raise ApiError('La fecha de fin debe ser posterior a la de inicio.')
    if torneo['fecha_inicio'].year != torneo['anio']:
        raise ApiError('La fecha de inicio debe pertenecer al año del torneo.')
    return torneo


@bp.post('/torneos')
@requiere(ADMIN)
def crear_torneo():
    t = _datos_torneo(v.cuerpo())
    with cursor(g.rol) as cur:
        cur.execute('''
            INSERT INTO torneo (nombre, anio, semestre, fecha_inicio, fecha_fin, estado)
            VALUES (%(nombre)s, %(anio)s, %(semestre)s, %(fecha_inicio)s, %(fecha_fin)s, %(estado)s)
        ''', t)
        return jsonify(id_torneo=cur.lastrowid), 201


@bp.put('/torneos/<int:id_torneo>')
@requiere(ADMIN)
def modificar_torneo(id_torneo):
    t = _datos_torneo(v.cuerpo())
    t['id_torneo'] = id_torneo
    with cursor(g.rol) as cur:
        if not uno(cur, 'SELECT 1 FROM torneo WHERE id_torneo = %s', (id_torneo,)):
            raise ApiError('El torneo no existe.', 404)
        cur.execute('''
            UPDATE torneo SET nombre = %(nombre)s, anio = %(anio)s, semestre = %(semestre)s,
                fecha_inicio = %(fecha_inicio)s, fecha_fin = %(fecha_fin)s, estado = %(estado)s
            WHERE id_torneo = %(id_torneo)s
        ''', t)
    return jsonify(ok=True)


@bp.delete('/torneos/<int:id_torneo>')
@requiere(ADMIN)
def eliminar_torneo(id_torneo):
    with cursor(g.rol) as cur:
        cur.execute('DELETE FROM torneo WHERE id_torneo = %s', (id_torneo,))
        if cur.rowcount == 0:
            raise ApiError('El torneo no existe.', 404)
    return jsonify(ok=True)


@bp.get('/torneos/<int:id_torneo>/inscriptos')
@requiere(ADMIN, PLANILLERO)
def inscriptos_torneo(id_torneo):
    with cursor(g.rol) as cur:
        return jsonify(todos(cur, '''
            SELECT j.ci, j.nombre, j.apellido, e.id_equipo, e.nombre AS equipo
            FROM equipo_jugador_torneo ejt
            JOIN jugador j ON j.ci = ejt.ci_jugador
            JOIN equipo e ON e.id_equipo = ejt.id_equipo
            WHERE ejt.id_torneo = %s
            ORDER BY j.apellido, j.nombre
        ''', (id_torneo,)))
