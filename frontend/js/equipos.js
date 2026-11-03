import {
  api, avisar, avisarError, cargarSelectTorneos, datosFormulario, escapar, ETIQUETAS,
  iniciarPagina, llenarSelect,
} from './comun.js';

iniciarPagina(['administrador']);

const selectTorneo = document.getElementById('torneo');
const tabla = document.getElementById('tabla');
const dialogo = document.getElementById('dialogo');
const form = document.getElementById('form');
const panelPlantel = document.getElementById('panel-plantel');
const listaPlantel = document.getElementById('plantel');
const formPlantel = document.getElementById('form-plantel');

let equipos = [];
let seleccionado = null; // equipo cuyo plantel se está viendo
let plantel = [];
let editando = null;

async function cargarEquipos() {
  try {
    equipos = await api(`/equipos?torneo=${selectTorneo.value}`);
    tabla.innerHTML = equipos.length ? equipos.map((e) => `
      <tr class="${e.id_equipo === seleccionado?.id_equipo ? 'seleccionado' : ''}">
        <td><strong>${escapar(e.nombre)}</strong></td>
        <td>${escapar(e.facultad)}</td>
        <td>${escapar(e.capitan ?? '—')}</td>
        <td class="numero">${e.cantidad_jugadores}</td>
        <td class="acciones">
          <button class="chico" data-plantel="${e.id_equipo}">Plantel</button>
          <button class="chico secundario" data-editar="${e.id_equipo}">Editar</button>
          <button class="chico peligro" data-eliminar="${e.id_equipo}">Eliminar</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="5" class="vacio">No hay equipos en este torneo.</td></tr>';
    if (seleccionado) {
      seleccionado = equipos.find((e) => e.id_equipo === seleccionado.id_equipo) ?? null;
      if (seleccionado) await cargarPlantel(); else panelPlantel.hidden = true;
    }
  } catch (e) {
    avisarError(e);
  }
}

async function cargarPlantel() {
  plantel = await api(`/equipos/${seleccionado.id_equipo}/plantel`);
  const editable = seleccionado.estado_torneo === 'inscripcion';
  panelPlantel.hidden = false;
  document.getElementById('titulo-plantel').textContent =
    `Plantel de ${seleccionado.nombre} (${plantel.length}/10)`;
  document.getElementById('aviso-plantel').hidden = editable;
  formPlantel.hidden = !editable || plantel.length >= 10;

  listaPlantel.innerHTML = plantel.length ? plantel.map((j) => `
    <li>
      <span class="camiseta">${j.numero_camiseta}</span>
      <span class="nombre">${escapar(j.nombre)} ${escapar(j.apellido)}
        ${j.es_capitan ? '<span class="etiqueta jugado">Capitán</span>' : ''}
        ${['docente', 'funcionario'].includes(j.tipo) ? `<span class="etiqueta">${ETIQUETAS[j.tipo]}</span>` : ''}
      </span>
      ${editable ? `<button class="chico peligro" data-quitar="${escapar(j.ci)}">Quitar</button>` : ''}
    </li>`).join('') : '<li class="vacio">El plantel está vacío.</li>';

  if (editable) {
    // Candidatos: jugadores de la misma facultad que no están en este plantel
    const jugadores = await api(`/jugadores?facultad=${seleccionado.id_facultad}`);
    const enPlantel = new Set(plantel.map((j) => j.ci));
    const candidatos = jugadores.filter((j) => !enPlantel.has(j.ci));
    llenarSelect(document.getElementById('select-jugador'), candidatos, (j) => j.ci,
      (j) => `${j.apellido}, ${j.nombre} (${ETIQUETAS[j.tipo]})`, 'Elegir jugador…');
    const usados = new Set(plantel.map((j) => j.numero_camiseta));
    let libre = 1;
    while (usados.has(libre)) libre++;
    formPlantel.elements.numero_camiseta.value = libre;
  }
}

async function abrir(equipo) {
  editando = equipo?.id_equipo ?? null;
  form.reset();
  document.getElementById('titulo-dialogo').textContent = equipo ? 'Editar equipo' : 'Nuevo equipo';
  document.getElementById('campo-capitan').hidden = !equipo;
  if (equipo) {
    form.elements.nombre.value = equipo.nombre;
    form.elements.id_facultad.value = equipo.id_facultad;
    const jugadores = await api(`/equipos/${equipo.id_equipo}/plantel`);
    llenarSelect(document.getElementById('form-capitan'), jugadores, (j) => j.ci,
      (j) => `${j.nombre} ${j.apellido} (#${j.numero_camiseta})`, 'Sin capitán');
    form.elements.ci_capitan.value = equipo.ci_capitan ?? '';
  }
  dialogo.showModal();
}

document.getElementById('nuevo').addEventListener('click', () => abrir(null).catch(avisarError));
dialogo.querySelector('[data-cerrar]').addEventListener('click', () => dialogo.close());

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!form.reportValidity()) return;
  const datos = datosFormulario(form);
  try {
    if (editando) {
      await api(`/equipos/${editando}`, { method: 'PUT', body: datos });
    } else {
      await api('/equipos', { method: 'POST', body: { ...datos, id_torneo: selectTorneo.value } });
    }
    avisar('Equipo guardado.');
    dialogo.close();
    cargarEquipos();
  } catch (e) {
    avisarError(e);
  }
});

tabla.addEventListener('click', async (evento) => {
  const { plantel: verPlantel, editar, eliminar } = evento.target.dataset;
  try {
    if (verPlantel) {
      seleccionado = equipos.find((e) => e.id_equipo === Number(verPlantel));
      await cargarEquipos();
    }
    if (editar) await abrir(equipos.find((e) => e.id_equipo === Number(editar)));
    if (eliminar && confirm('¿Eliminar el equipo y su plantel?')) {
      await api(`/equipos/${eliminar}`, { method: 'DELETE' });
      if (seleccionado?.id_equipo === Number(eliminar)) seleccionado = null;
      avisar('Equipo eliminado.');
      cargarEquipos();
    }
  } catch (e) {
    avisarError(e);
  }
});

formPlantel.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!formPlantel.reportValidity()) return;
  try {
    await api(`/equipos/${seleccionado.id_equipo}/plantel`, { method: 'POST', body: datosFormulario(formPlantel) });
    avisar('Jugador agregado al plantel.');
    cargarEquipos();
  } catch (e) {
    avisarError(e);
  }
});

listaPlantel.addEventListener('click', async (evento) => {
  const ci = evento.target.dataset.quitar;
  if (!ci || !confirm('¿Quitar al jugador del plantel?')) return;
  try {
    await api(`/equipos/${seleccionado.id_equipo}/plantel/${ci}`, { method: 'DELETE' });
    avisar('Jugador quitado del plantel.');
    cargarEquipos();
  } catch (e) {
    avisarError(e);
  }
});

selectTorneo.addEventListener('change', () => {
  seleccionado = null;
  panelPlantel.hidden = true;
  cargarEquipos();
});

const facultades = await api('/facultades');
llenarSelect(document.getElementById('form-facultad'), facultades, (f) => f.id_facultad, (f) => f.nombre);
await cargarSelectTorneos(selectTorneo);
cargarEquipos();
