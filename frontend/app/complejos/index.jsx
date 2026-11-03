import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { styles } from '@/common/styles';
import { api } from '@/common/api';
import Button from '@/components/Button';
import Campo from '@/components/Campo';
import Selector from '@/components/Selector';

export default function Complejos() {
  const [complejos, setComplejos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [nuevo, setNuevo] = useState({ nombre: '', direccion: '', departamento: null });
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/departamentos').then(setDepartamentos);
  }, []);

  const cargar = useCallback(() => {
    api('/complejos')
      .then(setComplejos)
      .catch((e) => setError(e.message));
  }, []);
  useFocusEffect(cargar);

  async function crear() {
    setError(null);
    try {
      await api('/complejos', 'POST', nuevo);
      setNuevo({ nombre: '', direccion: '', departamento: null });
      cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  async function eliminar(id) {
    setError(null);
    try {
      await api(`/complejos/${id}`, 'DELETE');
      cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {complejos.map((c) => (
        <View key={c.id_complejo} style={styles.card}>
          <Text style={styles.subtitleText}>{c.nombre}</Text>
          <Text style={styles.smallText}>
            {c.direccion}, {c.departamento} · {c.cantidad_canchas} canchas
          </Text>
          <View style={styles.row}>
            <Button title="Editar y canchas" onPress={() => router.push(`/complejos/${c.id_complejo}`)} />
            <Button title="Eliminar" style={styles.dangerButton} onPress={() => eliminar(c.id_complejo)} />
          </View>
        </View>
      ))}

      <View style={styles.card}>
        <Text style={styles.subtitleText}>Nuevo complejo</Text>
        <Campo
          etiqueta="Nombre"
          value={nuevo.nombre}
          onChangeText={(v) => setNuevo({ ...nuevo, nombre: v })}
          maxLength={100}
        />
        <Campo
          etiqueta="Dirección"
          value={nuevo.direccion}
          onChangeText={(v) => setNuevo({ ...nuevo, direccion: v })}
          maxLength={150}
        />
        <Selector
          etiqueta="Departamento"
          opciones={departamentos.map((d) => ({ valor: d, texto: d }))}
          valor={nuevo.departamento}
          onChange={(v) => setNuevo({ ...nuevo, departamento: v })}
        />
        <Button
          title="Crear complejo"
          disabled={!nuevo.nombre.trim() || !nuevo.direccion.trim() || !nuevo.departamento}
          onPress={crear}
        />
      </View>
    </ScrollView>
  );
}
