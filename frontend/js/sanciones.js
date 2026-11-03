import {
  api, avisar, avisarError, cargarSelectTorneos, datosFormulario, escapar, ETIQUETAS,
  iniciarPagina, llenarSelect,
} from './comun.js';

iniciarPagina(['administrador']);

const selectTorneo = document.getElementById('torneo');
const tabla = document.getElementById('tabla');
const dialogo = document.getElementById('dialogo');
const form = document.getElementById('form');
let sanciones = [];
let editando = null;

async function cargar() {
  try {
    sanciones = await api(`/sanciones?torneo=${selectTorneo.value}`);
    tabla.innerHTML = sanciones.length ? sanciones.map((s) => `
      <tr>
        <td>${escapar(s.apellido)}, ${escapar(s.nombre)}</td>
        <td>${escapar(s.equipo)}</td>
        <td><span class="etiqueta ${s.motivo === 'disciplinaria' ? 'postergado' : 'cancelado'}">${ETIQUETAS[s.motivo]}</span></td>
        <td>${s.cantidad_fechas === 1 ? `Fecha ${s.numero_fecha_inicio}` : `Fechas ${s.numero_fecha_inicio} a ${s.numero_fecha_fin}`}</td>
        <td>${escapar(s.descripcion ?? (s.id_tarjeta ? 'Automática por tarjeta' : ''))}</td>
        <td class="acciones">
          <button class="chico secundario" data-editar="${s.id_sancion}">Editar</button>
          <button class="chico peligro" data-eliminar="${s.id_sancion}">Eliminar</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="6" class="vacio">No hay sanciones en este torneo.</td></tr>';
  } catch (e) {
    avisarError(e);
  }
}

async function abrir(sancion) {
  editando = sancion?.id_sancion ?? null;
  form.reset();
  document.getElementById('titulo-dialogo').textContent = sancion
    ? `Editar sanción de ${sancion.nombre} ${sancion.apellido}` : 'Sanción disciplinaria';
  document.getElementById('campo-jugador').hidden = Boolean(sancion);
  form.elements.ci_jugador.required = !sancion;
  // Las sanciones automáticas siempre duran una fecha
  form.elements.cantidad_fechas.disabled = Boolean(sancion) && sancion.motivo !== 'disciplinaria';
  if (sancion) {
    form.elements.numero_fecha_inicio.value = sancion.numero_fecha_inicio;
    form.elements.cantidad_fechas.value = sancion.cantidad_fechas;
    form.elements.descripcion.value = sancion.descripcion ?? '';
  } else {
    const inscriptos = await api(`/torneos/${selectTorneo.value}/inscriptos`);
    llenarSelect(document.getElementById('form-jugador'), inscriptos, (j) => j.ci,
      (j) => `${j.apellido}, ${j.nombre} (${j.equipo})`, 'Elegir jugador…');
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
    if (editando) await api(`/sanciones/${editando}`, { method: 'PUT', body: datos });
    else await api('/sanciones', { method: 'POST', body: { ...datos, id_torneo: selectTorneo.value } });
    avisar('Sanción guardada.');
    dialogo.close();
    cargar();
  } catch (e) {
    avisarError(e);
  }
});

tabla.addEventListener('click', async (evento) => {
  const { editar, eliminar } = evento.target.dataset;
  try {
    if (editar) await abrir(sanciones.find((s) => s.id_sancion === Number(editar)));
    if (eliminar && confirm('¿Eliminar esta sanción?')) {
      await api(`/sanciones/${eliminar}`, { method: 'DELETE' });
      avisar('Sanción eliminada.');
      cargar();
    }
  } catch (e) {
    avisarError(e);
  }
});

selectTorneo.addEventListener('change', cargar);

await cargarSelectTorneos(selectTorneo);
cargar();
