import {
  api, avisar, avisarError, cargarSelectTorneos, datosFormulario, escapar, esAdmin, etiqueta,
  formatearFecha, iniciarPagina, llenarSelect,
} from './comun.js';

iniciarPagina();

const admin = esAdmin();
const selectTorneo = document.getElementById('torneo');
const selectFecha = document.getElementById('fecha');
const tabla = document.getElementById('tabla');
const dialogo = document.getElementById('dialogo');
const form = document.getElementById('form');

let torneos = [];
let partidos = [];
let editando = null;

document.getElementById('nuevo').hidden = !admin;

function torneoActual() {
  return torneos.find((t) => String(t.id_torneo) === selectTorneo.value);
}

async function cargar() {
  try {
    partidos = await api(`/partidos?torneo=${selectTorneo.value}`);
    const fechas = [...new Set(partidos.map((p) => p.numero_fecha))];
    const elegida = selectFecha.value;
    llenarSelect(selectFecha, fechas, (f) => f, (f) => `Fecha ${f}`, 'Todas');
    if (fechas.includes(Number(elegida))) selectFecha.value = elegida;
    pintar();
  } catch (e) {
    avisarError(e);
  }
}

function pintar() {
  const visibles = partidos.filter((p) => !selectFecha.value || p.numero_fecha === Number(selectFecha.value));
  if (!visibles.length) {
    tabla.innerHTML = '<tr><td colspan="9" class="vacio">No hay partidos programados.</td></tr>';
    return;
  }
  tabla.innerHTML = visibles.map((p) => {
    const conPlanilla = ['programado', 'jugado'].includes(p.estado);
    const resultado = p.estado === 'jugado' || p.goles_local + p.goles_visitante > 0
      ? `<strong>${p.goles_local} - ${p.goles_visitante}</strong>` : '—';
    return `
      <tr>
        <td>${p.numero_fecha}</td>
        <td>${formatearFecha(p.dia)}</td>
        <td>${p.hora_inicio}</td>
        <td>${escapar(p.complejo)} · ${escapar(p.nombre_cancha)}</td>
        <td>${escapar(p.equipo_local)}</td>
        <td class="numero">${resultado}</td>
        <td>${escapar(p.equipo_visitante)}</td>
        <td>${etiqueta(p.estado)}</td>
        <td class="acciones">
          ${conPlanilla ? `<a class="boton chico" href="planilla.html?partido=${p.id_partido}">Planilla</a>` : ''}
          ${admin && p.estado !== 'jugado' ? `
            <button class="chico secundario" data-editar="${p.id_partido}">Editar</button>
            <button class="chico peligro" data-eliminar="${p.id_partido}">Eliminar</button>` : ''}
        </td>
      </tr>`;
  }).join('');
}

async function prepararFormulario() {
  const torneo = torneoActual();
  const [equipos, turnos, canchas] = await Promise.all([
    api(`/equipos?torneo=${torneo.id_torneo}`), api('/turnos'), api('/canchas'),
  ]);
  const textoEquipo = (e) => `${e.nombre} (${e.cantidad_jugadores} jug.)`;
  llenarSelect(document.getElementById('form-local'), equipos, (e) => e.id_equipo, textoEquipo, 'Elegir…');
  llenarSelect(document.getElementById('form-visitante'), equipos, (e) => e.id_equipo, textoEquipo, 'Elegir…');
  llenarSelect(document.getElementById('form-turno'), turnos, (t) => t.id_turno, (t) => `${t.hora_inicio} a ${t.hora_fin}`);
  llenarSelect(document.getElementById('form-cancha'), canchas, (c) => `${c.id_complejo}|${c.nombre_cancha}`,
    (c) => `${c.complejo} · ${c.nombre_cancha}`, 'Elegir…');
  const dia = document.getElementById('form-dia');
  dia.min = torneo.fecha_inicio;
  dia.max = torneo.fecha_fin;
}

async function abrir(partido) {
  editando = partido?.id_partido ?? null;
  await prepararFormulario();
  form.reset();
  document.getElementById('titulo-dialogo').textContent = partido ? 'Editar partido' : 'Programar partido';
  if (partido) {
    for (const campo of ['numero_fecha', 'estado', 'id_equipo_local', 'id_equipo_visitante', 'dia', 'id_turno']) {
      form.elements[campo].value = partido[campo];
    }
    form.elements.cancha.value = `${partido.id_complejo}|${partido.nombre_cancha}`;
  } else if (selectFecha.value) {
    form.elements.numero_fecha.value = selectFecha.value;
  }
  dialogo.showModal();
}

// Un equipo no puede enfrentarse a sí mismo
form.addEventListener('change', () => {
  const { id_equipo_local: local, id_equipo_visitante: visitante } = form.elements;
  visitante.setCustomValidity(local.value && local.value === visitante.value
    ? 'Un equipo no puede enfrentarse a sí mismo.' : '');
});

document.getElementById('nuevo').addEventListener('click', () => abrir(null).catch(avisarError));
dialogo.querySelector('[data-cerrar]').addEventListener('click', () => dialogo.close());

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!form.reportValidity()) return;
  const { cancha, ...datos } = datosFormulario(form);
  const separador = cancha.indexOf('|');
  datos.id_complejo = cancha.slice(0, separador);
  datos.nombre_cancha = cancha.slice(separador + 1);
  datos.id_torneo = selectTorneo.value;
  try {
    if (editando) await api(`/partidos/${editando}`, { method: 'PUT', body: datos });
    else await api('/partidos', { method: 'POST', body: datos });
    avisar('Partido guardado.');
    dialogo.close();
    cargar();
  } catch (e) {
    avisarError(e);
  }
});

tabla.addEventListener('click', async (evento) => {
  const { editar, eliminar } = evento.target.dataset;
  try {
    if (editar) await abrir(partidos.find((p) => p.id_partido === Number(editar)));
    if (eliminar && confirm('¿Eliminar este partido?')) {
      await api(`/partidos/${eliminar}`, { method: 'DELETE' });
      avisar('Partido eliminado.');
      cargar();
    }
  } catch (e) {
    avisarError(e);
  }
});

selectTorneo.addEventListener('change', () => {
  selectFecha.value = '';
  cargar();
});
selectFecha.addEventListener('change', pintar);

torneos = await cargarSelectTorneos(selectTorneo);
cargar();
