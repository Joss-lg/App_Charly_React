import Svg, { Path } from 'react-native-svg';

const trazo = (color, grosor = 2) => ({
  stroke: color,
  strokeWidth: grosor,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  fill: 'none',
});

// Caja con líneas de velocidad (delivery)
export function IconoDelivery({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 7h11v10H9ZM9 10.5h11M13 7v3.5" {...trazo(color)} />
      <Path d="M3 9h4M2 12h5M3 15h4" {...trazo(color)} />
    </Svg>
  );
}

// Destellos (novedad)
export function IconoChispa({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8Z" {...trazo(color)} />
      <Path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z" {...trazo(color, 1.6)} />
    </Svg>
  );
}

// Megáfono (aviso)
export function IconoMegafono({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 10v4h3l8 4.5v-13L7 10Z" {...trazo(color)} />
      <Path d="M18 9.5a3.5 3.5 0 0 1 0 5" {...trazo(color)} />
      <Path d="M7 14l1.2 4.5h2.6L10 15" {...trazo(color)} />
    </Svg>
  );
}

// Campana (estado vacío)
export function IconoCampana({ color, size = 48 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3.5v1.3" {...trazo(color, 1.5)} />
      <Path d="M6 16.5h12l-1.3-1.8V10.2a4.7 4.7 0 0 0-9.4 0v4.5Z" {...trazo(color, 1.5)} />
      <Path d="M10 19a2.2 2.2 0 0 0 4 0" {...trazo(color, 1.5)} />
    </Svg>
  );
}