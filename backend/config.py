import os

from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', '3306'))
DB_NAME = os.getenv('DB_NAME', 'torneo_futbol5')

# Cada rol de la aplicación usa un usuario de MySQL distinto (ver db/02_usuarios.sql),
# así los permisos también se controlan a nivel de base de datos.
DB_USUARIOS = {
    'login': (os.getenv('DB_USER_LOGIN', 'app_login'), os.getenv('DB_PASS_LOGIN', 'Login_2026!')),
    'administrador': (os.getenv('DB_USER_ADMIN', 'app_admin'), os.getenv('DB_PASS_ADMIN', 'Admin_2026!')),
    'planillero': (os.getenv('DB_USER_PLANILLERO', 'app_planillero'), os.getenv('DB_PASS_PLANILLERO', 'Planillero_2026!')),
}

SECRET_KEY = os.getenv('SECRET_KEY', 'clave-de-desarrollo')

# Duración de la sesión en segundos (8 horas)
DURACION_SESION = 8 * 60 * 60
