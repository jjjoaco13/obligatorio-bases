import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { styles } from '@/common/styles';
import { api } from '@/common/api';
import Button from '@/components/Button';
import Campo from '@/components/Campo';
import Selector from '@/components/Selector';

const TIPOS = ['grado', 'posgrado', 'docente', 'funcionario'];

// Alta (sin ci) y modificación (con ci) de un jugador
export default function FormJugador() {
  const { ci } = useLocalSearchParams();
  const [jugador, setJugador] = useState({
    ci: '',
    nombre: '',
    apellido: '',
    email: '',
    fecha_nacimiento: '',
    id_facultad: null,
    tipo: 'grado',
  });
  const [facultades, setFacultades] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/facultades').then(setFacultades);
    if (ci) {
      api('/jugadores').then((lista) => setJugador(lista.find((j) => j.ci === ci)));
    }
  }, [ci]);

  function cambiar(campo, valor) {
    setJugador((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function guardar() {
    setError(null);
    try {
      if (ci) {
        await api(`/jugadores/${ci}`, 'PUT', jugador);
      } else {
        await api('/jugadores', 'POST', jugador);
      }
      router.back();
    } catch (e) {
      setError(e.message);
    }
  }

  const ciValida = /^\d{7,8}$/.test(jugador.ci);
  const completo = ciValida && jugador.nombre && jugador.apellido && jugador.email
    && jugador.fecha_nacimiento && jugador.id_facultad;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Campo
        etiqueta="Cédula (7 u 8 dígitos, sin puntos ni guión)"
        value={jugador.ci}
        onChangeText={(v) => cambiar('ci', v)}
        editable={!ci}
        keyboardType="numeric"
        maxLength={8}
      />
      <Campo etiqueta="Nombre" value={jugador.nombre} onChangeText={(v) => cambiar('nombre', v)} maxLength={50} />
      <Campo etiqueta="Apellido" value={jugador.apellido} onChangeText={(v) => cambiar('apellido', v)} maxLength={50} />
      <Campo
        etiqueta="Email"
        value={jugador.email}
        onChangeText={(v) => cambiar('email', v)}
        autoCapitalize="none"
        keyboardType="email-address"
        maxLength={100}
      />
      <Campo
        etiqueta="Fecha de nacimiento (AAAA-MM-DD)"
        value={jugador.fecha_nacimiento}
        onChangeText={(v) => cambiar('fecha_nacimiento', v)}
        placeholder="2002-05-20"
        maxLength={10}
      />
      <Selector
        etiqueta="Tipo"
        opciones={TIPOS.map((t) => ({ valor: t, texto: t }))}
        valor={jugador.tipo}
        onChange={(v) => cambiar('tipo', v)}
      />
      <Selector
        etiqueta="Facultad"
        opciones={facultades.map((f) => ({ valor: f.id_facultad, texto: f.nombre }))}
        valor={jugador.id_facultad}
        onChange={(v) => cambiar('id_facultad', v)}
      />

      {jugador.ci !== '' && !ciValida && <Text style={styles.errorText}>La cédula debe tener 7 u 8 dígitos.</Text>}
      <Button title="Guardar" disabled={!completo} onPress={guardar} />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </ScrollView>
  );
}
