import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { styles } from '@/common/styles';
import { api } from '@/common/api';
import Button from '@/components/Button';
import Campo from '@/components/Campo';
import Selector from '@/components/Selector';

const ESTADOS = ['inscripcion', 'en_curso', 'finalizado'];

// Alta (sin id) y modificación (con id) de una edición del torneo
export default function FormTorneo() {
  const { id } = useLocalSearchParams();
  const [torneo, setTorneo] = useState({
    nombre: '',
    anio: '',
    semestre: 1,
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'inscripcion',
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      api('/torneos').then((lista) => {
        const elegido = lista.find((t) => t.id_torneo === Number(id));
        setTorneo({ ...elegido, anio: String(elegido.anio) });
      });
    }
  }, [id]);

  function cambiar(campo, valor) {
    setTorneo((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function guardar() {
    setError(null);
    try {
      if (id) {
        await api(`/torneos/${id}`, 'PUT', torneo);
      } else {
        await api('/torneos', 'POST', torneo);
      }
      router.back();
    } catch (e) {
      setError(e.message);
    }
  }

  const completo = torneo.nombre && torneo.anio && torneo.fecha_inicio && torneo.fecha_fin;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Campo etiqueta="Nombre" value={torneo.nombre} onChangeText={(v) => cambiar('nombre', v)} maxLength={100} />
      <Campo
        etiqueta="Año"
        value={torneo.anio}
        onChangeText={(v) => cambiar('anio', v)}
        keyboardType="numeric"
        maxLength={4}
      />
      <Selector
        etiqueta="Semestre"
        opciones={[{ valor: 1, texto: '1' }, { valor: 2, texto: '2' }]}
        valor={torneo.semestre}
        onChange={(v) => cambiar('semestre', v)}
      />
      <Campo
        etiqueta="Fecha de inicio (AAAA-MM-DD)"
        value={torneo.fecha_inicio}
        onChangeText={(v) => cambiar('fecha_inicio', v)}
        maxLength={10}
      />
      <Campo
        etiqueta="Fecha de fin (AAAA-MM-DD)"
        value={torneo.fecha_fin}
        onChangeText={(v) => cambiar('fecha_fin', v)}
        maxLength={10}
      />
      <Selector
        etiqueta="Estado"
        opciones={ESTADOS.map((e) => ({ valor: e, texto: e }))}
        valor={torneo.estado}
        onChange={(v) => cambiar('estado', v)}
      />

      <Button title="Guardar" disabled={!completo} onPress={guardar} />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </ScrollView>
  );
}
