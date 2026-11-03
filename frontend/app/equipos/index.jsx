import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { styles } from '@/common/styles';
import { api } from '@/common/api';
import Button from '@/components/Button';
import Campo from '@/components/Campo';
import Selector from '@/components/Selector';
import SelectorTorneo from '@/components/SelectorTorneo';

export default function Equipos() {
  const [torneo, setTorneo] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [facultades, setFacultades] = useState([]);
  const [nuevo, setNuevo] = useState({ nombre: '', id_facultad: null });
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/facultades').then(setFacultades);
  }, []);

  const cargar = useCallback(() => {
    if (!torneo) return;
    api(`/equipos?torneo=${torneo}`)
      .then(setEquipos)
      .catch((e) => setError(e.message));
  }, [torneo]);
  useFocusEffect(cargar);

  async function crear() {
    setError(null);
    try {
      await api('/equipos', 'POST', { ...nuevo, id_torneo: torneo });
      setNuevo({ nombre: '', id_facultad: null });
      cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  async function eliminar(id) {
    setError(null);
    try {
      await api(`/equipos/${id}`, 'DELETE');
      cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SelectorTorneo valor={torneo} onChange={setTorneo} />
      {error && <Text style={styles.errorText}>{error}</Text>}

      {equipos.map((e) => (
        <View key={e.id_equipo} style={styles.card}>
          <Text style={styles.subtitleText}>{e.nombre}</Text>
          <Text style={styles.smallText}>
            {e.facultad} · {e.cantidad_jugadores} jugadores · Capitán: {e.capitan ?? 'sin designar'}
          </Text>
          <View style={styles.row}>
            <Button title="Ver plantel" onPress={() => router.push(`/equipos/${e.id_equipo}`)} />
            <Button title="Eliminar" style={styles.dangerButton} onPress={() => eliminar(e.id_equipo)} />
          </View>
        </View>
      ))}

      <View style={styles.card}>
        <Text style={styles.subtitleText}>Nuevo equipo</Text>
        <Campo
          etiqueta="Nombre"
          value={nuevo.nombre}
          onChangeText={(v) => setNuevo({ ...nuevo, nombre: v })}
          maxLength={100}
        />
        <Selector
          etiqueta="Facultad que representa"
          opciones={facultades.map((f) => ({ valor: f.id_facultad, texto: f.nombre }))}
          valor={nuevo.id_facultad}
          onChange={(v) => setNuevo({ ...nuevo, id_facultad: v })}
        />
        <Button title="Crear equipo" disabled={!nuevo.nombre.trim() || !nuevo.id_facultad} onPress={crear} />
      </View>
    </ScrollView>
  );
}
