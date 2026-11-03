// Datos del usuario que inició sesión. Se guardan en memoria: al recargar la app hay que volver a entrar.
export const sesion = {
  token: null,
  correo: null,
  rol: null,
};

export function esAdmin() {
  return sesion.rol === 'administrador';
}

export function cerrarSesion() {
  sesion.token = null;
  sesion.correo = null;
  sesion.rol = null;
}
