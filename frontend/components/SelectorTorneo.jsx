import { useEffect, useState } from 'react';
import { api } from '@/common/api';
import Selector from './Selector';

// Elige una edición del torneo. Al cargar, deja elegido el torneo en curso.
export default function SelectorTorneo({ valor, onChange }) {
  const [torneos, setTorneos] = useState([]);

  useEffect(() => {
    api('/torneos').then((lista) => {
      setTorneos(lista);
      if (!valor && lista.length > 0) {
        const enCurso = lista.find((t) => t.estado === 'en_curso') ?? lista[0];
        onChange(enCurso.id_torneo);
      }
    });
  }, []);

  return (
    <Selector
      etiqueta="Torneo"
      opciones={torneos.map((t) => ({ valor: t.id_torneo, texto: t.nombre }))}
      valor={valor}
      onChange={onChange}
    />
  );
}
