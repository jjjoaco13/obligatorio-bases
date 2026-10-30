from flask import Blueprint, g, jsonify

import validaciones as v
from auth import ADMIN, PLANILLERO, requiere
from db import cursor, todos, uno
from errores import ApiError

bp = Blueprint('complejos', __name__)

DEPARTAMENTOS = (
    'Artigas', 'Canelones', 'Cerro Largo', 'Colonia', 'Durazno',
    'Flores', 'Florida', 'Lavalleja', 'Maldonado', 'Montevideo',
    'Paysandú', 'Río Negro', 'Rivera', 'Rocha', 'Salto',
    'San José', 'Soriano', 'Tacuarembó', 'Treinta y Tres',
)
SUPERFICIES = ('sintetico', 'parquet')


@bp.get('/departamentos')
@requiere(ADMIN)
def listar_departamentos():
    return jsonify(DEPARTAMENTOS)


@bp.get('/complejos')
@requiere(ADMIN, PLANILLERO)
def listar_complejos():
    with cursor(g.rol) as cur:
        return jsonify(todos(cur, '''
            SELECT c.id_complejo, c.nombre, c.direccion, c.departamento,
                   (SELECT COUNT(*) FROM cancha ca WHERE ca.id_complejo = c.id_complejo) AS cantidad_canchas
            FROM complejo c
            ORDER BY c.nombre
        '''))


def _datos_complejo(datos):
    return {
        'nombre': v.texto(datos, 'nombre', 100),
        'direccion': v.texto(datos, 'direccion', 150),
        'departamento': v.opcion(datos, 'departamento', DEPARTAMENTOS),
    }


@bp.post('/complejos')
@requiere(ADMIN)
def crear_complejo():
    c = _datos_complejo(v.cuerpo())
    with cursor(g.rol) as cur:
        cur.execute('''
            INSERT INTO complejo (nombre, direccion, departamento)
            VALUES (%(nombre)s, %(direccion)s, %(departamento)s)
        ''', c)
        return jsonify(id_complejo=cur.lastrowid), 201


@bp.put('/complejos/<int:id_complejo>')
@requiere(ADMIN)
def modificar_complejo(id_complejo):
    c = _datos_complejo(v.cuerpo())
    c['id_complejo'] = id_complejo
    with cursor(g.rol) as cur:
        if not uno(cur, 'SELECT 1 FROM complejo WHERE id_complejo = %s', (id_complejo,)):
            raise ApiError('El complejo no existe.', 404)
        cur.execute('''
            UPDATE complejo SET nombre = %(nombre)s, direccion = %(direccion)s, departamento = %(departamento)s
            WHERE id_complejo = %(id_complejo)s
        ''', c)
    return jsonify(ok=True)


@bp.delete('/complejos/<int:id_complejo>')
@requiere(ADMIN)
def eliminar_complejo(id_complejo):
    with cursor(g.rol) as cur:
        if uno(cur, 'SELECT 1 FROM cancha WHERE id_complejo = %s', (id_complejo,)):
            raise ApiError('No se puede eliminar: el complejo tiene canchas. Elimínelas primero.')
        cur.execute('DELETE FROM complejo WHERE id_complejo = %s', (id_complejo,))
        if cur.rowcount == 0:
            raise ApiError('El complejo no existe.', 404)
    return jsonify(ok=True)


# ---------- Canchas ----------

@bp.get('/canchas')
@requiere(ADMIN, PLANILLERO)
def listar_canchas():
    id_complejo = v.entero_query('complejo')
    sql = '''
        SELECT ca.nombre_cancha, ca.id_complejo, c.nombre AS complejo, ca.superficie, ca.techada
        FROM cancha ca JOIN complejo c ON c.id_complejo = ca.id_complejo
    '''
    params = []
    if id_complejo:
        sql += ' WHERE ca.id_complejo = %s'
        params.append(id_complejo)
    sql += ' ORDER BY c.nombre, ca.nombre_cancha'
    with cursor(g.rol) as cur:
        return jsonify(todos(cur, sql, params))


@bp.post('/complejos/<int:id_complejo>/canchas')
@requiere(ADMIN)
def crear_cancha(id_complejo):
    datos = v.cuerpo()
    nombre = v.texto(datos, 'nombre_cancha', 50)
    superficie = v.opcion(datos, 'superficie', SUPERFICIES)
    techada = v.booleano(datos, 'techada')
    with cursor(g.rol) as cur:
        if not uno(cur, 'SELECT 1 FROM complejo WHERE id_complejo = %s', (id_complejo,)):
            raise ApiError('El complejo no existe.', 404)
        if uno(cur, 'SELECT 1 FROM cancha WHERE id_complejo = %s AND nombre_cancha = %s', (id_complejo, nombre)):
            raise ApiError('Ya existe una cancha con ese nombre en el complejo.')
        cur.execute('''
            INSERT INTO cancha (nombre_cancha, id_complejo, superficie, techada) VALUES (%s, %s, %s, %s)
        ''', (nombre, id_complejo, superficie, techada))
    return jsonify(ok=True), 201


@bp.put('/complejos/<int:id_complejo>/canchas/<nombre_cancha>')
@requiere(ADMIN)
def modificar_cancha(id_complejo, nombre_cancha):
    datos = v.cuerpo()
    superficie = v.opcion(datos, 'superficie', SUPERFICIES)
    techada = v.booleano(datos, 'techada')
    with cursor(g.rol) as cur:
        if not uno(cur, 'SELECT 1 FROM cancha WHERE id_complejo = %s AND nombre_cancha = %s', (id_complejo, nombre_cancha)):
            raise ApiError('La cancha no existe.', 404)
        cur.execute('''
            UPDATE cancha SET superficie = %s, techada = %s WHERE id_complejo = %s AND nombre_cancha = %s
        ''', (superficie, techada, id_complejo, nombre_cancha))
    return jsonify(ok=True)


@bp.delete('/complejos/<int:id_complejo>/canchas/<nombre_cancha>')
@requiere(ADMIN)
def eliminar_cancha(id_complejo, nombre_cancha):
    with cursor(g.rol) as cur:
        if uno(cur, 'SELECT 1 FROM partido WHERE id_complejo = %s AND nombre_cancha = %s', (id_complejo, nombre_cancha)):
            raise ApiError('No se puede eliminar: la cancha tiene partidos asignados.')
        cur.execute('DELETE FROM cancha WHERE id_complejo = %s AND nombre_cancha = %s', (id_complejo, nombre_cancha))
        if cur.rowcount == 0:
            raise ApiError('La cancha no existe.', 404)
    return jsonify(ok=True)
