import mysql.connector
from flask import jsonify


class ApiError(Exception):
    def __init__(self, mensaje, status=400):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.status = status


# Mensajes para los errores de MySQL más comunes (por número de error)
MENSAJES_MYSQL = {
    1045: 'MySQL rechazó el usuario de la aplicación. ¿Se ejecutó db/02_usuarios.sql?',
    1049: 'No existe la base torneo_futbol5. Ejecute db/01_tablas.sql.',
    2003: 'No se pudo conectar a MySQL. Verifique que el servidor esté corriendo.',
    1142: 'El usuario de base de datos no tiene permisos para esta operación.',
    1062: 'Ya existe un registro con esos datos.',
    1451: 'No se puede eliminar: hay otros datos que dependen de este registro.',
    1452: 'Alguno de los datos referenciados no existe.',
    3819: 'Los datos no cumplen las restricciones de la base de datos.',
}


def registrar(app):
    @app.errorhandler(ApiError)
    def api_error(e):
        return jsonify(error=e.mensaje), e.status

    @app.errorhandler(mysql.connector.Error)
    def mysql_error(e):
        app.logger.error(e)
        return jsonify(error=MENSAJES_MYSQL.get(e.errno, 'Error de base de datos: ' + e.msg)), 400

    @app.errorhandler(404)
    def no_encontrado(e):
        return jsonify(error='Recurso no encontrado.'), 404
