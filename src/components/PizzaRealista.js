// src/components/PizzaRealista.js
// Pizza de pepperoni dibujada con SVG (sin fotos ni emojis).
// - Las líneas de corte coinciden con las rebanadas de cada tamaño (6, 8, 10, 12).
// - Entre más grande el tamaño, más pepperonis.
// - Animaciones: entra girando y creciendo, y luego gira muy despacio
//   (como pizza en exhibición). Si el celular tiene "Reducir movimiento", no gira.
// - Optimizado: el dibujo (unas 70 piezas) se hace una sola vez y no se
//   vuelve a dibujar cuando cambia otra cosa en la pantalla.

import { memo, useEffect, useRef } from 'react';
import { Animated, Easing, AccessibilityInfo } from 'react-native';
import Svg, {
  Circle, Defs, RadialGradient, Stop, Line, Ellipse, G, Path,
} from 'react-native-svg';

// Posiciones de pepperoni en coordenadas polares [distancia, ángulo]
const PEPPERONIS = [
  [0, 0], [24, 20], [24, 110], [24, 200], [24, 290],
  [30, 65], [30, 245], [30, 155], [30, 335],
  [14, 160], [14, 340],
];
const CANTIDAD_POR_NIVEL = [5, 7, 9, 11]; // Chica, Mediana, Grande, Familiar

// Hojas de albahaca [distancia, ángulo, giro de la hoja]
const HOJAS = [[32, 90, 35], [32, 270, -40]];

// Manchitas doradas del queso gratinado [distancia, ángulo, radio]
const DORADOS = [[18, 45, 2.2], [27, 180, 1.8], [10, 250, 1.5], [35, 300, 1.6], [35, 130, 1.7], [20, 330, 1.4]];
// Zonas de queso más claro [distancia, ángulo, radio]
const BRILLOS = [[12, 100, 5], [28, 10, 4], [22, 240, 4.5], [33, 200, 3.5]];

const CENTRO = 50;
function polar(r, grados) {
  const a = (grados * Math.PI) / 180;
  return { x: CENTRO + r * Math.cos(a), y: CENTRO + r * Math.sin(a) };
}

function Pepperoni({ x, y, idGrad }) {
  return (
    <G transform={`translate(${x} ${y})`}>
      <Circle r={6.4} fill={`url(#${idGrad})`} />
      <Circle r={6.4} fill="none" stroke="#7E1F14" strokeWidth={0.8} />
      <Circle cx={-2} cy={-1} r={0.9} fill="#7E1F14" opacity={0.6} />
      <Circle cx={1.8} cy={1.5} r={0.9} fill="#7E1F14" opacity={0.6} />
      <Circle cx={0.5} cy={-2.6} r={0.8} fill="#7E1F14" opacity={0.5} />
      <Ellipse cx={-2} cy={-2.4} rx={2} ry={1.1} fill="#FFFFFF" opacity={0.28} />
    </G>
  );
}

function Albahaca({ x, y, giro }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${giro})`}>
      <Path d="M0,-4.5 C3.2,-2.2 3.2,2.2 0,4.5 C-3.2,2.2 -3.2,-2.2 0,-4.5 Z" fill="#3E8E3A" />
      <Line x1={0} y1={-3.8} x2={0} y2={3.8} stroke="#2C6B29" strokeWidth={0.6} />
    </G>
  );
}

// El dibujo de la pizza: solo se vuelve a dibujar si cambia su tamaño o sus rebanadas
const DibujoPizza = memo(function DibujoPizza({ size, rebanadas, nivel, clave }) {
  const idMasa = `${clave}-masa`;
  const idQueso = `${clave}-queso`;
  const idPep = `${clave}-pep`;

  const cantidad = CANTIDAD_POR_NIVEL[Math.min(Math.max(nivel, 0), 3)];
  const cortes = Math.max(rebanadas || 8, 2);

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={idMasa} cx="50%" cy="50%" r="50%">
          <Stop offset="0.8" stopColor="#EDC07A" />
          <Stop offset="0.95" stopColor="#D1924A" />
          <Stop offset="1" stopColor="#A96A2C" />
        </RadialGradient>
        <RadialGradient id={idQueso} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFEFB5" />
          <Stop offset="0.7" stopColor="#FAD06A" />
          <Stop offset="1" stopColor="#EBB248" />
        </RadialGradient>
        <RadialGradient id={idPep} cx="40%" cy="40%" r="60%">
          <Stop offset="0" stopColor="#E0553A" />
          <Stop offset="1" stopColor="#A12D1D" />
        </RadialGradient>
      </Defs>

      {/* Orilla de la masa */}
      <Circle cx={CENTRO} cy={CENTRO} r={48} fill={`url(#${idMasa})`} />
      <Circle cx={CENTRO} cy={CENTRO} r={48} fill="none" stroke="#9A5E24" strokeWidth={1} />
      <Circle cx={CENTRO} cy={CENTRO} r={43.5} fill="none" stroke="#F4D08F" strokeWidth={1.2} opacity={0.5} />
      {Array.from({ length: 9 }).map((_, k) => {
        const p = polar(45.5, k * 40 + 12);
        return <Circle key={`m${k}`} cx={p.x} cy={p.y} r={0.9} fill="#8C5320" opacity={0.35} />;
      })}

      {/* Salsa y queso */}
      <Circle cx={CENTRO} cy={CENTRO} r={41.5} fill="#B83A22" />
      <Circle cx={CENTRO} cy={CENTRO} r={40} fill={`url(#${idQueso})`} />
      {BRILLOS.map(([r, a, radio], k) => {
        const p = polar(r, a);
        return <Circle key={`b${k}`} cx={p.x} cy={p.y} r={radio} fill="#FFF3C8" opacity={0.6} />;
      })}
      {DORADOS.map(([r, a, radio], k) => {
        const p = polar(r, a);
        return <Circle key={`d${k}`} cx={p.x} cy={p.y} r={radio} fill="#E3A13B" opacity={0.55} />;
      })}

      {/* Pepperonis */}
      {PEPPERONIS.slice(0, cantidad).map(([r, a], k) => {
        const p = polar(r, a);
        return <Pepperoni key={`p${k}`} x={p.x} y={p.y} idGrad={idPep} />;
      })}

      {/* Albahaca */}
      {HOJAS.map(([r, a, g], k) => {
        const p = polar(r, a);
        return <Albahaca key={`h${k}`} x={p.x} y={p.y} giro={g} />;
      })}

      {/* Cortes de las rebanadas */}
      {Array.from({ length: cortes }).map((_, k) => {
        const p = polar(41, (k * 360) / cortes - 90);
        return (
          <Line
            key={`c${k}`}
            x1={CENTRO}
            y1={CENTRO}
            x2={p.x}
            y2={p.y}
            stroke="rgba(110,55,15,0.35)"
            strokeWidth={0.9}
          />
        );
      })}
    </Svg>
  );
});

function PizzaRealista({
  size = 40,
  rebanadas = 8,
  nivel = 0,
  clave = 'pizza',
  retraso = 0,
}) {
  const entrada = useRef(new Animated.Value(0)).current;
  const giro = useRef(new Animated.Value(0)).current;

  // Entrada: crece y gira hasta su lugar
  useEffect(() => {
    Animated.spring(entrada, {
      toValue: 1,
      delay: retraso,
      friction: 6,
      tension: 70,
      useNativeDriver: true,
    }).start();
  }, []);

  // Giro lento continuo
  useEffect(() => {
    let activo = true;
    let ciclo = null;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reducir) => {
        if (!activo || reducir) return;
        ciclo = Animated.loop(
          Animated.timing(giro, {
            toValue: 1,
            duration: 24000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        );
        ciclo.start();
      })
      .catch(() => {});
    return () => {
      activo = false;
      if (ciclo) ciclo.stop();
    };
  }, []);

  const rotacionEntrada = entrada.interpolate({
    inputRange: [0, 1],
    outputRange: ['-120deg', '0deg'],
  });
  const rotacionGiro = giro.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        transform: [{ scale: entrada }, { rotate: rotacionEntrada }],
      }}
    >
      <Animated.View style={{ width: size, height: size, transform: [{ rotate: rotacionGiro }] }}>
        <DibujoPizza size={size} rebanadas={rebanadas} nivel={nivel} clave={clave} />
      </Animated.View>
    </Animated.View>
  );
}

// Solo se redibuja si cambian sus datos (tamaño, rebanadas, etc.)
export default memo(PizzaRealista);