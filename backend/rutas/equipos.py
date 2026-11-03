from flask import Blueprint, g, jsonify

import validaciones as v
from auth import ADMIN, PLANILLERO, requiere
from db import cursor, todos, uno
from errores import ApiError

bp = Blueprint('equipos', __name__)

MAX_PLANTEL = 10
MAX_DOCENTES_FUNCIONARIOS = 2


def _equipo(cur, id_equipo):
    equipo = uno(cur, '''
        SELECT e.id_equipo, e.nombre, e.id_torneo, e.id_facultad, e.ci_capitan, t.estado AS estado_torneo
        FROM equipo e JOIN torneo t ON t.id_torneo = e.id_torneo
        WHERE e.id_equipo = %s
    ''', (id_equipo,))
    if not equipo:
        raise ApiError('El equipo no existe.', 404)
    return equipo


def _exigir_inscripcion(estado_torneo):
    if estado_torneo != 'inscripcion':
        raise ApiError('Los equipos y planteles solo pueden modificarse mientras el torneo está en inscripción.')


@bp.get('/equipos')
@requiere(ADMIN, PLANILLERO)
def listar_equipos():
    id_torneo = v.entero_query('torneo')
    sql = '''
        SELECT e.id_equipo, e.nombre, e.id_torneo, t.nombre AS torneo, t.estado AS estado_torneo,
               e.id_facultad, f.nombre AS facultad, e.ci_capitan,
               CONCAT(c.nombre, ' ', c.apellido) AS capitan,
               (SELECT COUNT(*) FROM equipo_jugador_torneo ejt WHERE ejt.id_equipo = e.id_equipo) AS cantidad_jugadores
        FROM equipo e
        JOIN torneo t ON t.id_torneo = e.id_torneo
        JOIN facultad f ON f.id_facultad = e.id_facultad
        LEFT JOIN jugador c ON c.ci = e.ci_capitan
    '''
    params = []
    if id_torneo:
        sql += ' WHERE e.id_torneo = %s'
        params.append(id_torneo)
    sql += ' ORDER BY e.nombre'
    with cursor(g.rol) as cur:
        return jsonify(todos(cur, sql, params))


@bp.post('/equipos')
@requiere(ADMIN)
def crear_equipo():
    datos = v.cuerpo()
    equipo = {
        'nombre': v.texto(datos, 'nombre', 100),
        'id_torneo': v.entero(datos, 'id_torneo', 1),
        'id_facultad': v.entero(datos, 'id_facultad', 1),
    }
    with cursor(g.rol) as cur:
        torneo = uno(cur, 'SELECT estado FROM torneo WHERE id_torneo = %s', (equipo['id_torneo'],))
        if not torneo:
            raise ApiError('El torneo no existe.')
        _exigir_inscripcion(torneo['estado'])
        cur.execute('''
            INSERT INTO equipo (nombre, id_torneo, id_facultad)
            VALUES (%(nombre)s, %(id_torneo)s, %(id_facultad)s)
        ''', equipo)
        return jsonify(id_equipo=cur.lastrowid), 201


@bp.put('/equipos/<int:id_equipo>')
@requiere(ADMIN)
def modificar_equipo(id_equipo):
    datos = v.cuerpo()
    nombre = v.texto(datos, 'nombre', 100)
    id_facultad = v.entero(datos, 'id_facultad', 1)
    ci_capitan = datos.get('ci_capitan') or None
    with cursor(g.rol) as cur:
        equipo = _equipo(cur, id_equipo)
        if id_facultad != equipo['id_facultad']:
            _exigir_inscripcion(equipo['estado_torneo'])
            if uno(cur, 'SELECT 1 FROM equipo_jugador_torneo WHERE id_equipo = %s', (id_equipo,)):
                raise ApiError('No se puede cambiar la facultad de un equipo que ya tiene jugadores.')
        if ci_capitan and not uno(cur, '''
            SELECT 1 FROM equipo_jugador_torneo WHERE id_equipo = %s AND ci_jugador = %s
        ''', (id_equipo, ci_capitan)):
            raise ApiError('El capitán debe ser un jugador del plantel.')
        cur.execute('''
            UPDATE equipo SET nombre = %s, id_facultad = %s, ci_capitan = %s WHERE id_equipo = %s
        ''', (nombre, id_facultad, ci_capitan, id_equipo))
    return jsonify(ok=True)


@bp.delete('/equipos/<int:id_equipo>')
@requiere(ADMIN)
def eliminar_equipo(id_equipo):
    with cursor(g.rol) as cur:
        equipo = _equipo(cur, id_equipo)
        _exigir_inscripcion(equipo['estado_torneo'])
        if uno(cur, '''
            SELECT 1 FROM partido WHERE id_equipo_local = %s OR id_equipo_visitante = %s
        ''', (id_equipo, id_equipo)):
            raise ApiError('No se puede eliminar: el equipo tiene partidos programados.')
        # Se borra el plantel junto con el equipo (primero se libera el capitán)
        cur.execute('UPDATE equipo SET ci_capitan = NULL WHERE id_equipo = %s', (id_equipo,))
        cur.execute('DELETE FROM equipo_jugador_torneo WHERE id_equipo = %s', (id_equipo,))
        cur.execute('DELETE FROM equipo WHERE id_equipo = %s', (id_equipo,))
    return jsonify(ok=True)


# ---------- Plantel ----------

@bp.get('/equipos/<int:id_equipo>/plantel')
@requiere(ADMIN, PLANILLERO)
def listar_plantel(id_equipo):
    with cursor(g.rol) as cur:
        _equipo(cur, id_equipo)
        return jsonify(todos(cur, '''
            SELECT ejt.ci_jugador AS ci, j.nombre, j.apellido, j.tipo, ejt.numero_camiseta,
                   (e.ci_capitan = ejt.ci_jugador) AS es_capitan
            FROM equipo_jugador_torneo ejt
            JOIN jugador j ON j.ci = ejt.ci_jugador
            JOIN equipo e ON e.id_equipo = ejt.id_equipo
            WHERE ejt.id_equipo = %s
            ORDER BY ejt.numero_camiseta
        ''', (id_equipo,)))


@bp.post('/equipos/<int:id_equipo>/plantel')
@requiere(ADMIN)
def agregar_al_plantel(id_equipo):
    datos = v.cuerpo()
    ci = v.ci(datos.get('ci_jugador'))
    numero = v.entero(datos, 'numero_camiseta', 1, 99)
    with cursor(g.rol) as cur:
        equipo = _equipo(cur, id_equipo)
        _exigir_inscripcion(equipo['estado_torneo'])

        jugador = uno(cur, 'SELECT id_facultad, tipo FROM jugador WHERE ci = %s', (ci,))
        if not jugador:
            raise ApiError('El jugador no existe.')
        if jugador['id_facultad'] != equipo['id_facultad']:
            raise ApiError('El jugador debe pertenecer a la facultad que representa el equipo.')

        cantidad = uno(cur, '''
            SELECT COUNT(*) AS total,
                   COALESCE(SUM(j.tipo IN ('docente', 'funcionario')), 0) AS docentes_funcionarios
            FROM equipo_jugador_torneo ejt JOIN jugador j ON j.ci = ejt.ci_jugador
            WHERE ejt.id_equipo = %s
        ''', (id_equipo,))
        if cantidad['total'] >= MAX_PLANTEL:
            raise ApiError(f'El plantel ya tiene el máximo de {MAX_PLANTEL} jugadores.')
        if jugador['tipo'] in ('docente', 'funcionario') and cantidad['docentes_funcionarios'] >= MAX_DOCENTES_FUNCIONARIOS:
            raise ApiError(f'El plantel admite como máximo {MAX_DOCENTES_FUNCIONARIOS} docentes o funcionarios.')

        otro = uno(cur, '''
            SELECT e.nombre FROM equipo_jugador_torneo ejt JOIN equipo e ON e.id_equipo = ejt.id_equipo
            WHERE ejt.ci_jugador = %s AND ejt.id_torneo = %s
        ''', (ci, equipo['id_torneo']))
        if otro:
            raise ApiError(f'El jugador ya integra el equipo "{otro["nombre"]}" en esta edición.')

        cur.execute('''
            INSERT INTO equipo_jugador_torneo (id_equipo, ci_jugador, id_torneo, numero_camiseta)
            VALUES (%s, %s, %s, %s)
        ''', (id_equipo, ci, equipo['id_torneo'], numero))
    return jsonify(ok=True), 201


@bp.put('/equipos/<int:id_equipo>/plantel/<ci>')
@requiere(ADMIN)
def modificar_camiseta(id_equipo, ci):
    numero = v.entero(v.cuerpo(), 'numero_camiseta', 1, 99)
    with cursor(g.rol) as cur:
        equipo = _equipo(cur, id_equipo)
        _exigir_inscripcion(equipo['estado_torneo'])
        cur.execute('''
            UPDATE equipo_jugador_torneo SET numero_camiseta = %s WHERE id_equipo = %s AND ci_jugador = %s
        ''', (numero, id_equipo, ci))
    return jsonify(ok=True)


@bp.delete('/equipos/<int:id_equipo>/plantel/<ci>')
@requiere(ADMIN)
def quitar_del_plantel(id_equipo, ci):
    with cursor(g.rol) as cur:
        equipo = _equipo(cur, id_equipo)
        _exigir_inscripcion(equipo['estado_torneo'])
        if equipo['ci_capitan'] == ci:
            raise ApiError('El jugador es el capitán; designe otro capitán antes de quitarlo.')
        cur.execute('DELETE FROM equipo_jugador_torneo WHERE id_equipo = %s AND ci_jugador = %s', (id_equipo, ci))
        if cur.rowcount == 0:
            raise ApiError('El jugador no integra el plantel.', 404)
    return jsonify(ok=True)
