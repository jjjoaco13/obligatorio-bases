import { StyleSheet } from 'react-native';

const verde = '#0f5132';

const baseButton = {
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 8,
  alignItems: 'center',
};

export const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    gap: 6,
  },
  primaryButton: {
    ...baseButton,
    backgroundColor: verde,
  },
  secondaryButton: {
    ...baseButton,
    backgroundColor: '#6c757d',
  },
  dangerButton: {
    ...baseButton,
    backgroundColor: '#cc0000',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: 'white',
  },
  chipSelected: {
    backgroundColor: verde,
    borderColor: verde,
  },
  chipSelectedText: {
    color: 'white',
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitleText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  normalText: {
    fontSize: 16,
    color: '#222',
  },
  smallText: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#cc0000',
  },
  scoreboard: {
    backgroundColor: verde,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  scoreboardText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableCell: {
    width: 110,
    paddingVertical: 6,
    paddingRight: 8,
    fontSize: 14,
  },
});
