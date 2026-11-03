from contextlib import contextmanager

import mysql.connector

import config


def conectar(rol):
    usuario, contrasena = config.DB_USUARIOS[rol]
    return mysql.connector.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        database=config.DB_NAME,
        user=usuario,
        password=contrasena,
        autocommit=False,
    )


@contextmanager
def cursor(rol):
    """Abre una conexión con el usuario de BD del rol y devuelve un cursor.

    Todo lo ejecutado dentro del bloque es una única transacción: se confirma
    al salir sin errores y se deshace si se lanza una excepción.
    """
    conexion = conectar(rol)
    cur = conexion.cursor(dictionary=True)
    try:
        yield cur
        conexion.commit()
    except Exception:
        conexion.rollback()
        raise
    finally:
        cur.close()
        conexion.close()


def uno(cur, sql, params=()):
    cur.execute(sql, params)
    return cur.fetchone()


def todos(cur, sql, params=()):
    cur.execute(sql, params)
    return cur.fetchall()
