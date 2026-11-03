import mysql.connector
from flask import jsonify


class ApiError(Exception):
    def __init__(self, mensaje, status=400):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.status = status


# Mensajes amigables para las restricciones definidas en db/01_tablas.sql
MENSAJES_RESTRICCIONES = {
    'uq_facultad_nombre': 'Ya existe una facultad con ese nombre.',
    'uq_torneo_edicion': 'Ya existe un torneo para ese año y semestre.',
    'uq_complejo_nombre': 'Ya existe un complejo con ese nombre.',
    'uq_jugador_email': 'Ya existe un jugador con ese email.',
    'PRIMARY': 'Ya existe un registro con esa clave.',
    'uq_equipo_nombre_torneo': 'Ya existe un equipo con ese nombre en el torneo.',
    'uq_plantel_jugador_torneo': 'El jugador ya integra otro equipo en esta edición del torneo.',
    'uq_plantel_camiseta': 'Ese número de camiseta ya está usado en el equipo.',
    'uq_partido_cruce': 'Esos equipos ya tienen un partido en esta edición.',
    'uq_partido_cancha_turno': 'La cancha ya tiene un partido asignado en ese día y turno.',
    'uq_sancion_tarjeta': 'Esa tarjeta ya generó una sanción.',
    'chk_login_correo': 'El correo no es válido.',
    'chk_torneo_semestre': 'El semestre debe ser 1 o 2.',
    'chk_torneo_fechas': 'La fecha de fin debe ser posterior a la de inicio.',
    'chk_torneo_anio_inicio': 'La fecha de inicio debe pertenecer al año del torneo.',
    'chk_complejo_departamento': 'El departamento no es válido.',
    'chk_jugador_ci': 'La cédula debe tener 7 u 8 dígitos.',
    'chk_jugador_email': 'El email no es válido.',
    'chk_plantel_camiseta': 'El número de camiseta debe estar entre 1 y 99.',
    'chk_partido_rivales': 'Un equipo no puede enfrentarse a sí mismo.',
    'chk_partido_fecha': 'El número de fecha debe ser mayor o igual a 1.',
    'chk_gol_minuto': 'El minuto debe estar entre 0 y 60.',
    'chk_tarjeta_minuto': 'El minuto debe estar entre 0 y 60.',
    'chk_sancion_fecha': 'La fecha de inicio de la sanción debe ser mayor o igual a 1.',
    'chk_sancion_cantidad': 'La cantidad de fechas debe ser mayor o igual a 1.',
    'chk_sancion_origen': 'Las sanciones automáticas duran una fecha y deben tener tarjeta asociada.',
}


def mensaje_mysql(error):
    for restriccion, mensaje in MENSAJES_RESTRICCIONES.items():
        if f"'{restriccion}'" in error.msg or f"`{restriccion}`" in error.msg:
            return mensaje
    if error.errno == 1451:
        return 'No se puede eliminar: hay otros datos que dependen de este registro.'
    if error.errno == 1452:
        return 'Alguno de los datos referenciados no existe.'
    if error.errno == 1062:
        return 'Ya existe un registro con esos datos.'
    if error.errno == 3819:
        return 'Los datos no cumplen las restricciones de la base de datos.'
    return error.msg


def registrar(app):
    @app.errorhandler(ApiError)
    def api_error(e):
        return jsonify(error=e.mensaje), e.status

    @app.errorhandler(mysql.connector.Error)
    def mysql_error(e):
        if e.errno == 1045:
            return jsonify(error='MySQL rechazó el usuario de la aplicación. ¿Se ejecutó db/02_usuarios.sql?'), 503
        if e.errno in (2003, 2005):
            return jsonify(error='No se pudo conectar a MySQL. Verifique que el servidor esté corriendo.'), 503
        if e.errno == 1049:
            return jsonify(error='No existe la base torneo_futbol5. Ejecute db/01_tablas.sql.'), 503
        if e.errno in (1142, 1143):
            return jsonify(error='El usuario de base de datos no tiene permisos para esta operación.'), 403
        if e.errno in (1062, 1451, 1452, 3819, 1048, 1406, 1292, 1265):
            return jsonify(error=mensaje_mysql(e)), 400
        app.logger.exception(e)
        return jsonify(error='Error de base de datos: ' + e.msg), 500

    @app.errorhandler(404)
    def no_encontrado(e):
        return jsonify(error='Recurso no encontrado.'), 404

    @app.errorhandler(405)
    def metodo_no_permitido(e):
        return jsonify(error='Método no permitido.'), 405
