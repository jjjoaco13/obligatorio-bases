import Constants from 'expo-constants';
import { router } from 'expo-router';
import { sesion } from './sesion';

// El backend corre en la misma computadora que Expo, en el puerto 5000.
// Desde el celular se usa la IP de la computadora (la misma que usa Expo).
const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
const API_URL = `http://${host}:5000/api`;

export async function api(ruta, metodo = 'GET', cuerpo = undefined) {
  const respuesta = await fetch(API_URL + ruta, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sesion.token}`,
    },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = await respuesta.json();

  // Sesión vencida o inexistente: volver al login
  if (respuesta.status === 401 && ruta !== '/login') {
    router.replace('/');
  }
  if (!respuesta.ok) {
    throw new Error(datos.error);
  }
  return datos;
}
