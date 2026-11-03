import { Text, TouchableOpacity } from 'react-native';
import { styles } from '@/common/styles';

export default function Button({ title, onPress, disabled, style = styles.primaryButton }) {
  return (
    <TouchableOpacity
      style={[style, disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}
