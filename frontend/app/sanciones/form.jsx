import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { styles } from '@/common/styles';
import { api } from '@/common/api';
import Button from '@/components/Button';
import Campo from '@/components/Campo';
import Selector from '@/components/Selector';

// Alta de sanciones disciplinarias (sin id) y modificación de cualquier sanción (con id)
export default function FormSancion() {
  const { torneo, id } = useLocalSearchParams();
  const [sancion, setSancion] = useState({
    ci_jugador: null,
    numero_fecha_inicio: '',
    cantidad_fechas: '1',
    descripcion: '',
    motivo: 'disciplinaria',
  });
  const [inscriptos, setInscriptos] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      api(`/sanciones?torneo=${torneo}`).then((lista) => {
        const elegida = lista.find((s) => s.id_sancion === Number(id));
        setSancion({
          ...elegida,
          numero_fecha_inicio: String(elegida.numero_fecha_inicio),
          cantidad_fechas: String(elegida.cantidad_fechas),
          descripcion: elegida.descripcion ?? '',
        });
      });
    } else {
      api(`/torneos/${torneo}/inscriptos`).then(setInscriptos);
    }
  }, [torneo, id]);

  function cambiar(campo, valor) {
    setSancion((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function guardar() {
    setError(null);
    try {
      if (id) {
        await api(`/sanciones/${id}`, 'PUT', sancion);
      } else {
        await api('/sanciones', 'POST', { ...sancion, id_torneo: torneo });
      }
      router.back();
    } catch (e) {
      setError(e.message);
    }
  }

  const completo = (id || sancion.ci_jugador) && sancion.numero_fecha_inicio && sancion.cantidad_fechas;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {id ? (
        <Text style={styles.subtitleText}>
          {sancion.nombre} {sancion.apellido} ({sancion.motivo})
        </Text>
      ) : (
        <Selector
          etiqueta="Jugador"
          opciones={inscriptos.map((j) => ({ valor: j.ci, texto: `${j.apellido}, ${j.nombre} (${j.equipo})` }))}
          valor={sancion.ci_jugador}
          onChange={(v) => cambiar('ci_jugador', v)}
        />
      )}
      <Campo
        etiqueta="Desde la fecha número"
        value={sancion.numero_fecha_inicio}
        onChangeText={(v) => cambiar('numero_fecha_inicio', v)}
        keyboardType="numeric"
      />
      {/* Las sanciones automáticas (por tarjeta) siempre duran una fecha */}
      {sancion.motivo === 'disciplinaria' && (
        <Campo
          etiqueta="Cantidad de fechas"
          value={sancion.cantidad_fechas}
          onChangeText={(v) => cambiar('cantidad_fechas', v)}
          keyboardType="numeric"
        />
      )}
      <Campo
        etiqueta="Descripción"
        value={sancion.descripcion}
        onChangeText={(v) => cambiar('descripcion', v)}
        maxLength={255}
        multiline
      />

      <Button title="Guardar" disabled={!completo} onPress={guardar} />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </ScrollView>
  );
}
