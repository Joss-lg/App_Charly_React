import Svg, { Path, Circle } from 'react-native-svg';

// Trazo fino en reposo, más marcado y con relleno suave al estar activo
const trazo = (color, activo) => ({
  stroke: color,
  strokeWidth: activo ? 2.1 : 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

const relleno = (color, activo) => ({
  fill: activo ? color : 'none',
  fillOpacity: 0.15,
});

export function IconoInicio({ color, activo, size = 24 }) {
  const t = trazo(color, activo);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Rebanada */}
      <Path d="M3 7.2Q12 2 21 7.2L12 21.5Z" {...t} {...relleno(color, activo)} />
      {/* Orilla */}
      <Path d="M5.2 10Q12 6.2 18.8 10" {...t} fill="none" />
      {/* Pepperoni */}
      <Circle cx="10" cy="12.2" r="1.2" fill={color} />
      <Circle cx="13.9" cy="11.4" r="1" fill={color} />
      <Circle cx="12" cy="15.6" r="1" fill={color} />
    </Svg>
  );
}

export function IconoPromos({ color, activo, size = 24 }) {
  const t = trazo(color, activo);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Cupón con muescas */}
      <Path
        d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.5a2.5 2.5 0 0 0 0 5V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5a2.5 2.5 0 0 0 0-5Z"
        {...t}
        {...relleno(color, activo)}
      />
      {/* Símbolo % */}
      <Path d="M14.5 9.5l-5 5" {...t} fill="none" />
      <Circle cx="9.8" cy="9.8" r="1" fill={color} />
      <Circle cx="14.2" cy="14.2" r="1" fill={color} />
    </Svg>
  );
}

export function IconoSucursales({ color, activo, size = 24 }) {
  const t = trazo(color, activo);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Toldo */}
      <Path
        d="M3.5 9L5 4.5h14L20.5 9M3.5 9h17M3.5 9a2.83 2.83 0 0 0 5.67 0a2.83 2.83 0 0 0 5.66 0a2.83 2.83 0 0 0 5.67 0"
        {...t}
        {...relleno(color, activo)}
      />
      {/* Local */}
      <Path d="M5 11.8V20h14v-8.2" {...t} fill="none" />
      {/* Puerta */}
      <Path d="M10 20v-4.5h4V20" {...t} fill="none" />
    </Svg>
  );
}

export function IconoNotificaciones({ color, activo, size = 24 }) {
  const t = trazo(color, activo);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3.5v1.3" {...t} fill="none" />
      <Path
        d="M6 16.5h12l-1.3-1.8V10.2a4.7 4.7 0 0 0-9.4 0v4.5Z"
        {...t}
        {...relleno(color, activo)}
      />
      <Path d="M10 19a2.2 2.2 0 0 0 4 0" {...t} fill="none" />
    </Svg>
  );
}