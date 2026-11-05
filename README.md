# Torneo Interfacultades de Fútbol 5 - Instructivo

## Qué hay que instalar:

### Programas

| Programa | Para qué se usa | Cómo verificar que está |
|----------|-----------------|-------------------------|
| **MySQL 8** | Guarda todos los datos del torneo | En Windows, el servicio `MySQL80` tiene que estar *Running* |
| **DataGrip** (u otro cliente SQL) | Ejecutar los scripts de `db/` | — |
| **Python 3.10+** | Correr el backend | `python --version` |
| **Node.js 20+** (trae `npm`) | Correr la app de Expo | `node --version` |
| **Expo Go** (opcional) | Probar la app en el celular | Se baja de la tienda de apps |

### Librerías del backend (`backend/requirements.txt`)

Se instalan *todas* con `pip install -r librerias_a_instalar.txt`:

- **flask**: el servidor web. Recibe las solicitudes del frontend y decide qué función las atiende.
- **flask-cors**: permite que la app (que corre en otro puerto) pueda llamar al backend.
- **mysql-connector-python**: la conexión con la base de datos MySQL. Con esto se ejecuta el SQL.
- **python-dotenv**: lee el archivo `.env` con los datos de conexión.
- **bcrypt**: compara la contraseña que escribe el usuario con el hash guardado en la tabla `login`.

### Librerías del frontend (`frontend/package.json`)

Se instalan solas con `npm install`:

- **react** y **react-native**: la base para armar las pantallas.
- **expo**: arma y levanta la app sin tener que configurar Android o iOS a mano.
- **expo-router**: la navegación. Cada archivo de `app/` es una pantalla y su ruta sale del nombre del archivo.
- **react-native-web** y **react-dom**: permiten abrir la misma app en el navegador.
- **expo-constants**: se usa para saber la IP de la computadora y así encontrar al backend desde el celular.
- El resto (`react-native-screens`, `react-native-safe-area-context`, etc.) son dependencias que necesita expo-router.


### Ejemplo de funcionamiento con el inicio de sesión:

1. **Pantalla** `frontend/app/index.jsx`: el usuario escribe correo y contraseña y toca *Ingresar*.
2. **Llamada** `frontend/common/api.js`: la función `api('/login', 'POST', {...})` hace un `fetch` 
a `http://<ip>:5000/api/login`.
3. **Backend** `backend/app.py`: Flask recibe la solicitud y se la pasa a la función `login()` de 
`backend/rutas/sesion.py`.
4. **Base de datos**: `login()` se conecta como `app_login` (que solo puede leer la tabla `login`) y 
busca al usuario por correo.
5. **Respuesta**: si la contraseña coincide con el hash, el backend genera un **token** (`backend/auth.py`) 
y lo devuelve junto con el rol.
6. **De vuelta en la app**: el token y el rol se guardan en `frontend/common/sesion.js` y se navega a 
`app/menu.jsx`, que muestra las opciones según el rol.

### Ejemplo al cargar un gol en la planilla:

1. **Pantalla** `frontend/app/partidos/[id].jsx`: el planillero elige al jugador, escribe el minuto y toca *Agregar gol*.
2. **Llamada**: `api('/partidos/7/goles', 'POST', {...})`. Va con el token en el encabezado `Authorization`.
3. **Control de acceso** `backend/auth.py`: el método `@requiere(...)` revisa el token y anota el rol del usuario.
4. **Validación** `backend/validaciones.py`: chequea que el minuto sea un número entre 0 y 60 y que la cédula 
tenga 7 u 8 dígitos.
5. **Reglas** `backend/rutas/planillas.py`: el partido tiene que estar en horario de carga y el jugador tiene que 
estar en la planilla.
6. **Base de datos** `backend/db.py`: se conecta como `app_planillero` y hace el `INSERT INTO gol`.
7. **Respuesta**: si el backend contesta OK, la pantalla vuelve a pedir la planilla y se actualiza el marcador.

### Dónde está cada cosa

| Quiero ver…                                  | Archivo                                 |
|----------------------------------------------|-----------------------------------------|
| Una pantalla                                 | `frontend/app/<nombre_de_pantalla>.jsx` |
| Cómo se llama al backend                     | `frontend/common/api.js`                |
| Qué hace un endpoint (`/api/...`)            | `backend/rutas/<tema>.py`               |
| Cómo se valida un campo                      | `backend/validaciones.py`               |
| Con qué usuario de MySQL se conecta cada rol | `backend/config.py` y `db/02_usuarios.sql` |
| Cualquier consulta SQL                       | `db/04_consultas.sql`                   |

## Cómo funciona por detrás

**1. La app solo muestra y pide cosas -** Todas las pantallas siguen el mismo esquema: al abrirse piden datos 
con `api(...)`, los guardan en un `useState` y los dibujan. Cuando el usuario guarda algo, vuelven a llamar 
a `api(...)`. Si el backend da error, se muestra el mensaje en *rojo*.

**2. El token funciona como llave -** Al iniciar sesión, el backend entrega un token firmado que dice "este usuario 
es administrador" (o planillero). La app lo manda en cada pedido. El backend comprueba la firma, así que nadie puede 
inventarse uno, y el token vence a las 8 horas.

**3. Cada rol entra a MySQL con su propio usuario -** El backend no tiene una llave maestra. Si quien pide es 
planillero, abre la conexión como `app_planillero`, que en MySQL no tiene permiso para tocar jugadores, equipos 
ni partidos (salvo cambiarles el estado). Aunque el backend tuviera un error, la base no lo dejaría.

**4. Cada pedido es una transacción -** `backend/db.py` abre una conexión por pedido. Si todo sale bien hace `COMMIT` 
(el Autocommit está desactivado); si algo falla a la mitad hace `ROLLBACK` y no queda nada guardado a medias. Por 
ejemplo, al cargar una tarjeta roja se guardan la tarjeta y la sanción juntas, o ninguna de las dos.

**5. Las reglas se controlan dos veces -** Primero el backend revisa las reglas de la letra y devuelve un mensaje 
claro (por ejemplo, "La cancha ya tiene un partido asignado en ese día y turno"). Después, por las dudas, la base 
tiene sus propias restricciones (`UNIQUE`, `CHECK`, claves foráneas) que frenan cualquier dato inválido.

**6. El resultado se calcula -** No hay una columna con "2-1". El marcador se cuenta a partir de la 
tabla `gol`. Un gol suma para el equipo del jugador que lo hizo, salvo que sea en contra (`autogol`), en cuyo 
caso suma para el rival. La tabla de posiciones usa este mismo cálculo.

**7. Las sanciones automáticas -** Cuando se carga una tarjeta, el backend se fija si es roja o si es la tercera 
amarilla del jugador en el torneo. En ese caso crea una sanción de 1 fecha para la fecha siguiente. Al armar la 
planilla de esa fecha, el jugador aparece como suspendido y no se lo puede agregar.

**8. Los reportes son consultas SQL -** Cada reporte es una consulta con nombre. La app pide la lista y después 
los datos de cada uno, y los dibuja como tabla usando los nombres de las columnas que devuelve el SQL.
