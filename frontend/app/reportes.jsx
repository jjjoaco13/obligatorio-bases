import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { styles } from '@/common/styles';
import { api } from '@/common/api';
import SelectorTorneo from '@/components/SelectorTorneo';

export default function Reportes() {
  const [torneo, setTorneo] = useState(null);
  const [reportes, setReportes] = useState([]);
  const [error, setError] = useState(null);

  // Pide la lista de reportes y después los datos de cada uno
  useEffect(() => {
    if (!torneo) return;
    setError(null);
    api('/reportes')
      .then((lista) => Promise.all(lista.map((r) => api(`/reportes/${r.clave}?torneo=${torneo}`))))
      .then(setReportes)
      .catch((e) => setError(e.message));
  }, [torneo]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SelectorTorneo valor={torneo} onChange={setTorneo} />
      {error && <Text style={styles.errorText}>{error}</Text>}

      {reportes.map((reporte) => (
        <View key={reporte.titulo} style={styles.card}>
          <Text style={styles.subtitleText}>{reporte.titulo}</Text>
          {reporte.filas.length === 0 ? (
            <Text style={styles.smallText}>Sin datos.</Text>
          ) : (
            <ScrollView horizontal>
              <View>
                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#ccc' }}>
                  {reporte.columnas.map((columna) => (
                    <Text key={columna} style={[styles.tableCell, { fontWeight: 'bold' }]}>{columna}</Text>
                  ))}
                </View>
                {reporte.filas.map((fila, i) => (
                  <View key={i} style={{ flexDirection: 'row' }}>
                    {fila.map((valor, j) => (
                      <Text key={j} style={styles.tableCell}>{valor ?? '-'}</Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      ))}
    </ScrollView>
  );
}
