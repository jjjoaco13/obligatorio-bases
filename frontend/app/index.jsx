import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { styles } from '@/common/styles';
import { api } from '@/common/api';
import { sesion } from '@/common/sesion';
import Button from '@/components/Button';
import Campo from '@/components/Campo';

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState(null);

  async function ingresar() {
    setError(null);
    try {
      const datos = await api('/login', 'POST', { correo: correo.trim(), contrasena });
      sesion.token = datos.token;
      sesion.correo = datos.correo;
      sesion.rol = datos.rol;
      router.replace('/menu');
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titleText}>Torneo Interfacultades</Text>
      <Text style={styles.smallText}>Fútbol 5 · Universidad Católica del Uruguay</Text>

      <Campo
        etiqueta="Correo"
        value={correo}
        onChangeText={setCorreo}
        autoCapitalize="none"
        keyboardType="email-address"
        maxLength={100}
      />
      <Campo etiqueta="Contraseña" value={contrasena} onChangeText={setContrasena} secureTextEntry />

      <Button title="Ingresar" disabled={!correo.trim() || !contrasena} onPress={ingresar} />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}
