import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { styles } from '@/common/styles';
import { api } from '@/common/api';
import Button from '@/components/Button';

export default function Jugadores() {
  const [jugadores, setJugadores] = useState([]);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    api('/jugadores')
      .then(setJugadores)
      .catch((e) => setError(e.message));
  }, []);
  useFocusEffect(cargar);

  async function eliminar(ci) {
    setError(null);
    try {
      await api(`/jugadores/${ci}`, 'DELETE');
      cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button title="Nuevo jugador" onPress={() => router.push('/jugadores/form')} />
      {error && <Text style={styles.errorText}>{error}</Text>}

      {jugadores.map((j) => (
        <View key={j.ci} style={styles.card}>
          <Text style={styles.subtitleText}>{j.apellido}, {j.nombre}</Text>
          <Text style={styles.smallText}>CI {j.ci} · {j.email}</Text>
          <Text style={styles.smallText}>{j.facultad} · {j.tipo} · nacido el {j.fecha_nacimiento}</Text>
          <View style={styles.row}>
            <Button
              title="Editar"
              style={styles.secondaryButton}
              onPress={() => router.push(`/jugadores/form?ci=${j.ci}`)}
            />
            <Button title="Eliminar" style={styles.dangerButton} onPress={() => eliminar(j.ci)} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
