from functools import wraps

from flask import g, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

import config
from errores import ApiError

_serializador = URLSafeTimedSerializer(config.SECRET_KEY, salt='sesion')

ADMIN = 'administrador'
PLANILLERO = 'planillero'


def generar_token(correo, rol):
    return _serializador.dumps({'correo': correo, 'rol': rol})


def requiere(*roles):
    """Exige un token válido cuyo rol esté entre los indicados.

    Deja en `g.rol` el rol del usuario, que también se usa para elegir con qué
    usuario de MySQL se abre la conexión.
    """
    def decorador(funcion):
        @wraps(funcion)
        def envoltura(*args, **kwargs):
            encabezado = request.headers.get('Authorization', '')
            if not encabezado.startswith('Bearer '):
                raise ApiError('Debe iniciar sesión.', 401)
            try:
                sesion = _serializador.loads(encabezado[7:], max_age=config.DURACION_SESION)
            except SignatureExpired:
                raise ApiError('La sesión expiró, vuelva a iniciar sesión.', 401)
            except BadSignature:
                raise ApiError('Sesión inválida.', 401)
            if sesion['rol'] not in roles:
                raise ApiError('No tiene permisos para esta operación.', 403)
            g.correo = sesion['correo']
            g.rol = sesion['rol']
            return funcion(*args, **kwargs)
        return envoltura
    return decorador
