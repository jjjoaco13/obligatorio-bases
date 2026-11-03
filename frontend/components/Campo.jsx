import { Text, TextInput, View } from 'react-native';
import { styles } from '@/common/styles';

// Un TextInput con su etiqueta arriba
export default function Campo({ etiqueta, ...props }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.label}>{etiqueta}</Text>
      <TextInput style={styles.input} {...props} />
    </View>
  );
}
