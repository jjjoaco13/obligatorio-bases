import {
  api, avisar, avisarError, cargarFormulario, datosFormulario, escapar, ETIQUETAS,
  formatearFecha, iniciarPagina, llenarSelect,
} from './comun.js';

iniciarPagina(['administrador']);

const tabla = document.getElementById('tabla');
const filtros = document.getElementById('filtros');
const dialogo = document.getElementById('dialogo');
const form = document.getElementById('form');
let jugadores = [];
let editando = null;

// La fecha de nacimiento no puede ser futura
document.getElementById('fecha-nacimiento').max = new Date().toISOString().slice(0, 10);

async function cargarFacultades() {
  const facultades = await api('/facultades');
  llenarSelect(document.getElementById('filtro-facultad'), facultades, (f) => f.id_facultad, (f) => f.nombre, 'Todas');
  llenarSelect(document.getElementById('form-facultad'), facultades, (f) => f.id_facultad, (f) => f.nombre);
}

async function cargar() {
  const { q, facultad } = datosFormulario(filtros);
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (facultad) params.set('facultad', facultad);
  try {
    jugadores = await api(`/jugadores?${params}`);
    pintar();
  } catch (e) {
    avisarError(e);
  }
}

function pintar() {
  if (!jugadores.length) {
    tabla.innerHTML = '<tr><td colspan="7" class="vacio">No hay jugadores.</td></tr>';
    return;
  }
  tabla.innerHTML = jugadores.map((j) => `
    <tr>
      <td>${escapar(j.ci)}</td>
      <td>${escapar(j.apellido)}, ${escapar(j.nombre)}</td>
      <td>${escapar(j.email)}</td>
      <td>${formatearFecha(j.fecha_nacimiento)}</td>
      <td>${escapar(j.facultad)}</td>
      <td>${ETIQUETAS[j.tipo]}</td>
      <td class="acciones">
        <button class="chico secundario" data-editar="${escapar(j.ci)}">Editar</button>
        <button class="chico peligro" data-eliminar="${escapar(j.ci)}">Eliminar</button>
      </td>
    </tr>`).join('');
}

function abrir(jugador) {
  editando = jugador?.ci ?? null;
  form.reset();
  document.getElementById('titulo-dialogo').textContent = jugador ? 'Editar jugador' : 'Nuevo jugador';
  form.elements.ci.readOnly = Boolean(jugador);
  if (jugador) cargarFormulario(form, jugador);
  dialogo.showModal();
}

document.getElementById('nuevo').addEventListener('click', () => abrir(null));
dialogo.querySelector('[data-cerrar]').addEventListener('click', () => dialogo.close());

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!form.reportValidity()) return;
  const datos = datosFormulario(form);
  try {
    if (editando) {
      await api(`/jugadores/${editando}`, { method: 'PUT', body: datos });
      avisar('Jugador actualizado.');
    } else {
      await api('/jugadores', { method: 'POST', body: datos });
      avisar('Jugador creado.');
    }
    dialogo.close();
    cargar();
  } catch (e) {
    avisarError(e);
  }
});

tabla.addEventListener('click', async (evento) => {
  const { editar, eliminar } = evento.target.dataset;
  if (editar) abrir(jugadores.find((j) => j.ci === editar));
  if (eliminar && confirm('¿Eliminar este jugador?')) {
    try {
      await api(`/jugadores/${eliminar}`, { method: 'DELETE' });
      avisar('Jugador eliminado.');
      cargar();
    } catch (e) {
      avisarError(e);
    }
  }
});

let espera;
filtros.addEventListener('input', () => {
  clearTimeout(espera);
  espera = setTimeout(cargar, 250);
});
filtros.addEventListener('submit', (evento) => evento.preventDefault());

await cargarFacultades();
cargar();
