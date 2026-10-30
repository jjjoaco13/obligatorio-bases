# Torneo Interfacultades de Fútbol 5

Obligatorio de Base de Datos 1 (UCU, 2do semestre 2026). Sistema para gestionar el fixture, las planillas, las sanciones y los reportes del torneo.

```
obligatorio-bases/
├── db/          Scripts SQL (tablas, usuarios de BD y datos de prueba)
├── backend/     API REST en Python (Flask + mysql-connector, sin ORM)
└── frontend/    Páginas HTML + CSS + JavaScript que consumen la API
```

## Requisitos

- MySQL 8 (por ejemplo, administrado desde DataGrip)
- Python 3.10 o superior
- Un navegador

## 1. Base de datos

Conectado como `root` en DataGrip, ejecutar **en orden**:

1. `db/01_tablas.sql` crea la base `torneo_futbol5` y sus tablas (borra la base si ya existía).
2. `db/02_usuarios.sql` crea los usuarios de MySQL que usa la aplicación, cada uno con sus permisos:
   - `app_login`: solo puede leer la tabla `login`.
   - `app_admin`: puede leer y escribir todas las tablas.
   - `app_planillero`: puede leer el torneo y cargar planillas, goles, tarjetas y sanciones automáticas.
3. `db/03_datos.sql` carga los datos de prueba: 6 equipos, 3 fechas jugadas, una fecha por jugar, tarjetas y sanciones.

En DataGrip, para correr un script entero: abrir el archivo, elegir la conexión y ejecutar todo con `Ctrl+Enter` (o clic derecho sobre el archivo → *Run*).

## 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # En Windows
# source .venv/bin/activate     # En macOS / Linux
pip install -r requirements.txt
copy .env.example .env          # En macOS / Linux: cp .env.example .env
python app.py
```

La API queda escuchando en <http://localhost:5000/api>. Para comprobar que responde, abrir <http://localhost:5000/api/salud>.

Si MySQL no corre en `localhost:3306`, o si cambiaron las contraseñas de `02_usuarios.sql`, hay que ajustar `backend/.env`.

## 3. Frontend

El frontend son archivos estáticos y alcanza con cualquier servidor web. Con Python:

```bash
cd frontend
python -m http.server 8000
```

Abrir <http://localhost:8000>. También funciona con la extensión *Live Server* de VS Code. No conviene abrir el `index.html` con doble clic, porque los módulos de JavaScript no cargan desde `file://`.

Si el backend corre en otra dirección, cambiar `API_URL` en `frontend/js/comun.js`.

## Usuarios de prueba

| Rol           | Correo                  | Contraseña      |
|---------------|-------------------------|-----------------|
| Administrador | `admin@ucu.edu.uy`      | `admin123`      |
| Planillero    | `planillero@ucu.edu.uy` | `planillero123` |

- El **administrador** tiene acceso a todo: torneos, jugadores, equipos y planteles, complejos y canchas, partidos, sanciones y reportes.
- El **planillero** solo ve el fixture y carga las planillas (jugadores, goles y tarjetas) de cada partido.

## Cómo está armado

**Seguridad en la base de datos.** El backend no usa un único usuario de MySQL. Cada solicitud abre la conexión con el usuario que corresponde al rol de quien inició sesión (`backend/config.py`). Por eso, aunque el backend tuviera un error, un planillero igual no podría modificar tablas que su usuario de MySQL no tiene permitido tocar.

**Validaciones en tres capas:**

- **Frontend:** atributos HTML (`required`, `pattern`, `min`/`max`, `maxlength`) y controles cruzados, como impedir que local y visitante sean el mismo equipo.
- **Backend:** tipos y formatos de cada campo (`backend/validaciones.py`) y reglas de negocio (`backend/rutas/*.py`), por ejemplo:
  - el tamaño del plantel, la facultad de cada jugador y el máximo de 2 docentes o funcionarios;
  - partidos repetidos, equipos que juegan dos veces en la misma fecha y canchas ocupadas en un mismo turno;
  - jugadores suspendidos que no pueden figurar en la planilla;
  - la ventana de 48 horas para corregir un resultado;
  - las sanciones automáticas por tarjeta roja o por 3 amarillas.
- **Base de datos:** claves, restricciones `UNIQUE` y `CHECK` en `db/01_tablas.sql`. Si la base rechaza una operación, el backend traduce el error a un mensaje que se entiende.

**Reportes.** Están en `backend/rutas/reportes.py`. Cada reporte es una consulta SQL escrita a mano. Incluyen los 10 que pide la letra y 3 extra: los jugadores más amonestados, los goles por facultad y la edad promedio de cada plantel.
