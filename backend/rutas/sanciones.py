from flask import Blueprint, g, jsonify

import validaciones as v
from auth import ADMIN, requiere
from db import cursor, todos, uno
from errores import ApiError

bp = Blueprint('sanciones', __name__)


@bp.get('/sanciones')
@requiere(ADMIN)
def listar_sanciones():
    id_torneo = v.entero_query('torneo')
    sql = '''
        SELECT s.id_sancion, s.ci_jugador, j.nombre, j.apellido, e.nombre AS equipo, s.id_torneo,
               s.motivo, s.numero_fecha_inicio, s.cantidad_fechas,
               s.numero_fecha_inicio + s.cantidad_fechas - 1 AS numero_fecha_fin,
               s.id_tarjeta, s.descripcion
        FROM sancion_jugador s
        JOIN jugador j ON j.ci = s.ci_jugador
        JOIN equipo_jugador_torneo ejt ON ejt.ci_jugador = s.ci_jugador AND ejt.id_torneo = s.id_torneo
        JOIN equipo e ON e.id_equipo = ejt.id_equipo
    '''
    params = []
    if id_torneo:
        sql += ' WHERE s.id_torneo = %s'
        params.append(id_torneo)
    sql += ' ORDER BY s.numero_fecha_inicio DESC, j.apellido'
    with cursor(g.rol) as cur:
        return jsonify(todos(cur, sql, params))


@bp.post('/sanciones')
@requiere(ADMIN)
def crear_sancion():
    """Alta de sanciones disciplinarias (las de tarjetas se generan solas al cargar la planilla)."""
    datos = v.cuerpo()
    sancion = {
        'ci_jugador': v.ci(datos.get('ci_jugador')),
        'id_torneo': v.entero(datos, 'id_torneo', 1),
        'numero_fecha_inicio': v.entero(datos, 'numero_fecha_inicio', 1),
        'cantidad_fechas': v.entero(datos, 'cantidad_fechas', 1, 50),
        'descripcion': v.texto(datos, 'descripcion', 255, obligatorio=False),
    }
    with cursor(g.rol) as cur:
        if not uno(cur, 'SELECT 1 FROM equipo_jugador_torneo WHERE ci_jugador = %(ci_jugador)s AND id_torneo = %(id_torneo)s',
                   sancion):
            raise ApiError('El jugador no integra ningún plantel en ese torneo.')
        cur.execute('''
            INSERT INTO sancion_jugador (ci_jugador, id_torneo, motivo, numero_fecha_inicio, cantidad_fechas, descripcion)
            VALUES (%(ci_jugador)s, %(id_torneo)s, 'disciplinaria', %(numero_fecha_inicio)s, %(cantidad_fechas)s, %(descripcion)s)
        ''', sancion)
        return jsonify(id_sancion=cur.lastrowid), 201


@bp.put('/sanciones/<int:id_sancion>')
@requiere(ADMIN)
def modificar_sancion(id_sancion):
    datos = v.cuerpo()
    numero_fecha_inicio = v.entero(datos, 'numero_fecha_inicio', 1)
    descripcion = v.texto(datos, 'descripcion', 255, obligatorio=False)
    with cursor(g.rol) as cur:
        actual = uno(cur, 'SELECT motivo FROM sancion_jugador WHERE id_sancion = %s', (id_sancion,))
        if not actual:
            raise ApiError('La sanción no existe.', 404)
        # Las sanciones automáticas siempre son de una fecha
        cantidad = v.entero(datos, 'cantidad_fechas', 1, 50) if actual['motivo'] == 'disciplinaria' else 1
        cur.execute('''
            UPDATE sancion_jugador SET numero_fecha_inicio = %s, cantidad_fechas = %s, descripcion = %s
            WHERE id_sancion = %s
        ''', (numero_fecha_inicio, cantidad, descripcion, id_sancion))
    return jsonify(ok=True)


@bp.delete('/sanciones/<int:id_sancion>')
@requiere(ADMIN)
def eliminar_sancion(id_sancion):
    with cursor(g.rol) as cur:
        cur.execute('DELETE FROM sancion_jugador WHERE id_sancion = %s', (id_sancion,))
        if cur.rowcount == 0:
            raise ApiError('La sanción no existe.', 404)
    return jsonify(ok=True)
