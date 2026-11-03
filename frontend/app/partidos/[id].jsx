import { useEffect, useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { styles } from '@/common/styles';
import { api } from '@/common/api';
import Button from '@/components/Button';
import Campo from '@/components/Campo';
import Selector from '@/components/Selector';

// Planilla de un partido: quién jugó, goles y tarjetas
export default function Planilla() {
  const { id } = useLocalSearchParams();
  const [planilla, setPlanilla] = useState(null);
  const [error, setError] = useState(null);
  const [gol, setGol] = useState({ ci_jugador: null, minuto: '', autogol: false });
  const [tarjeta, setTarjeta] = useState({ ci_jugador: null, minuto: '', color: 'amarilla' });

  function cargar() {
    api(`/partidos/${id}/planilla`)
      .then(setPlanilla)
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    cargar();
  }, [id]);

  // Llama a la API, muestra el error si lo hay y recarga la planilla
  async function enviar(ruta, metodo, cuerpo) {
    setError(null);
    try {
      await api(ruta, metodo, cuerpo);
    } catch (e) {
      setError(e.message);
    }
    cargar();
  }

  if (!planilla) {
    return <Text style={styles.container}>{error ?? 'Cargando...'}</Text>;
  }

  const { partido, editable, motivo, jugadores, goles, tarjetas } = planilla;
  const equipos = [
    { id: partido.id_equipo_local, nombre: partido.equipo_local },
    { id: partido.id_equipo_visitante, nombre: partido.equipo_visitante },
  ];
  const nombreEquipo = (idEquipo) => equipos.find((e) => e.id === idEquipo).nombre;

  // Solo los que están en la planilla pueden hacer goles o recibir tarjetas
  const enPlanilla = jugadores
    .filter((j) => j.en_planilla)
    .map((j) => ({ valor: j.ci, texto: `#${j.numero_camiseta} ${j.apellido} (${nombreEquipo(j.id_equipo)})` }));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.scoreboard}>
        <Text style={styles.scoreboardText}>
          {partido.equipo_local} {partido.goles_local} - {partido.goles_visitante} {partido.equipo_visitante}
        </Text>
        <Text style={{ color: 'white' }}>
          Fecha {partido.numero_fecha} · {partido.dia} · {partido.hora_inicio} · {partido.estado}
        </Text>
      </View>

      {!editable && <Text style={styles.errorText}>No se puede modificar: {motivo}</Text>}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {equipos.map((equipo) => (
        <View key={equipo.id} style={styles.card}>
          <Text style={styles.subtitleText}>{equipo.nombre}</Text>
          {jugadores.filter((j) => j.id_equipo === equipo.id).map((j) => (
            <View key={j.ci} style={[styles.row, { justifyContent: 'space-between' }]}>
              <Text style={styles.normalText}>
                #{j.numero_camiseta} {j.nombre} {j.apellido} {j.suspendido ? '(suspendido)' : ''}
              </Text>
              {editable && (
                <Button
                  title={j.en_planilla ? 'Juega ✓' : 'No juega'}
                  style={j.en_planilla ? styles.primaryButton : styles.secondaryButton}
                  disabled={j.suspendido && !j.en_planilla}
                  onPress={() => j.en_planilla
                    ? enviar(`/partidos/${id}/planilla/${j.ci}`, 'DELETE')
                    : enviar(`/partidos/${id}/planilla`, 'POST', { ci_jugador: j.ci })}
                />
              )}
            </View>
          ))}
        </View>
      ))}

      <View style={styles.card}>
        <Text style={styles.subtitleText}>Goles</Text>
        {goles.length === 0 && <Text style={styles.smallText}>Sin goles.</Text>}
        {goles.map((g) => (
          <View key={g.id_gol} style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text style={styles.normalText}>
              {g.minuto}' {g.nombre} {g.apellido} ({nombreEquipo(g.id_equipo)}) {g.autogol ? '- en contra' : ''}
            </Text>
            {editable && (
              <Button title="Quitar" style={styles.dangerButton} onPress={() => enviar(`/goles/${g.id_gol}`, 'DELETE')} />
            )}
          </View>
        ))}
        {editable && (
          <>
            <Selector opciones={enPlanilla} valor={gol.ci_jugador} onChange={(v) => setGol({ ...gol, ci_jugador: v })} />
            <Campo
              etiqueta="Minuto (0 a 60)"
              value={gol.minuto}
              onChangeText={(v) => setGol({ ...gol, minuto: v })}
              keyboardType="numeric"
            />
            <View style={styles.row}>
              <Switch value={gol.autogol} onValueChange={(v) => setGol({ ...gol, autogol: v })} />
              <Text style={styles.normalText}>Gol en contra</Text>
            </View>
            <Button
              title="Agregar gol"
              disabled={!gol.ci_jugador || !gol.minuto}
              onPress={() => {
                enviar(`/partidos/${id}/goles`, 'POST', gol);
                setGol({ ci_jugador: null, minuto: '', autogol: false });
              }}
            />
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.subtitleText}>Tarjetas</Text>
        {tarjetas.length === 0 && <Text style={styles.smallText}>Sin tarjetas.</Text>}
        {tarjetas.map((t) => (
          <View key={t.id_tarjeta} style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text style={styles.normalText}>
              {t.minuto}' {t.color === 'roja' ? '🟥' : '🟨'} {t.nombre} {t.apellido} ({nombreEquipo(t.id_equipo)})
            </Text>
            {editable && (
              <Button title="Quitar" style={styles.dangerButton} onPress={() => enviar(`/tarjetas/${t.id_tarjeta}`, 'DELETE')} />
            )}
          </View>
        ))}
        {editable && (
          <>
            <Selector opciones={enPlanilla} valor={tarjeta.ci_jugador} onChange={(v) => setTarjeta({ ...tarjeta, ci_jugador: v })} />
            <Campo
              etiqueta="Minuto (0 a 60)"
              value={tarjeta.minuto}
              onChangeText={(v) => setTarjeta({ ...tarjeta, minuto: v })}
              keyboardType="numeric"
            />
            <Selector
              opciones={[{ valor: 'amarilla', texto: 'Amarilla' }, { valor: 'roja', texto: 'Roja' }]}
              valor={tarjeta.color}
              onChange={(v) => setTarjeta({ ...tarjeta, color: v })}
            />
            <Button
              title="Agregar tarjeta"
              disabled={!tarjeta.ci_jugador || !tarjeta.minuto}
              onPress={() => {
                enviar(`/partidos/${id}/tarjetas`, 'POST', tarjeta);
                setTarjeta({ ci_jugador: null, minuto: '', color: 'amarilla' });
              }}
            />
          </>
        )}
      </View>

      {editable && partido.estado === 'programado' && (
        <Button
          title="Marcar como jugado"
          onPress={() => enviar(`/partidos/${id}/estado`, 'PATCH', { estado: 'jugado' })}
        />
      )}
    </ScrollView>
  );
}
