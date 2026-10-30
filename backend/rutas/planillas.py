from flask import Blueprint, g, jsonify

import validaciones as v
from auth import ADMIN, PLANILLERO, requiere
from db import cursor, todos, uno
from errores import ApiError
from rutas.partidos import obtener_partido, puede_editar_planilla

bp = Blueprint('planillas', __name__)

AMARILLAS_PARA_SANCION = 3

# Un jugador está suspendido en una fecha si alguna sanción la abarca
SQL_SUSPENDIDO = '''
    EXISTS (SELECT 1 FROM sancion_jugador s
            WHERE s.ci_jugador = {ci} AND s.id_torneo = %(torneo)s
              AND %(fecha)s BETWEEN s.numero_fecha_inicio AND s.numero_fecha_inicio + s.cantidad_fechas - 1)
'''


def _partido_editable(cur, id_partido):
    partido = obtener_partido(cur, id_partido)
    editable, motivo = puede_editar_planilla(partido)
    if not editable:
        raise ApiError(motivo)
    return partido


def _exigir_en_planilla(cur, id_partido, ci):
    if not uno(cur, 'SELECT 1 FROM planilla_partido WHERE id_partido = %s AND ci_jugador = %s', (id_partido, ci)):
        raise ApiError('Solo pueden registrarse goles o tarjetas de jugadores que figuran en la planilla.')


@bp.get('/partidos/<int:id_partido>/planilla')
@requiere(ADMIN, PLANILLERO)
def ver_planilla(id_partido):
    with cursor(g.rol) as cur:
        partido = obtener_partido(cur, id_partido)
        editable, motivo = puede_editar_planilla(partido)
        params = {'partido': id_partido, 'torneo': partido['id_torneo'], 'fecha': partido['numero_fecha'],
                  'local': partido['id_equipo_local'], 'visitante': partido['id_equipo_visitante']}

        jugadores = todos(cur, f'''
            SELECT ejt.ci_jugador AS ci, j.nombre, j.apellido, ejt.id_equipo, ejt.numero_camiseta,
                   (pp.ci_jugador IS NOT NULL) AS en_planilla,
                   {SQL_SUSPENDIDO.format(ci='ejt.ci_jugador')} AS suspendido
            FROM equipo_jugador_torneo ejt
            JOIN jugador j ON j.ci = ejt.ci_jugador
            LEFT JOIN planilla_partido pp ON pp.id_partido = %(partido)s AND pp.ci_jugador = ejt.ci_jugador
            WHERE ejt.id_equipo IN (%(local)s, %(visitante)s)
            ORDER BY ejt.numero_camiseta
        ''', params)

        goles = todos(cur, '''
            SELECT g.id_gol, g.ci_jugador, j.nombre, j.apellido, pp.id_equipo, g.minuto, g.autogol
            FROM gol g
            JOIN jugador j ON j.ci = g.ci_jugador
            JOIN planilla_partido pp ON pp.id_partido = g.id_partido AND pp.ci_jugador = g.ci_jugador
            WHERE g.id_partido = %s
            ORDER BY g.minuto, g.id_gol
        ''', (id_partido,))

        tarjetas = todos(cur, '''
            SELECT t.id_tarjeta, t.ci_jugador, j.nombre, j.apellido, pp.id_equipo, t.minuto, t.color
            FROM tarjeta t
            JOIN jugador j ON j.ci = t.ci_jugador
            JOIN planilla_partido pp ON pp.id_partido = t.id_partido AND pp.ci_jugador = t.ci_jugador
            WHERE t.id_partido = %s
            ORDER BY t.minuto, t.id_tarjeta
        ''', (id_partido,))

    return jsonify(partido=partido, editable=editable, motivo=motivo,
                   jugadores=jugadores, goles=goles, tarjetas=tarjetas)


@bp.post('/partidos/<int:id_partido>/planilla')
@requiere(ADMIN, PLANILLERO)
def agregar_a_planilla(id_partido):
    ci = v.ci(v.cuerpo().get('ci_jugador'))
    with cursor(g.rol) as cur:
        partido = _partido_editable(cur, id_partido)
        plantel = uno(cur, '''
            SELECT id_equipo FROM equipo_jugador_torneo
            WHERE ci_jugador = %s AND id_equipo IN (%s, %s)
        ''', (ci, partido['id_equipo_local'], partido['id_equipo_visitante']))
        if not plantel:
            raise ApiError('El jugador no pertenece al plantel de ninguno de los dos equipos.')
        suspendido = uno(cur, 'SELECT ' + SQL_SUSPENDIDO.format(ci='%(ci)s') + ' AS s',
                         {'ci': ci, 'torneo': partido['id_torneo'], 'fecha': partido['numero_fecha']})
        if suspendido['s']:
            raise ApiError('El jugador está suspendido para esta fecha del torneo.')
        if uno(cur, 'SELECT 1 FROM planilla_partido WHERE id_partido = %s AND ci_jugador = %s', (id_partido, ci)):
            raise ApiError('El jugador ya figura en la planilla.')
        cur.execute('INSERT INTO planilla_partido (id_partido, ci_jugador, id_equipo) VALUES (%s, %s, %s)',
                    (id_partido, ci, plantel['id_equipo']))
    return jsonify(ok=True), 201


@bp.delete('/partidos/<int:id_partido>/planilla/<ci>')
@requiere(ADMIN, PLANILLERO)
def quitar_de_planilla(id_partido, ci):
    with cursor(g.rol) as cur:
        _partido_editable(cur, id_partido)
        if uno(cur, 'SELECT 1 FROM gol WHERE id_partido = %s AND ci_jugador = %s', (id_partido, ci)) or \
                uno(cur, 'SELECT 1 FROM tarjeta WHERE id_partido = %s AND ci_jugador = %s', (id_partido, ci)):
            raise ApiError('El jugador tiene goles o tarjetas en este partido; elimínelos primero.')
        cur.execute('DELETE FROM planilla_partido WHERE id_partido = %s AND ci_jugador = %s', (id_partido, ci))
    return jsonify(ok=True)


# ---------- Goles ----------

@bp.post('/partidos/<int:id_partido>/goles')
@requiere(ADMIN, PLANILLERO)
def agregar_gol(id_partido):
    datos = v.cuerpo()
    ci = v.ci(datos.get('ci_jugador'))
    minuto = v.entero(datos, 'minuto', 0, 60)
    autogol = v.booleano(datos, 'autogol')
    with cursor(g.rol) as cur:
        _partido_editable(cur, id_partido)
        _exigir_en_planilla(cur, id_partido, ci)
        cur.execute('INSERT INTO gol (id_partido, ci_jugador, minuto, autogol) VALUES (%s, %s, %s, %s)',
                    (id_partido, ci, minuto, autogol))
        return jsonify(id_gol=cur.lastrowid), 201


@bp.delete('/goles/<int:id_gol>')
@requiere(ADMIN, PLANILLERO)
def eliminar_gol(id_gol):
    with cursor(g.rol) as cur:
        gol = uno(cur, 'SELECT id_partido FROM gol WHERE id_gol = %s', (id_gol,))
        if not gol:
            raise ApiError('El gol no existe.', 404)
        _partido_editable(cur, gol['id_partido'])
        cur.execute('DELETE FROM gol WHERE id_gol = %s', (id_gol,))
    return jsonify(ok=True)


# ---------- Tarjetas ----------

@bp.post('/partidos/<int:id_partido>/tarjetas')
@requiere(ADMIN, PLANILLERO)
def agregar_tarjeta(id_partido):
    datos = v.cuerpo()
    ci = v.ci(datos.get('ci_jugador'))
    minuto = v.entero(datos, 'minuto', 0, 60)
    color = v.opcion(datos, 'color', ('amarilla', 'roja'))
    with cursor(g.rol) as cur:
        partido = _partido_editable(cur, id_partido)
        _exigir_en_planilla(cur, id_partido, ci)
        if uno(cur, "SELECT 1 FROM tarjeta WHERE id_partido = %s AND ci_jugador = %s AND color = 'roja'",
               (id_partido, ci)):
            raise ApiError('El jugador ya fue expulsado en este partido.')

        cur.execute('INSERT INTO tarjeta (id_partido, ci_jugador, minuto, color) VALUES (%s, %s, %s, %s)',
                    (id_partido, ci, minuto, color))
        id_tarjeta = cur.lastrowid

        # Sanción automática: una fecha de suspensión, que se cumple en la fecha siguiente
        motivo = None
        if color == 'roja':
            motivo = 'roja'
        else:
            amarillas = uno(cur, '''
                SELECT COUNT(*) AS total FROM tarjeta t JOIN partido p ON p.id_partido = t.id_partido
                WHERE t.ci_jugador = %s AND p.id_torneo = %s AND t.color = 'amarilla'
            ''', (ci, partido['id_torneo']))['total']
            if amarillas % AMARILLAS_PARA_SANCION == 0:
                motivo = 'acumulacion_amarillas'

        if motivo:
            cur.execute('''
                INSERT INTO sancion_jugador (ci_jugador, id_torneo, motivo, numero_fecha_inicio, cantidad_fechas, id_tarjeta)
                VALUES (%s, %s, %s, %s, 1, %s)
            ''', (ci, partido['id_torneo'], motivo, partido['numero_fecha'] + 1, id_tarjeta))

    return jsonify(id_tarjeta=id_tarjeta, sancion=motivo), 201


@bp.delete('/tarjetas/<int:id_tarjeta>')
@requiere(ADMIN, PLANILLERO)
def eliminar_tarjeta(id_tarjeta):
    with cursor(g.rol) as cur:
        tarjeta = uno(cur, 'SELECT id_partido FROM tarjeta WHERE id_tarjeta = %s', (id_tarjeta,))
        if not tarjeta:
            raise ApiError('La tarjeta no existe.', 404)
        _partido_editable(cur, tarjeta['id_partido'])
        # Si la tarjeta había generado una sanción automática, se anula junto con ella
        cur.execute('DELETE FROM sancion_jugador WHERE id_tarjeta = %s', (id_tarjeta,))
        cur.execute('DELETE FROM tarjeta WHERE id_tarjeta = %s', (id_tarjeta,))
    return jsonify(ok=True)
