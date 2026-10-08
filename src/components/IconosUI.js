import Svg, { Path, Circle } from 'react-native-svg';

const trazo = (color, grosor = 1.8) => ({
  stroke: color,
  strokeWidth: grosor,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  fill: 'none',
});

export function IconoBuscar({ color, size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="11" cy="11" r="6.5" {...trazo(color)} />
      <Path d="M16 16l4.5 4.5" {...trazo(color)} />
    </Svg>
  );
}

export function IconoPin({ color, size = 16 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z" {...trazo(color, 2)} />
      <Circle cx="12" cy="10" r="2.3" {...trazo(color, 2)} />
    </Svg>
  );
}

export function IconoSol({ color, size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="4" {...trazo(color, 2)} />
      <Path
        d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"
        {...trazo(color, 2)}
      />
    </Svg>
  );
}

export function IconoLuna({ color, size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" {...trazo(color, 2)} />
    </Svg>
  );
}

export function IconoCerrar({ color, size = 16 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 7l10 10M17 7L7 17" {...trazo(color, 2.2)} />
    </Svg>
  );
}

// ── Nuevos ──

export function IconoTelefono({ color, size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5 4h3.5l1.5 4-2 1.2a11 11 0 0 0 5.8 5.8L15 13l4 1.5V18a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z"
        {...trazo(color, 2)}
      />
    </Svg>
  );
}

export function IconoChat({ color, size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 19.5l1.3-3.8A8 8 0 1 1 8.5 19Z" {...trazo(color, 2)} />
      <Circle cx="8.5" cy="12" r="0.9" fill={color} />
      <Circle cx="12" cy="12" r="0.9" fill={color} />
      <Circle cx="15.5" cy="12" r="0.9" fill={color} />
    </Svg>
  );
}

export function IconoMapa({ color, size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 6.5L9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20ZM9 4v13.5M15 6.5V20" {...trazo(color, 2)} />
    </Svg>
  );
}

export function IconoReloj({ color, size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="8.5" {...trazo(color, 2)} />
      <Path d="M12 7.5V12l3 2" {...trazo(color, 2)} />
    </Svg>
  );
}

export function IconoChevron({ color, size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 6l6 6-6 6" {...trazo(color, 2.2)} />
    </Svg>
  );
}