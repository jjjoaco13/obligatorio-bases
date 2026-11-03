import {
  api, avisar, avisarError, cargarFormulario, datosFormulario, escapar, ETIQUETAS,
  iniciarPagina, llenarSelect,
} from './comun.js';

iniciarPagina(['administrador']);

const tabla = document.getElementById('tabla');
const dialogo = document.getElementById('dialogo');
const form = document.getElementById('form');
const panelCanchas = document.getElementById('panel-canchas');
const tablaCanchas = document.getElementById('canchas');
const formCancha = document.getElementById('form-cancha');

let complejos = [];
let canchas = [];
let seleccionado = null;
let editando = null;

async function cargar() {
  try {
    complejos = await api('/complejos');
    tabla.innerHTML = complejos.length ? complejos.map((c) => `
      <tr class="${c.id_complejo === seleccionado?.id_complejo ? 'seleccionado' : ''}">
        <td><strong>${escapar(c.nombre)}</strong></td>
        <td>${escapar(c.direccion)}</td>
        <td>${escapar(c.departamento)}</td>
        <td class="numero">${c.cantidad_canchas}</td>
        <td class="acciones">
          <button class="chico" data-canchas="${c.id_complejo}">Canchas</button>
          <button class="chico secundario" data-editar="${c.id_complejo}">Editar</button>
          <button class="chico peligro" data-eliminar="${c.id_complejo}">Eliminar</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="5" class="vacio">No hay complejos.</td></tr>';
    if (seleccionado) {
      seleccionado = complejos.find((c) => c.id_complejo === seleccionado.id_complejo) ?? null;
      if (seleccionado) await cargarCanchas(); else panelCanchas.hidden = true;
    }
  } catch (e) {
    avisarError(e);
  }
}

async function cargarCanchas() {
  canchas = await api(`/canchas?complejo=${seleccionado.id_complejo}`);
  panelCanchas.hidden = false;
  document.getElementById('titulo-canchas').textContent = `Canchas de ${seleccionado.nombre}`;
  tablaCanchas.innerHTML = canchas.length ? canchas.map((c, i) => `
    <tr>
      <td>${escapar(c.nombre_cancha)}</td>
      <td>
        <select data-superficie="${i}">
          <option value="sintetico" ${c.superficie === 'sintetico' ? 'selected' : ''}>${ETIQUETAS.sintetico}</option>
          <option value="parquet" ${c.superficie === 'parquet' ? 'selected' : ''}>${ETIQUETAS.parquet}</option>
        </select>
      </td>
      <td><input type="checkbox" data-techada="${i}" ${c.techada ? 'checked' : ''} aria-label="Techada"></td>
      <td class="acciones"><button class="chico peligro" data-eliminar-cancha="${i}">Eliminar</button></td>
    </tr>`).join('') : '<tr><td colspan="4" class="vacio">El complejo no tiene canchas.</td></tr>';
}

function rutaCancha(cancha) {
  return `/complejos/${cancha.id_complejo}/canchas/${encodeURIComponent(cancha.nombre_cancha)}`;
}

function abrir(complejo) {
  editando = complejo?.id_complejo ?? null;
  form.reset();
  document.getElementById('titulo-dialogo').textContent = complejo ? 'Editar complejo' : 'Nuevo complejo';
  if (complejo) cargarFormulario(form, complejo);
  dialogo.showModal();
}

document.getElementById('nuevo').addEventListener('click', () => abrir(null));
dialogo.querySelector('[data-cerrar]').addEventListener('click', () => dialogo.close());

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!form.reportValidity()) return;
  try {
    const datos = datosFormulario(form);
    if (editando) await api(`/complejos/${editando}`, { method: 'PUT', body: datos });
    else await api('/complejos', { method: 'POST', body: datos });
    avisar('Complejo guardado.');
    dialogo.close();
    cargar();
  } catch (e) {
    avisarError(e);
  }
});

tabla.addEventListener('click', async (evento) => {
  const { canchas: verCanchas, editar, eliminar } = evento.target.dataset;
  try {
    if (verCanchas) {
      seleccionado = complejos.find((c) => c.id_complejo === Number(verCanchas));
      await cargar();
    }
    if (editar) abrir(complejos.find((c) => c.id_complejo === Number(editar)));
    if (eliminar && confirm('¿Eliminar este complejo?')) {
      await api(`/complejos/${eliminar}`, { method: 'DELETE' });
      if (seleccionado?.id_complejo === Number(eliminar)) seleccionado = null;
      avisar('Complejo eliminado.');
      cargar();
    }
  } catch (e) {
    avisarError(e);
  }
});

formCancha.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!formCancha.reportValidity()) return;
  try {
    await api(`/complejos/${seleccionado.id_complejo}/canchas`, { method: 'POST', body: datosFormulario(formCancha) });
    formCancha.reset();
    avisar('Cancha agregada.');
    cargar();
  } catch (e) {
    avisarError(e);
  }
});

// Cambiar superficie o techada guarda en el momento
tablaCanchas.addEventListener('change', async (evento) => {
  const indice = evento.target.dataset.superficie ?? evento.target.dataset.techada;
  if (indice === undefined) return;
  const fila = evento.target.closest('tr');
  const cancha = canchas[indice];
  try {
    await api(rutaCancha(cancha), {
      method: 'PUT',
      body: {
        superficie: fila.querySelector('[data-superficie]').value,
        techada: fila.querySelector('[data-techada]').checked,
      },
    });
    avisar('Cancha actualizada.');
  } catch (e) {
    avisarError(e);
    cargarCanchas();
  }
});

tablaCanchas.addEventListener('click', async (evento) => {
  const indice = evento.target.dataset.eliminarCancha;
  if (indice === undefined || !confirm('¿Eliminar esta cancha?')) return;
  try {
    await api(rutaCancha(canchas[indice]), { method: 'DELETE' });
    avisar('Cancha eliminada.');
    cargar();
  } catch (e) {
    avisarError(e);
  }
});

const departamentos = await api('/departamentos');
llenarSelect(document.getElementById('form-departamento'), departamentos, (d) => d, (d) => d, 'Elegir…');
cargar();
