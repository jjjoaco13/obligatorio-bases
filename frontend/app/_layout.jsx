import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Ingresar' }} />
        <Stack.Screen name="menu" options={{ title: 'Torneo Interfacultades', headerBackVisible: false }} />
        <Stack.Screen name="partidos/index" options={{ title: 'Partidos' }} />
        <Stack.Screen name="partidos/form" options={{ title: 'Partido' }} />
        <Stack.Screen name="partidos/[id]" options={{ title: 'Planilla' }} />
        <Stack.Screen name="equipos/index" options={{ title: 'Equipos' }} />
        <Stack.Screen name="equipos/[id]" options={{ title: 'Plantel' }} />
        <Stack.Screen name="jugadores/index" options={{ title: 'Jugadores' }} />
        <Stack.Screen name="jugadores/form" options={{ title: 'Jugador' }} />
        <Stack.Screen name="complejos/index" options={{ title: 'Complejos' }} />
        <Stack.Screen name="complejos/[id]" options={{ title: 'Complejo y canchas' }} />
        <Stack.Screen name="sanciones/index" options={{ title: 'Sanciones' }} />
        <Stack.Screen name="sanciones/form" options={{ title: 'Sanción' }} />
        <Stack.Screen name="torneos/index" options={{ title: 'Torneos' }} />
        <Stack.Screen name="torneos/form" options={{ title: 'Torneo' }} />
        <Stack.Screen name="reportes" options={{ title: 'Reportes' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
