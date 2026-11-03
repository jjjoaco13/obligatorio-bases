import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { styles } from '@/common/styles';
import { api } from '@/common/api';
import { esAdmin } from '@/common/sesion';
import Button from '@/components/Button';
import SelectorTorneo from '@/components/SelectorTorneo';

export default function Partidos() {
  const [torneo, setTorneo] = useState(null);
  const [partidos, setPartidos] = useState([]);
  const [error, setError] = useState(null);

  // Se recarga cada vez que se vuelve a esta pantalla (por ejemplo, después de editar un partido)
  const cargar = useCallback(() => {
    if (!torneo) return;
    api(`/partidos?torneo=${torneo}`)
      .then(setPartidos)
      .catch((e) => setError(e.message));
  }, [torneo]);
  useFocusEffect(cargar);

  async function eliminar(id) {
    setError(null);
    try {
      await api(`/partidos/${id}`, 'DELETE');
      cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SelectorTorneo valor={torneo} onChange={setTorneo} />
      {esAdmin() && (
        <Button title="Programar partido" onPress={() => router.push(`/partidos/form?torneo=${torneo}`)} />
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
      {partidos.length === 0 && <Text style={styles.normalText}>No hay partidos.</Text>}

      {partidos.map((p) => (
        <View key={p.id_partido} style={styles.card}>
          <Text style={styles.smallText}>
            Fecha {p.numero_fecha} · {p.dia} · {p.hora_inicio} · {p.complejo}, {p.nombre_cancha}
          </Text>
          <Text style={styles.subtitleText}>
            {p.equipo_local} {p.goles_local} - {p.goles_visitante} {p.equipo_visitante}
          </Text>
          <Text style={styles.normalText}>Estado: {p.estado}</Text>
          <View style={styles.row}>
            {(p.estado === 'programado' || p.estado === 'jugado') && (
              <Button title="Planilla" onPress={() => router.push(`/partidos/${p.id_partido}`)} />
            )}
            {esAdmin() && p.estado !== 'jugado' && (
              <>
                <Button
                  title="Editar"
                  style={styles.secondaryButton}
                  onPress={() => router.push(`/partidos/form?torneo=${torneo}&id=${p.id_partido}`)}
                />
                <Button title="Eliminar" style={styles.dangerButton} onPress={() => eliminar(p.id_partido)} />
              </>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
