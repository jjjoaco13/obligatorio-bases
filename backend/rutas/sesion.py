import bcrypt
from flask import Blueprint, jsonify

import validaciones as v
from auth import generar_token
from db import cursor, uno
from errores import ApiError

bp = Blueprint('sesion', __name__)


@bp.post('/login')
def login():
    datos = v.cuerpo()
    correo = v.email(v.texto(datos, 'correo', 100))
    contrasena = v.texto(datos, 'contrasena', 255)

    # El login usa el usuario de BD app_login, que solo puede leer la tabla login
    with cursor('login') as cur:
        usuario = uno(cur, 'SELECT correo, contrasena, rol FROM login WHERE correo = %s', (correo,))

    # Las contraseñas se guardan como hash bcrypt (ver db/03_datos.sql)
    if not usuario or not bcrypt.checkpw(contrasena.encode(), usuario['contrasena'].encode()):
        raise ApiError('Correo o contraseña incorrectos.', 401)

    return jsonify(token=generar_token(usuario['correo'], usuario['rol']),
                   correo=usuario['correo'], rol=usuario['rol'])
