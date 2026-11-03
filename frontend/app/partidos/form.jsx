import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { styles } from '@/common/styles';
import { api } from '@/common/api';
import Button from '@/components/Button';
import Campo from '@/components/Campo';
import Selector from '@/components/Selector';

const ESTADOS = ['programado', 'postergado', 'cancelado', 'jugado'];

// Alta (sin id) y modificación (con id) de un partido
export default function FormPartido() {
  const { torneo, id } = useLocalSearchParams();
  const [partido, setPartido] = useState({
    numero_fecha: '',
    dia: '',
    id_equipo_local: null,
    id_equipo_visitante: null,
    id_turno: null,
    cancha: null,
    estado: 'programado',
  });
  const [equipos, setEquipos] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [canchas, setCanchas] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api(`/equipos?torneo=${torneo}`).then(setEquipos);
    api('/turnos').then(setTurnos);
    api('/canchas').then(setCanchas);
    if (id) {
      api(`/partidos/${id}`).then((p) =>
        setPartido({ ...p, numero_fecha: String(p.numero_fecha), cancha: `${p.id_complejo}|${p.nombre_cancha}` }),
      );
    }
  }, [torneo, id]);

  function cambiar(campo, valor) {
    setPartido((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function guardar() {
    setError(null);
    // La cancha se identifica por complejo + nombre
    const [id_complejo, nombre_cancha] = partido.cancha.split('|');
    const datos = { ...partido, id_torneo: torneo, id_complejo, nombre_cancha };
    try {
      if (id) {
        await api(`/partidos/${id}`, 'PUT', datos);
      } else {
        await api('/partidos', 'POST', datos);
      }
      router.back();
    } catch (e) {
      setError(e.message);
    }
  }

  const opcionesEquipos = equipos.map((e) => ({ valor: e.id_equipo, texto: e.nombre }));
  const completo = partido.numero_fecha && partido.dia && partido.id_equipo_local
    && partido.id_equipo_visitante && partido.id_turno && partido.cancha;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Campo
        etiqueta="Número de fecha"
        value={partido.numero_fecha}
        onChangeText={(v) => cambiar('numero_fecha', v)}
        keyboardType="numeric"
      />
      <Campo
        etiqueta="Día (AAAA-MM-DD)"
        value={partido.dia}
        onChangeText={(v) => cambiar('dia', v)}
        placeholder="2026-11-16"
        maxLength={10}
      />
      <Selector
        etiqueta="Turno"
        opciones={turnos.map((t) => ({ valor: t.id_turno, texto: `${t.hora_inicio} a ${t.hora_fin}` }))}
        valor={partido.id_turno}
        onChange={(v) => cambiar('id_turno', v)}
      />
      <Selector
        etiqueta="Cancha"
        opciones={canchas.map((c) => ({ valor: `${c.id_complejo}|${c.nombre_cancha}`, texto: `${c.complejo} · ${c.nombre_cancha}` }))}
        valor={partido.cancha}
        onChange={(v) => cambiar('cancha', v)}
      />
      <Selector
        etiqueta="Equipo local"
        opciones={opcionesEquipos}
        valor={partido.id_equipo_local}
        onChange={(v) => cambiar('id_equipo_local', v)}
      />
      <Selector
        etiqueta="Equipo visitante"
        opciones={opcionesEquipos}
        valor={partido.id_equipo_visitante}
        onChange={(v) => cambiar('id_equipo_visitante', v)}
      />
      <Selector
        etiqueta="Estado"
        opciones={ESTADOS.map((e) => ({ valor: e, texto: e }))}
        valor={partido.estado}
        onChange={(v) => cambiar('estado', v)}
      />

      {partido.id_equipo_local && partido.id_equipo_local === partido.id_equipo_visitante && (
        <Text style={styles.errorText}>Un equipo no puede enfrentarse a sí mismo.</Text>
      )}
      <Button
        title="Guardar"
        disabled={!completo || partido.id_equipo_local === partido.id_equipo_visitante}
        onPress={guardar}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </ScrollView>
  );
}
