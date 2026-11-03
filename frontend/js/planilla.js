import {
  api, avisar, avisarError, datosFormulario, escapar, etiqueta, formatearFecha, iniciarPagina,
  llenarSelect,
} from './comun.js';

iniciarPagina();

const idPartido = new URLSearchParams(location.search).get('partido');
if (!idPartido) location.href = 'partidos.html';

const ruta = `/partidos/${idPartido}`;
const formGol = document.getElementById('form-gol');
const formTarjeta = document.getElementById('form-tarjeta');
let planilla = null;

function nombreEquipo(idEquipo) {
  const p = planilla.partido;
  return idEquipo === p.id_equipo_local ? p.equipo_local : p.equipo_visitante;
}

async function cargar() {
  try {
    planilla = await api(`${ruta}/planilla`);
    pintar();
  } catch (e) {
    avisarError(e);
  }
}

function pintar() {
  const { partido: p, editable, motivo, jugadores, goles, tarjetas } = planilla;

  document.getElementById('marcador').innerHTML = `
    <div class="equipo">${escapar(p.equipo_local)}</div>
    <div class="goles">${p.goles_local} - ${p.goles_visitante}</div>
    <div class="equipo visitante">${escapar(p.equipo_visitante)}</div>
    <div class="detalle">
      Fecha ${p.numero_fecha} · ${formatearFecha(p.dia)} · ${p.hora_inicio} a ${p.hora_fin} ·
      ${escapar(p.complejo)}, ${escapar(p.nombre_cancha)} · ${etiqueta(p.estado)}
    </div>`;

  const aviso = document.getElementById('aviso');
  aviso.hidden = editable;
  aviso.textContent = editable ? '' : `La planilla no puede modificarse: ${motivo}`;
  document.querySelectorAll('.editable').forEach((f) => { f.hidden = !editable; });
  document.getElementById('marcar-jugado').hidden = !(editable && p.estado === 'programado');

  // Planteles de ambos equipos: se marca quién juega
  for (const [lado, idEquipo, nombre] of [
    ['local', p.id_equipo_local, p.equipo_local],
    ['visitante', p.id_equipo_visitante, p.equipo_visitante],
  ]) {
    const delEquipo = jugadores.filter((j) => j.id_equipo === idEquipo);
    const enCancha = delEquipo.filter((j) => j.en_planilla).length;
    document.getElementById(`titulo-${lado}`).textContent = `${nombre} (${enCancha} en planilla)`;
    document.getElementById(`plantel-${lado}`).innerHTML = delEquipo.map((j) => `
      <li>
        <span class="camiseta">${j.numero_camiseta}</span>
        <span class="nombre">${escapar(j.nombre)} ${escapar(j.apellido)}
          ${j.suspendido ? '<span class="etiqueta suspendido">Suspendido</span>' : ''}
        </span>
        <label class="check">
          <input type="checkbox" data-ci="${escapar(j.ci)}" ${j.en_planilla ? 'checked' : ''}
            ${!editable || (j.suspendido && !j.en_planilla) ? 'disabled' : ''}>
          Juega
        </label>
      </li>`).join('') || '<li class="vacio">Sin jugadores.</li>';
  }

  document.getElementById('goles').innerHTML = goles.map((g) => `
    <tr>
      <td>${g.minuto}'</td>
      <td>${escapar(g.nombre)} ${escapar(g.apellido)} ${g.autogol ? '<span class="etiqueta cancelado">en contra</span>' : ''}</td>
      <td>${escapar(nombreEquipo(g.id_equipo))}</td>
      <td class="acciones">${editable ? `<button class="chico peligro" data-gol="${g.id_gol}">Quitar</button>` : ''}</td>
    </tr>`).join('') || '<tr><td colspan="4" class="vacio">Sin goles.</td></tr>';

  document.getElementById('tarjetas').innerHTML = tarjetas.map((t) => `
    <tr>
      <td>${t.minuto}'</td>
      <td><span class="tarjeta-icono ${t.color}" title="${t.color}"></span></td>
      <td>${escapar(t.nombre)} ${escapar(t.apellido)}</td>
      <td>${escapar(nombreEquipo(t.id_equipo))}</td>
      <td class="acciones">${editable ? `<button class="chico peligro" data-tarjeta="${t.id_tarjeta}">Quitar</button>` : ''}</td>
    </tr>`).join('') || '<tr><td colspan="5" class="vacio">Sin tarjetas.</td></tr>';

  // Solo los jugadores en planilla pueden convertir goles o recibir tarjetas
  const enPlanilla = jugadores.filter((j) => j.en_planilla);
  document.querySelectorAll('.select-en-planilla').forEach((select) => {
    llenarSelect(select, enPlanilla, (j) => j.ci,
      (j) => `#${j.numero_camiseta} ${j.nombre} ${j.apellido} (${nombreEquipo(j.id_equipo)})`, 'Elegir…');
  });
}

async function ejecutar(promesa, mensaje) {
  try {
    const respuesta = await promesa;
    avisar(mensaje(respuesta));
  } catch (e) {
    avisarError(e);
  }
  cargar();
}

document.querySelector('main').addEventListener('change', (evento) => {
  const ci = evento.target.dataset.ci;
  if (!ci) return;
  ejecutar(
    evento.target.checked
      ? api(`${ruta}/planilla`, { method: 'POST', body: { ci_jugador: ci } })
      : api(`${ruta}/planilla/${ci}`, { method: 'DELETE' }),
    () => (evento.target.checked ? 'Jugador agregado a la planilla.' : 'Jugador quitado de la planilla.'),
  );
});

document.querySelector('main').addEventListener('click', (evento) => {
  const { gol, tarjeta } = evento.target.dataset;
  if (gol && confirm('¿Quitar este gol?')) {
    ejecutar(api(`/goles/${gol}`, { method: 'DELETE' }), () => 'Gol eliminado.');
  }
  if (tarjeta && confirm('¿Quitar esta tarjeta? Si generó una sanción, también se anula.')) {
    ejecutar(api(`/tarjetas/${tarjeta}`, { method: 'DELETE' }), () => 'Tarjeta eliminada.');
  }
});

formGol.addEventListener('submit', (evento) => {
  evento.preventDefault();
  if (!formGol.reportValidity()) return;
  ejecutar(api(`${ruta}/goles`, { method: 'POST', body: datosFormulario(formGol) }), () => 'Gol registrado.');
  formGol.reset();
});

formTarjeta.addEventListener('submit', (evento) => {
  evento.preventDefault();
  if (!formTarjeta.reportValidity()) return;
  ejecutar(
    api(`${ruta}/tarjetas`, { method: 'POST', body: datosFormulario(formTarjeta) }),
    (r) => (r.sancion ? 'Tarjeta registrada. Se generó una sanción automática de 1 fecha.' : 'Tarjeta registrada.'),
  );
  formTarjeta.reset();
});

document.getElementById('marcar-jugado').addEventListener('click', () => {
  if (!confirm('¿Cerrar la planilla y marcar el partido como jugado?')) return;
  ejecutar(api(`${ruta}/estado`, { method: 'PATCH', body: { estado: 'jugado' } }), () => 'Partido marcado como jugado.');
});

cargar();
