import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { styles } from '@/common/styles';
import { api } from '@/common/api';
import Button from '@/components/Button';
import Campo from '@/components/Campo';
import Selector from '@/components/Selector';

// Datos del equipo (nombre y capitán) y su plantel
export default function Plantel() {
  const { id } = useLocalSearchParams();
  const [equipo, setEquipo] = useState(null);
  const [plantel, setPlantel] = useState([]);
  const [candidatos, setCandidatos] = useState([]);
  const [nuevo, setNuevo] = useState({ ci_jugador: null, numero_camiseta: '' });
  const [error, setError] = useState(null);

  async function cargar() {
    const equipos = await api('/equipos');
    const elegido = equipos.find((e) => e.id_equipo === Number(id));
    const jugadoresDelPlantel = await api(`/equipos/${id}/plantel`);
    // Se pueden agregar jugadores de la misma facultad que todavía no están en el plantel
    const deLaFacultad = await api(`/jugadores?facultad=${elegido.id_facultad}`);
    setEquipo(elegido);
    setPlantel(jugadoresDelPlantel);
    setCandidatos(deLaFacultad.filter((j) => !jugadoresDelPlantel.some((p) => p.ci === j.ci)));
  }

  useEffect(() => {
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

  if (!equipo) {
    return <Text style={styles.container}>{error ?? 'Cargando...'}</Text>;
  }

  const enInscripcion = equipo.estado_torneo === 'inscripcion';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.card}>
        <Text style={styles.subtitleText}>Equipo</Text>
        <Campo
          etiqueta="Nombre"
          value={equipo.nombre}
          onChangeText={(v) => setEquipo({ ...equipo, nombre: v })}
          maxLength={100}
        />
        <Selector
          etiqueta="Capitán"
          opciones={plantel.map((j) => ({ valor: j.ci, texto: `${j.nombre} ${j.apellido}` }))}
          valor={equipo.ci_capitan}
          onChange={(v) => setEquipo({ ...equipo, ci_capitan: v })}
        />
        <Button
          title="Guardar equipo"
          disabled={!equipo.nombre.trim()}
          onPress={() => enviar(`/equipos/${id}`, 'PUT', equipo)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.subtitleText}>Plantel ({plantel.length}/10)</Text>
        {!enInscripcion && (
          <Text style={styles.smallText}>El torneo no está en inscripción: el plantel no se puede modificar.</Text>
        )}
        {plantel.map((j) => (
          <View key={j.ci} style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text style={styles.normalText}>
              #{j.numero_camiseta} {j.nombre} {j.apellido} ({j.tipo})
            </Text>
            {enInscripcion && (
              <Button
                title="Quitar"
                style={styles.dangerButton}
                onPress={() => enviar(`/equipos/${id}/plantel/${j.ci}`, 'DELETE')}
              />
            )}
          </View>
        ))}
      </View>

      {enInscripcion && plantel.length < 10 && (
        <View style={styles.card}>
          <Text style={styles.subtitleText}>Agregar jugador</Text>
          <Selector
            opciones={candidatos.map((j) => ({ valor: j.ci, texto: `${j.nombre} ${j.apellido} (${j.tipo})` }))}
            valor={nuevo.ci_jugador}
            onChange={(v) => setNuevo({ ...nuevo, ci_jugador: v })}
          />
          <Campo
            etiqueta="Número de camiseta (1 a 99)"
            value={nuevo.numero_camiseta}
            onChangeText={(v) => setNuevo({ ...nuevo, numero_camiseta: v })}
            keyboardType="numeric"
            maxLength={2}
          />
          <Button
            title="Agregar al plantel"
            disabled={!nuevo.ci_jugador || !nuevo.numero_camiseta}
            onPress={() => {
              enviar(`/equipos/${id}/plantel`, 'POST', nuevo);
              setNuevo({ ci_jugador: null, numero_camiseta: '' });
            }}
          />
        </View>
      )}
    </ScrollView>
  );
}
