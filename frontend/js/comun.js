// Dirección del backend (Flask). Cambiarla si el backend corre en otro puerto.
export const API_URL = 'http://localhost:5000/api';

const CLAVE_SESION = 'sesion_torneo';

const MENU = [
  { href: 'partidos.html', texto: 'Partidos', roles: ['administrador', 'planillero'] },
  { href: 'equipos.html', texto: 'Equipos', roles: ['administrador'] },
  { href: 'jugadores.html', texto: 'Jugadores', roles: ['administrador'] },
  { href: 'complejos.html', texto: 'Complejos', roles: ['administrador'] },
  { href: 'sanciones.html', texto: 'Sanciones', roles: ['administrador'] },
  { href: 'torneos.html', texto: 'Torneos', roles: ['administrador'] },
  { href: 'reportes.html', texto: 'Reportes', roles: ['administrador'] },
];

// ---------- Sesión ----------

export function obtenerSesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION));
  } catch {
    return null;
  }
}

export function guardarSesion(sesion) {
  localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
}

export function cerrarSesion() {
  localStorage.removeItem(CLAVE_SESION);
  location.href = 'index.html';
}

export function esAdmin() {
  return obtenerSesion()?.rol === 'administrador';
}

// ---------- API ----------

export async function api(ruta, { method = 'GET', body } = {}) {
  const sesion = obtenerSesion();
  const headers = { 'Content-Type': 'application/json' };
  if (sesion) headers.Authorization = `Bearer ${sesion.token}`;

  let respuesta;
  try {
    respuesta = await fetch(API_URL + ruta, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. ¿Está levantado el backend?');
  }

  const datos = await respuesta.json().catch(() => ({}));
  if (respuesta.status === 401 && ruta !== '/login') {
    cerrarSesion();
  }
  if (!respuesta.ok) {
    throw new Error(datos.error || `Error ${respuesta.status}`);
  }
  return datos;
}

// ---------- Página ----------

/** Verifica la sesión, arma la barra superior y devuelve la sesión. */
export function iniciarPagina(rolesPermitidos = ['administrador', 'planillero']) {
  const sesion = obtenerSesion();
  if (!sesion) {
    location.href = 'index.html';
    throw new Error('Sin sesión');
  }
  if (!rolesPermitidos.includes(sesion.rol)) {
    location.href = 'partidos.html';
    throw new Error('Sin permisos');
  }

  const actual = location.pathname.split('/').pop();
  const menu = document.getElementById('menu');
  menu.innerHTML = MENU
    .filter((item) => item.roles.includes(sesion.rol))
    .map((item) => `<a href="${item.href}" class="${item.href === actual ? 'activo' : ''}">${item.texto}</a>`)
    .join('');

  document.getElementById('usuario').innerHTML =
    `${escapar(sesion.correo)} <span class="rol">${escapar(sesion.rol)}</span>`;
  document.getElementById('salir').addEventListener('click', cerrarSesion);
  return sesion;
}

// ---------- Utilidades ----------

export function escapar(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function avisar(mensaje, tipo = 'ok') {
  const contenedor = document.getElementById('avisos');
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.textContent = mensaje;
  contenedor.appendChild(toast);
  setTimeout(() => toast.remove(), tipo === 'error' ? 6000 : 3000);
}

export function avisarError(error) {
  avisar(error.message, 'error');
}

/** Llena un <select> con opciones. */
export function llenarSelect(select, items, valor, texto, vacio) {
  const opciones = items.map((item) =>
    `<option value="${escapar(valor(item))}">${escapar(texto(item))}</option>`);
  if (vacio !== undefined) opciones.unshift(`<option value="">${escapar(vacio)}</option>`);
  select.innerHTML = opciones.join('');
}

/** Devuelve los campos de un formulario como objeto (los checkbox como booleanos). */
export function datosFormulario(form) {
  const datos = {};
  for (const campo of form.elements) {
    if (!campo.name) continue;
    if (campo.type === 'checkbox') datos[campo.name] = campo.checked;
    else datos[campo.name] = campo.value.trim();
  }
  return datos;
}

/** Carga un objeto en los campos de un formulario. */
export function cargarFormulario(form, datos) {
  for (const campo of form.elements) {
    if (!campo.name || !(campo.name in datos)) continue;
    if (campo.type === 'checkbox') campo.checked = Boolean(datos[campo.name]);
    else campo.value = datos[campo.name] ?? '';
  }
}

export function formatearFecha(iso) {
  if (!iso) return '';
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

export const ETIQUETAS = {
  inscripcion: 'Inscripción',
  en_curso: 'En curso',
  finalizado: 'Finalizado',
  programado: 'Programado',
  jugado: 'Jugado',
  postergado: 'Postergado',
  cancelado: 'Cancelado',
  grado: 'Grado',
  posgrado: 'Posgrado',
  docente: 'Docente',
  funcionario: 'Funcionario',
  sintetico: 'Sintético',
  parquet: 'Parquet',
  roja: 'Roja',
  acumulacion_amarillas: 'Acumulación de amarillas',
  disciplinaria: 'Disciplinaria',
};

export function etiqueta(estado) {
  return `<span class="etiqueta ${escapar(estado)}">${escapar(ETIQUETAS[estado] ?? estado)}</span>`;
}

/** Carga los torneos en un <select> y deja elegido el que está en curso (o el más reciente). */
export async function cargarSelectTorneos(select) {
  const torneos = await api('/torneos');
  llenarSelect(select, torneos, (t) => t.id_torneo, (t) => `${t.nombre} (${ETIQUETAS[t.estado]})`);
  const guardado = sessionStorage.getItem('torneo');
  const enCurso = torneos.find((t) => t.estado === 'en_curso');
  if (guardado && torneos.some((t) => String(t.id_torneo) === guardado)) select.value = guardado;
  else if (enCurso) select.value = enCurso.id_torneo;
  select.addEventListener('change', () => sessionStorage.setItem('torneo', select.value));
  return torneos;
}
