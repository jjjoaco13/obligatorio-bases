import { api, datosFormulario, guardarSesion, obtenerSesion } from './comun.js';

if (obtenerSesion()) location.href = 'partidos.html';

const form = document.getElementById('form-login');
const error = document.getElementById('error');

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  error.textContent = '';
  if (!form.checkValidity()) {
    error.textContent = 'Ingrese un correo válido y la contraseña.';
    return;
  }
  const boton = form.querySelector('button');
  boton.disabled = true;
  try {
    const sesion = await api('/login', { method: 'POST', body: datosFormulario(form) });
    guardarSesion(sesion);
    location.href = 'partidos.html';
  } catch (e) {
    error.textContent = e.message;
  } finally {
    boton.disabled = false;
  }
});
