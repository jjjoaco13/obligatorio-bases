import { ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { styles } from '@/common/styles';
import { cerrarSesion, esAdmin, sesion } from '@/common/sesion';
import Button from '@/components/Button';

// El planillero solo ve los partidos (para cargar planillas); el administrador ve todo
const OPCIONES = [
  { ruta: '/partidos', texto: 'Partidos y planillas', soloAdmin: false },
  { ruta: '/equipos', texto: 'Equipos y planteles', soloAdmin: true },
  { ruta: '/jugadores', texto: 'Jugadores', soloAdmin: true },
  { ruta: '/complejos', texto: 'Complejos y canchas', soloAdmin: true },
  { ruta: '/sanciones', texto: 'Sanciones', soloAdmin: true },
  { ruta: '/torneos', texto: 'Torneos', soloAdmin: true },
  { ruta: '/reportes', texto: 'Reportes', soloAdmin: true },
];

export default function Menu() {
  function salir() {
    cerrarSesion();
    router.replace('/');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.smallText}>
        {sesion.correo} ({sesion.rol})
      </Text>
      {OPCIONES.filter((opcion) => !opcion.soloAdmin || esAdmin()).map((opcion) => (
        <Button key={opcion.ruta} title={opcion.texto} onPress={() => router.push(opcion.ruta)} />
      ))}
      <Button title="Salir" style={styles.dangerButton} onPress={salir} />
    </ScrollView>
  );
}
