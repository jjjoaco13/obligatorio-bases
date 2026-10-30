from datetime import date, datetime, timedelta
from decimal import Decimal

from flask import Flask, jsonify
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS

import errores
from rutas import (catalogos, complejos, equipos, jugadores, partidos,
                   planillas, reportes, sanciones, sesion)


class ProveedorJSON(DefaultJSONProvider):
    """Serializa los tipos que devuelve mysql-connector (DATE, TIME, DECIMAL)."""

    sort_keys = False

    @staticmethod
    def default(o):
        if isinstance(o, (date, datetime)):
            return o.isoformat()
        if isinstance(o, timedelta):
            # MySQL devuelve las columnas TIME como timedelta
            minutos = int(o.total_seconds()) // 60
            return f'{minutos // 60:02d}:{minutos % 60:02d}'
        if isinstance(o, Decimal):
            return int(o) if o == o.to_integral_value() else float(o)
        if isinstance(o, (bytes, bytearray)):
            return o.decode()
        return DefaultJSONProvider.default(o)


def crear_app():
    app = Flask(__name__)
    app.json = ProveedorJSON(app)
    CORS(app)

    for modulo in (sesion, catalogos, jugadores, equipos, complejos, partidos,
                   planillas, sanciones, reportes):
        app.register_blueprint(modulo.bp, url_prefix='/api')

    errores.registrar(app)

    @app.get('/api/salud')
    def salud():
        return jsonify(estado='ok')

    return app


app = crear_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
