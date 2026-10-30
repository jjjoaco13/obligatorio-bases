import { api, avisarError, cargarSelectTorneos, escapar, ETIQUETAS, iniciarPagina } from './comun.js';

iniciarPagina(['administrador']);

const selectTorneo = document.getElementById('torneo');
const contenedor = document.getElementById('reportes');

// Reportes que se muestran a todo el ancho por tener muchas columnas
const ANCHOS = ['posiciones'];

function celda(valor) {
  if (valor === null || valor === undefined) return '—';
  if (typeof valor === 'number') return valor;
  return escapar(ETIQUETAS[valor] ?? valor);
}

function tablaReporte({ columnas, filas }) {
  if (!filas.length) return '<p class="vacio">Sin datos para este torneo.</p>';
  const esNumero = filas[0].map((v) => typeof v === 'number');
  return `
    <div class="tabla-contenedor">
      <table>
        <thead><tr>${columnas.map((c, i) => `<th class="${esNumero[i] ? 'numero' : ''}">${escapar(c)}</th>`).join('')}</tr></thead>
        <tbody>
          ${filas.map((fila) => `<tr>${fila.map((v, i) => `<td class="${esNumero[i] ? 'numero' : ''}">${celda(v)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function cargar() {
  try {
    const lista = await api('/reportes');
    contenedor.innerHTML = lista.map((r) => `
      <section class="panel ${ANCHOS.includes(r.clave) ? 'ancho' : ''}" id="reporte-${r.clave}">
        <h2>${escapar(r.titulo)}</h2>
        <p class="vacio">Cargando…</p>
      </section>`).join('');

    await Promise.all(lista.map(async (r) => {
      const seccion = document.getElementById(`reporte-${r.clave}`);
      try {
        const datos = await api(`/reportes/${r.clave}?torneo=${selectTorneo.value}`);
        seccion.innerHTML = `<h2>${escapar(r.titulo)}</h2>${tablaReporte(datos)}`;
      } catch (e) {
        seccion.innerHTML = `<h2>${escapar(r.titulo)}</h2><p class="aviso">${escapar(e.message)}</p>`;
      }
    }));
  } catch (e) {
    avisarError(e);
  }
}

selectTorneo.addEventListener('change', cargar);

await cargarSelectTorneos(selectTorneo);
cargar();
