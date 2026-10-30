from datetime import datetime, timedelta

from flask import Blueprint, g, jsonify

import validaciones as v
from auth import ADMIN, PLANILLERO, requiere
from db import cursor, todos, uno
from errores import ApiError

bp = Blueprint('partidos', __name__)

ESTADOS = ('programado', 'jugado', 'postergado', 'cancelado')
MIN_PLANTEL = 5
HORAS_CORRECCION = 48

# Goles de cada lado: un gol cuenta para el equipo del jugador, salvo que sea autogol
SQL_GOLES = '''
    (SELECT COUNT(*) FROM gol g
     JOIN planilla_partido pp ON pp.id_partido = g.id_partido AND pp.ci_jugador = g.ci_jugador
     WHERE g.id_partido = p.id_partido
       AND ((pp.id_equipo = p.{propio} AND NOT g.autogol) OR (pp.id_equipo = p.{rival} AND g.autogol)))
'''

SQL_PARTIDOS = f'''
    SELECT p.id_partido, p.id_torneo, t.nombre AS torneo, p.numero_fecha, p.dia, p.id_turno,
           tu.hora_inicio, tu.hora_fin, p.nombre_cancha, p.id_complejo, c.nombre AS complejo, p.estado,
           p.id_equipo_local, el.nombre AS equipo_local,
           p.id_equipo_visitante, ev.nombre AS equipo_visitante,
           {SQL_GOLES.format(propio='id_equipo_local', rival='id_equipo_visitante')} AS goles_local,
           {SQL_GOLES.format(propio='id_equipo_visitante', rival='id_equipo_local')} AS goles_visitante
    FROM partido p
    JOIN torneo t ON t.id_torneo = p.id_torneo
    JOIN turno tu ON tu.id_turno = p.id_turno
    JOIN complejo c ON c.id_complejo = p.id_complejo
    JOIN equipo el ON el.id_equipo = p.id_equipo_local
    JOIN equipo ev ON ev.id_equipo = p.id_equipo_visitante
'''


def inicio_y_fin(partido):
    """Fecha y hora de comienzo y fin del partido (TIME llega como timedelta)."""
    base = datetime.combine(partido['dia'], datetime.min.time())
    return base + partido['hora_inicio'], base + partido['hora_fin']


def obtener_partido(cur, id_partido):
    partido = uno(cur, SQL_PARTIDOS + ' WHERE p.id_partido = %s', (id_partido,))
    if not partido:
        raise ApiError('El partido no existe.', 404)
    return partido


def validar_jugado(partido):
    inicio, fin = inicio_y_fin(partido)
    if datetime.now() < fin:
        raise ApiError('Un partido solo puede marcarse como jugado cuando su día y turno ya pasaron.')


@bp.get('/partidos')
@requiere(ADMIN, PLANILLERO)
def listar_partidos():
    id_torneo = v.entero_query('torneo')
    numero_fecha = v.entero_query('fecha')
    sql = SQL_PARTIDOS + ' WHERE 1 = 1'
    params = []
    if id_torneo:
        sql += ' AND p.id_torneo = %s'
        params.append(id_torneo)
    if numero_fecha:
        sql += ' AND p.numero_fecha = %s'
        params.append(numero_fecha)
    sql += ' ORDER BY p.numero_fecha, p.dia, tu.hora_inicio, c.nombre, p.nombre_cancha'
    with cursor(g.rol) as cur:
        return jsonify(todos(cur, sql, params))


@bp.get('/partidos/<int:id_partido>')
@requiere(ADMIN, PLANILLERO)
def ver_partido(id_partido):
    with cursor(g.rol) as cur:
        return jsonify(obtener_partido(cur, id_partido))


def _datos_partido(datos):
    return {
        'id_torneo': v.entero(datos, 'id_torneo', 1),
        'numero_fecha': v.entero(datos, 'numero_fecha', 1),
        'id_equipo_local': v.entero(datos, 'id_equipo_local', 1),
        'id_equipo_visitante': v.entero(datos, 'id_equipo_visitante', 1),
        'dia': v.fecha(datos, 'dia'),
        'id_turno': v.entero(datos, 'id_turno', 1),
        'nombre_cancha': v.texto(datos, 'nombre_cancha', 50),
        'id_complejo': v.entero(datos, 'id_complejo', 1),
        'estado': v.opcion(datos, 'estado', ESTADOS, obligatorio=False) or 'programado',
    }


def _validar_partido(cur, p, id_partido=None):
    """Controla las reglas de programación de la letra antes de guardar."""
    excluir = id_partido or 0

    torneo = uno(cur, 'SELECT fecha_inicio, fecha_fin, estado FROM torneo WHERE id_torneo = %s', (p['id_torneo'],))
    if not torneo:
        raise ApiError('El torneo no existe.')
    if torneo['estado'] == 'finalizado':
        raise ApiError('No se pueden programar partidos en un torneo finalizado.')
    if not torneo['fecha_inicio'] <= p['dia'] <= torneo['fecha_fin']:
        raise ApiError('El día del partido debe estar dentro de las fechas del torneo.')

    if p['id_equipo_local'] == p['id_equipo_visitante']:
        raise ApiError('Un equipo no puede enfrentarse a sí mismo.')

    for clave in ('id_equipo_local', 'id_equipo_visitante'):
        equipo = uno(cur, '''
            SELECT e.nombre, e.id_torneo,
                   (SELECT COUNT(*) FROM equipo_jugador_torneo ejt WHERE ejt.id_equipo = e.id_equipo) AS jugadores
            FROM equipo e WHERE e.id_equipo = %s
        ''', (p[clave],))
        if not equipo:
            raise ApiError('Alguno de los equipos no existe.')
        if equipo['id_torneo'] != p['id_torneo']:
            raise ApiError(f'El equipo "{equipo["nombre"]}" no pertenece a esta edición del torneo.')
        if equipo['jugadores'] < MIN_PLANTEL:
            raise ApiError(f'El equipo "{equipo["nombre"]}" tiene menos de {MIN_PLANTEL} jugadores en su plantel.')

    if not uno(cur, 'SELECT 1 FROM turno WHERE id_turno = %s', (p['id_turno'],)):
        raise ApiError('El turno no existe.')
    if not uno(cur, 'SELECT 1 FROM cancha WHERE nombre_cancha = %s AND id_complejo = %s',
               (p['nombre_cancha'], p['id_complejo'])):
        raise ApiError('La cancha no existe.')

    if p['estado'] == 'cancelado':
        return

    if uno(cur, '''
        SELECT 1 FROM partido
        WHERE id_torneo = %s AND estado <> 'cancelado' AND id_partido <> %s
          AND LEAST(id_equipo_local, id_equipo_visitante) = LEAST(%s, %s)
          AND GREATEST(id_equipo_local, id_equipo_visitante) = GREATEST(%s, %s)
    ''', (p['id_torneo'], excluir, p['id_equipo_local'], p['id_equipo_visitante'],
          p['id_equipo_local'], p['id_equipo_visitante'])):
        raise ApiError('Esos equipos ya tienen un partido en esta edición (que no fue cancelado).')

    if uno(cur, '''
        SELECT 1 FROM partido
        WHERE id_torneo = %s AND numero_fecha = %s AND estado <> 'cancelado' AND id_partido <> %s
          AND (id_equipo_local IN (%s, %s) OR id_equipo_visitante IN (%s, %s))
    ''', (p['id_torneo'], p['numero_fecha'], excluir, p['id_equipo_local'], p['id_equipo_visitante'],
          p['id_equipo_local'], p['id_equipo_visitante'])):
        raise ApiError('Alguno de los equipos ya juega otro partido en esa fecha del torneo.')

    if p['estado'] in ('programado', 'jugado') and uno(cur, '''
        SELECT 1 FROM partido
        WHERE dia = %s AND id_turno = %s AND nombre_cancha = %s AND id_complejo = %s
          AND estado IN ('programado', 'jugado') AND id_partido <> %s
    ''', (p['dia'], p['id_turno'], p['nombre_cancha'], p['id_complejo'], excluir)):
        raise ApiError('La cancha ya tiene un partido asignado en ese día y turno.')

    if p['estado'] == 'jugado':
        turno = uno(cur, 'SELECT hora_inicio, hora_fin FROM turno WHERE id_turno = %s', (p['id_turno'],))
        validar_jugado({**p, **turno})


@bp.post('/partidos')
@requiere(ADMIN)
def crear_partido():
    p = _datos_partido(v.cuerpo())
    with cursor(g.rol) as cur:
        _validar_partido(cur, p)
        cur.execute('''
            INSERT INTO partido (id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante,
                                 dia, id_turno, nombre_cancha, id_complejo, estado)
            VALUES (%(id_torneo)s, %(numero_fecha)s, %(id_equipo_local)s, %(id_equipo_visitante)s,
                    %(dia)s, %(id_turno)s, %(nombre_cancha)s, %(id_complejo)s, %(estado)s)
        ''', p)
        return jsonify(id_partido=cur.lastrowid), 201


@bp.put('/partidos/<int:id_partido>')
@requiere(ADMIN)
def modificar_partido(id_partido):
    p = _datos_partido(v.cuerpo())
    with cursor(g.rol) as cur:
        actual = obtener_partido(cur, id_partido)
        if actual['estado'] == 'jugado':
            raise ApiError('Un partido jugado no puede modificarse; solo puede corregirse su planilla dentro de las 48 horas.')
        if actual['id_torneo'] != p['id_torneo']:
            raise ApiError('No se puede cambiar el torneo de un partido.')
        _validar_partido(cur, p, id_partido)
        p['id_partido'] = id_partido
        cur.execute('''
            UPDATE partido SET numero_fecha = %(numero_fecha)s, id_equipo_local = %(id_equipo_local)s,
                id_equipo_visitante = %(id_equipo_visitante)s, dia = %(dia)s, id_turno = %(id_turno)s,
                nombre_cancha = %(nombre_cancha)s, id_complejo = %(id_complejo)s, estado = %(estado)s
            WHERE id_partido = %(id_partido)s
        ''', p)
    return jsonify(ok=True)


@bp.patch('/partidos/<int:id_partido>/estado')
@requiere(ADMIN, PLANILLERO)
def cambiar_estado(id_partido):
    """Usado por el planillero para marcar el partido como jugado al cerrar la planilla."""
    estado = v.opcion(v.cuerpo(), 'estado', ESTADOS)
    if g.rol == PLANILLERO and estado != 'jugado':
        raise ApiError('El planillero solo puede marcar partidos como jugados.', 403)
    with cursor(g.rol) as cur:
        partido = obtener_partido(cur, id_partido)
        if partido['estado'] == 'jugado':
            raise ApiError('El partido ya está marcado como jugado.')
        if estado == 'jugado':
            if partido['estado'] != 'programado':
                raise ApiError('Solo un partido programado puede marcarse como jugado.')
            validar_jugado(partido)
        cur.execute('UPDATE partido SET estado = %s WHERE id_partido = %s', (estado, id_partido))
    return jsonify(ok=True)


@bp.delete('/partidos/<int:id_partido>')
@requiere(ADMIN)
def eliminar_partido(id_partido):
    with cursor(g.rol) as cur:
        partido = obtener_partido(cur, id_partido)
        if partido['estado'] == 'jugado':
            raise ApiError('Un partido jugado no puede eliminarse.')
        if uno(cur, 'SELECT 1 FROM planilla_partido WHERE id_partido = %s', (id_partido,)):
            raise ApiError('No se puede eliminar: el partido tiene planilla cargada.')
        cur.execute('DELETE FROM partido WHERE id_partido = %s', (id_partido,))
    return jsonify(ok=True)


def puede_editar_planilla(partido):
    """Devuelve (True, None) o (False, motivo) según el estado y el horario del partido."""
    if partido['estado'] in ('postergado', 'cancelado'):
        return False, f'El partido está {partido["estado"]}.'
    inicio, fin = inicio_y_fin(partido)
    ahora = datetime.now()
    if ahora < inicio:
        return False, 'El partido todavía no comenzó.'
    if partido['estado'] == 'jugado' and ahora > fin + timedelta(hours=HORAS_CORRECCION):
        return False, f'Pasaron más de {HORAS_CORRECCION} horas desde el partido; el resultado ya no puede corregirse.'
    return True, None
