import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { styles } from '@/common/styles';
import { api } from '@/common/api';
import Button from '@/components/Button';

export default function Torneos() {
  const [torneos, setTorneos] = useState([]);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    api('/torneos')
      .then(setTorneos)
      .catch((e) => setError(e.message));
  }, []);
  useFocusEffect(cargar);

  async function eliminar(id) {
    setError(null);
    try {
      await api(`/torneos/${id}`, 'DELETE');
      cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button title="Nueva edición" onPress={() => router.push('/torneos/form')} />
      {error && <Text style={styles.errorText}>{error}</Text>}

      {torneos.map((t) => (
        <View key={t.id_torneo} style={styles.card}>
          <Text style={styles.subtitleText}>{t.nombre}</Text>
          <Text style={styles.smallText}>
            {t.anio} - semestre {t.semestre} · del {t.fecha_inicio} al {t.fecha_fin}
          </Text>
          <Text style={styles.normalText}>Estado: {t.estado}</Text>
          <View style={styles.row}>
            <Button
              title="Editar"
              style={styles.secondaryButton}
              onPress={() => router.push(`/torneos/form?id=${t.id_torneo}`)}
            />
            <Button title="Eliminar" style={styles.dangerButton} onPress={() => eliminar(t.id_torneo)} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
