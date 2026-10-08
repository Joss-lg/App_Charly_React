import { useRef } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useFavoritos } from '../context/FavoritosContext';

const ROJO = '#E74C3C';

export function IconoCorazon({ color = '#1A1A1A', lleno = false, size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"
        stroke={lleno ? ROJO : color}
        strokeWidth={2}
        strokeLinejoin="round"
        fill={lleno ? ROJO : 'none'}
      />
    </Svg>
  );
}

export default function BotonFavorito({ id, size = 38, style }) {
  const { esFavorito, toggleFavorito } = useFavoritos();
  const activo = esFavorito(id);
  const escala = useRef(new Animated.Value(1)).current;

  const presionar = () => {
    Haptics.impactAsync(
      activo ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
    ).catch(() => {});

    // "Rebote" del corazón
    escala.stopAnimation();
    Animated.sequence([
      Animated.timing(escala, { toValue: 1.35, duration: 110, useNativeDriver: false }),
      Animated.spring(escala, { toValue: 1, damping: 6, stiffness: 200, useNativeDriver: false }),
    ]).start();

    toggleFavorito(id);
  };

  return (
    <Pressable
      onPress={presionar}
      hitSlop={8}
      style={({ pressed }) => [
        styles.boton,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && { opacity: 0.8 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={activo ? 'Quitar de favoritos' : 'Agregar a favoritos'}
    >
      <Animated.View style={{ transform: [{ scale: escala }] }}>
        <IconoCorazon lleno={activo} size={size * 0.5} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
});