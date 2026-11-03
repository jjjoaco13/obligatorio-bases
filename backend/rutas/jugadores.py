from datetime import date

from flask import Blueprint, g, jsonify

import validaciones as v
from auth import ADMIN, requiere
from db import cursor, todos, uno
from errores import ApiError

bp = Blueprint('jugadores', __name__)

TIPOS = ('grado', 'posgrado', 'docente', 'funcionario')


@bp.get('/jugadores')
@requiere(ADMIN)
def listar_jugadores():
    id_facultad = v.entero_query('facultad')
    sql = '''
        SELECT j.ci, j.nombre, j.apellido, j.email, j.fecha_nacimiento, j.tipo,
               j.id_facultad, f.nombre AS facultad
        FROM jugador j
        JOIN facultad f ON f.id_facultad = j.id_facultad
    '''
    params = []
    if id_facultad:
        sql += ' WHERE j.id_facultad = %s'
        params.append(id_facultad)
    sql += ' ORDER BY j.apellido, j.nombre'
    with cursor(g.rol) as cur:
        return jsonify(todos(cur, sql, params))


def _datos_jugador(datos):
    jugador = {
        'nombre': v.texto(datos, 'nombre', 50),
        'apellido': v.texto(datos, 'apellido', 50),
        'email': v.email(v.texto(datos, 'email', 100)),
        'fecha_nacimiento': v.fecha(datos, 'fecha_nacimiento'),
        'id_facultad': v.entero(datos, 'id_facultad', 1),
        'tipo': v.opcion(datos, 'tipo', TIPOS),
    }
    if jugador['fecha_nacimiento'] >= date.today():
        raise ApiError('La fecha de nacimiento debe ser anterior a hoy.')
    return jugador


@bp.post('/jugadores')
@requiere(ADMIN)
def crear_jugador():
    datos = v.cuerpo()
    jugador = _datos_jugador(datos)
    jugador['ci'] = v.ci(datos.get('ci'))
    with cursor(g.rol) as cur:
        if uno(cur, 'SELECT 1 FROM jugador WHERE ci = %s', (jugador['ci'],)):
            raise ApiError('Ya existe un jugador con esa cédula.')
        cur.execute('''
            INSERT INTO jugador (ci, nombre, apellido, email, fecha_nacimiento, id_facultad, tipo)
            VALUES (%(ci)s, %(nombre)s, %(apellido)s, %(email)s, %(fecha_nacimiento)s, %(id_facultad)s, %(tipo)s)
        ''', jugador)
    return jsonify(ci=jugador['ci']), 201


@bp.put('/jugadores/<ci>')
@requiere(ADMIN)
def modificar_jugador(ci):
    jugador = _datos_jugador(v.cuerpo())
    jugador['ci'] = ci
    with cursor(g.rol) as cur:
        actual = uno(cur, 'SELECT id_facultad FROM jugador WHERE ci = %s', (ci,))
        if not actual:
            raise ApiError('El jugador no existe.', 404)

        # Si integra planteles, no puede quedar en una facultad distinta a la del equipo
        if actual['id_facultad'] != jugador['id_facultad'] and uno(cur, '''
            SELECT 1 FROM equipo_jugador_torneo ejt
            JOIN equipo e ON e.id_equipo = ejt.id_equipo
            WHERE ejt.ci_jugador = %s AND e.id_facultad <> %s
        ''', (ci, jugador['id_facultad'])):
            raise ApiError('El jugador integra un plantel de otra facultad; quítelo del plantel antes de cambiarle la facultad.')

        cur.execute('''
            UPDATE jugador SET nombre = %(nombre)s, apellido = %(apellido)s, email = %(email)s,
                fecha_nacimiento = %(fecha_nacimiento)s, id_facultad = %(id_facultad)s, tipo = %(tipo)s
            WHERE ci = %(ci)s
        ''', jugador)
    return jsonify(ok=True)


@bp.delete('/jugadores/<ci>')
@requiere(ADMIN)
def eliminar_jugador(ci):
    with cursor(g.rol) as cur:
        if uno(cur, 'SELECT 1 FROM equipo_jugador_torneo WHERE ci_jugador = %s', (ci,)):
            raise ApiError('No se puede eliminar: el jugador integra al menos un plantel.')
        cur.execute('DELETE FROM jugador WHERE ci = %s', (ci,))
        if cur.rowcount == 0:
            raise ApiError('El jugador no existe.', 404)
    return jsonify(ok=True)
