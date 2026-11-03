import re
from datetime import date

from flask import request

from errores import ApiError

RE_CI = re.compile(r'^\d{7,8}$')
RE_EMAIL = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def cuerpo():
    datos = request.get_json(silent=True)
    if not isinstance(datos, dict):
        raise ApiError('El cuerpo de la solicitud debe ser un objeto JSON.')
    return datos


def texto(datos, campo, max_largo, obligatorio=True):
    valor = datos.get(campo)
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        if obligatorio:
            raise ApiError(f'El campo "{campo}" es obligatorio.')
        return None
    if not isinstance(valor, str):
        raise ApiError(f'El campo "{campo}" debe ser texto.')
    valor = valor.strip()
    if len(valor) > max_largo:
        raise ApiError(f'El campo "{campo}" admite como máximo {max_largo} caracteres.')
    return valor


def entero(datos, campo, minimo=None, maximo=None, obligatorio=True):
    valor = datos.get(campo)
    if valor is None or valor == '':
        if obligatorio:
            raise ApiError(f'El campo "{campo}" es obligatorio.')
        return None
    if isinstance(valor, bool):
        raise ApiError(f'El campo "{campo}" debe ser un número entero.')
    try:
        valor = int(valor)
    except (TypeError, ValueError):
        raise ApiError(f'El campo "{campo}" debe ser un número entero.')
    if minimo is not None and valor < minimo:
        raise ApiError(f'El campo "{campo}" debe ser mayor o igual a {minimo}.')
    if maximo is not None and valor > maximo:
        raise ApiError(f'El campo "{campo}" debe ser menor o igual a {maximo}.')
    return valor


def fecha(datos, campo, obligatorio=True):
    valor = datos.get(campo)
    if not valor:
        if obligatorio:
            raise ApiError(f'El campo "{campo}" es obligatorio.')
        return None
    try:
        return date.fromisoformat(str(valor))
    except ValueError:
        raise ApiError(f'El campo "{campo}" debe ser una fecha con formato AAAA-MM-DD.')


def opcion(datos, campo, opciones, obligatorio=True):
    valor = datos.get(campo)
    if valor is None or valor == '':
        if obligatorio:
            raise ApiError(f'El campo "{campo}" es obligatorio.')
        return None
    if valor not in opciones:
        raise ApiError(f'El campo "{campo}" debe ser uno de: {", ".join(opciones)}.')
    return valor


def booleano(datos, campo):
    valor = datos.get(campo, False)
    if not isinstance(valor, bool):
        raise ApiError(f'El campo "{campo}" debe ser verdadero o falso.')
    return valor


def ci(valor):
    valor = str(valor or '').strip()
    if not RE_CI.match(valor):
        raise ApiError('La cédula debe tener 7 u 8 dígitos, sin puntos ni guiones.')
    return valor


def email(valor):
    if not valor or not RE_EMAIL.match(valor):
        raise ApiError('El email no es válido.')
    return valor


def entero_query(nombre, obligatorio=False):
    valor = request.args.get(nombre)
    if not valor:
        if obligatorio:
            raise ApiError(f'Falta el parámetro "{nombre}".')
        return None
    try:
        return int(valor)
    except ValueError:
        raise ApiError(f'El parámetro "{nombre}" debe ser un número entero.')
