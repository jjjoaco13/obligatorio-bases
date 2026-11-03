import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '@/common/styles';

// Reemplaza al <select>: muestra las opciones como botones y marca la elegida.
// opciones es una lista de { valor, texto }
export default function Selector({ etiqueta, opciones, valor, onChange }) {
  return (
    <View style={{ gap: 4 }}>
      {etiqueta && <Text style={styles.label}>{etiqueta}</Text>}
      <View style={styles.row}>
        {opciones.map((opcion) => {
          const elegida = opcion.valor === valor;
          return (
            <TouchableOpacity
              key={opcion.valor}
              style={[styles.chip, elegida && styles.chipSelected]}
              onPress={() => onChange(opcion.valor)}
            >
              <Text style={elegida && styles.chipSelectedText}>{opcion.texto}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
