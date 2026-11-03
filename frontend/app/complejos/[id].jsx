import { useEffect, useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { styles } from '@/common/styles';
import { api } from '@/common/api';
import Button from '@/components/Button';
import Campo from '@/components/Campo';
import Selector from '@/components/Selector';

const SUPERFICIES = [
  { valor: 'sintetico', texto: 'Sintético' },
  { valor: 'parquet', texto: 'Parquet' },
];

// Modificar un complejo y hacer el ABM de sus canchas
export default function Complejo() {
  const { id } = useLocalSearchParams();
  const [complejo, setComplejo] = useState(null);
  const [canchas, setCanchas] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [nueva, setNueva] = useState({ nombre_cancha: '', superficie: 'sintetico', techada: false });
  const [error, setError] = useState(null);

  async function cargar() {
    const complejos = await api('/complejos');
    setComplejo(complejos.find((c) => c.id_complejo === Number(id)));
    setCanchas(await api(`/canchas?complejo=${id}`));
  }

  useEffect(() => {
    api('/departamentos').then(setDepartamentos);
    cargar().catch((e) => setError(e.message));
  }, [id]);

  // Llama a la API, muestra el error si lo hay y recarga la pantalla
  async function enviar(ruta, metodo, cuerpo) {
    setError(null);
    try {
      await api(ruta, metodo, cuerpo);
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  if (!complejo) {
    return <Text style={styles.container}>{error ?? 'Cargando...'}</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.card}>
        <Text style={styles.subtitleText}>Complejo</Text>
        <Campo
          etiqueta="Nombre"
          value={complejo.nombre}
          onChangeText={(v) => setComplejo({ ...complejo, nombre: v })}
          maxLength={100}
        />
        <Campo
          etiqueta="Dirección"
          value={complejo.direccion}
          onChangeText={(v) => setComplejo({ ...complejo, direccion: v })}
          maxLength={150}
        />
        <Selector
          etiqueta="Departamento"
          opciones={departamentos.map((d) => ({ valor: d, texto: d }))}
          valor={complejo.departamento}
          onChange={(v) => setComplejo({ ...complejo, departamento: v })}
        />
        <Button
          title="Guardar complejo"
          disabled={!complejo.nombre.trim() || !complejo.direccion.trim()}
          onPress={() => enviar(`/complejos/${id}`, 'PUT', complejo)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.subtitleText}>Canchas</Text>
        {canchas.length === 0 && <Text style={styles.smallText}>El complejo no tiene canchas.</Text>}
        {canchas.map((c) => {
          const ruta = `/complejos/${id}/canchas/${encodeURIComponent(c.nombre_cancha)}`;
          return (
            <View key={c.nombre_cancha} style={{ gap: 6, paddingVertical: 6 }}>
              <Text style={styles.normalText}>{c.nombre_cancha}</Text>
              <Selector
                opciones={SUPERFICIES}
                valor={c.superficie}
                onChange={(v) => enviar(ruta, 'PUT', { superficie: v, techada: Boolean(c.techada) })}
              />
              <View style={styles.row}>
                <Switch
                  value={Boolean(c.techada)}
                  onValueChange={(v) => enviar(ruta, 'PUT', { superficie: c.superficie, techada: v })}
                />
                <Text style={styles.normalText}>Techada</Text>
                <Button title="Eliminar" style={styles.dangerButton} onPress={() => enviar(ruta, 'DELETE')} />
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.subtitleText}>Nueva cancha</Text>
        <Campo
          etiqueta="Nombre"
          value={nueva.nombre_cancha}
          onChangeText={(v) => setNueva({ ...nueva, nombre_cancha: v })}
          maxLength={50}
        />
        <Selector opciones={SUPERFICIES} valor={nueva.superficie} onChange={(v) => setNueva({ ...nueva, superficie: v })} />
        <View style={styles.row}>
          <Switch value={nueva.techada} onValueChange={(v) => setNueva({ ...nueva, techada: v })} />
          <Text style={styles.normalText}>Techada</Text>
        </View>
        <Button
          title="Agregar cancha"
          disabled={!nueva.nombre_cancha.trim()}
          onPress={() => {
            enviar(`/complejos/${id}/canchas`, 'POST', nueva);
            setNueva({ nombre_cancha: '', superficie: 'sintetico', techada: false });
          }}
        />
      </View>
    </ScrollView>
  );
}
