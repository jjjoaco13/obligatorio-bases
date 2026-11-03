import {
  api, avisar, avisarError, cargarFormulario, datosFormulario, escapar, etiqueta,
  formatearFecha, iniciarPagina,
} from './comun.js';

iniciarPagina(['administrador']);

const tabla = document.getElementById('tabla');
const dialogo = document.getElementById('dialogo');
const form = document.getElementById('form');
let torneos = [];
let editando = null;

async function cargar() {
  try {
    torneos = await api('/torneos');
    tabla.innerHTML = torneos.length ? torneos.map((t) => `
      <tr>
        <td>${escapar(t.nombre)}</td>
        <td>${t.anio}</td>
        <td>${t.semestre}</td>
        <td>${formatearFecha(t.fecha_inicio)}</td>
        <td>${formatearFecha(t.fecha_fin)}</td>
        <td>${etiqueta(t.estado)}</td>
        <td class="acciones">
          <button class="chico secundario" data-editar="${t.id_torneo}">Editar</button>
          <button class="chico peligro" data-eliminar="${t.id_torneo}">Eliminar</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="7" class="vacio">No hay torneos.</td></tr>';
  } catch (e) {
    avisarError(e);
  }
}

function abrir(torneo) {
  editando = torneo?.id_torneo ?? null;
  form.reset();
  document.getElementById('titulo-dialogo').textContent = torneo ? 'Editar edición' : 'Nueva edición';
  if (torneo) cargarFormulario(form, torneo);
  dialogo.showModal();
}

document.getElementById('nuevo').addEventListener('click', () => abrir(null));
dialogo.querySelector('[data-cerrar]').addEventListener('click', () => dialogo.close());

// Validación cruzada de fechas en el navegador
form.addEventListener('input', () => {
  const { anio, fecha_inicio: inicio, fecha_fin: fin } = form.elements;
  fin.setCustomValidity(inicio.value && fin.value && fin.value < inicio.value
    ? 'La fecha de fin debe ser posterior a la de inicio.' : '');
  inicio.setCustomValidity(anio.value && inicio.value && !inicio.value.startsWith(anio.value)
    ? 'La fecha de inicio debe pertenecer al año del torneo.' : '');
});

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!form.reportValidity()) return;
  try {
    const datos = datosFormulario(form);
    if (editando) await api(`/torneos/${editando}`, { method: 'PUT', body: datos });
    else await api('/torneos', { method: 'POST', body: datos });
    avisar('Torneo guardado.');
    dialogo.close();
    cargar();
  } catch (e) {
    avisarError(e);
  }
});

tabla.addEventListener('click', async (evento) => {
  const { editar, eliminar } = evento.target.dataset;
  if (editar) abrir(torneos.find((t) => t.id_torneo === Number(editar)));
  if (eliminar && confirm('¿Eliminar este torneo?')) {
    try {
      await api(`/torneos/${eliminar}`, { method: 'DELETE' });
      avisar('Torneo eliminado.');
      cargar();
    } catch (e) {
      avisarError(e);
    }
  }
});

cargar();
