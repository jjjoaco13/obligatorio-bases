import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { styles } from '@/common/styles';
import { api } from '@/common/api';
import Button from '@/components/Button';
import SelectorTorneo from '@/components/SelectorTorneo';

export default function Sanciones() {
  const [torneo, setTorneo] = useState(null);
  const [sanciones, setSanciones] = useState([]);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    if (!torneo) return;
    api(`/sanciones?torneo=${torneo}`)
      .then(setSanciones)
      .catch((e) => setError(e.message));
  }, [torneo]);
  useFocusEffect(cargar);

  async function eliminar(id) {
    setError(null);
    try {
      await api(`/sanciones/${id}`, 'DELETE');
      cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SelectorTorneo valor={torneo} onChange={setTorneo} />
      <Text style={styles.smallText}>
        Las sanciones por roja y por 3 amarillas se crean solas al cargar la planilla.
      </Text>
      <Button title="Nueva sanción disciplinaria" onPress={() => router.push(`/sanciones/form?torneo=${torneo}`)} />
      {error && <Text style={styles.errorText}>{error}</Text>}

      {sanciones.map((s) => (
        <View key={s.id_sancion} style={styles.card}>
          <Text style={styles.subtitleText}>{s.apellido}, {s.nombre}</Text>
          <Text style={styles.smallText}>{s.equipo} · {s.motivo}</Text>
          <Text style={styles.normalText}>
            Fechas {s.numero_fecha_inicio} a {s.numero_fecha_fin}
          </Text>
          {s.descripcion ? <Text style={styles.smallText}>{s.descripcion}</Text> : null}
          <View style={styles.row}>
            <Button
              title="Editar"
              style={styles.secondaryButton}
              onPress={() => router.push(`/sanciones/form?torneo=${torneo}&id=${s.id_sancion}`)}
            />
            <Button title="Eliminar" style={styles.dangerButton} onPress={() => eliminar(s.id_sancion)} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
