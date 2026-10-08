// src/components/PromoCard.js
// Tarjeta de una promoción (el color de fondo viene de Supabase, columna "color").
// Si la promo aplica hoy, muestra la etiqueta "¡HOY!".

import { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { IconoInicio, IconoPromos } from './IconosTab';
import { IconoDelivery } from './IconosExtra';
import { IconoChevron } from './IconosUI';
import { COLORES } from '../config/marca';

const ICONOS_PROMO = {
  pizza: (props) => <IconoInicio {...props} activo />,
  delivery: IconoDelivery,
};

export default function PromoCard({ promo, onPress }) {
  const escala = useRef(new Animated.Value(1)).current;
  const aplicaHoy = promo.dia !== null && promo.dia === new Date().getDay();
  const Icono = ICONOS_PROMO[promo.icono] ?? ((p) => <IconoPromos {...p} activo />);

  const presionar = () =>
    Animated.spring(escala, { toValue: 0.96, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const soltar = () =>
    Animated.spring(escala, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();

  return (
    <Animated.View style={[styles.contenedor, { transform: [{ scale: escala }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={presionar}
        onPressOut={soltar}
        style={[styles.card, { backgroundColor: promo.color || COLORES.primario }]}
        accessibilityRole="button"
        accessibilityLabel={`${promo.titulo}. ${promo.descripcion}`}
      >
        {/* Círculos decorativos */}
        <View style={styles.circuloGrande} />
        <View style={styles.circuloChico} />

        <View style={styles.filaSuperior}>
          <View style={styles.iconoCirculo}>
            <Icono color="#FFFFFF" size={20} />
          </View>
          {aplicaHoy ? (
            <View style={styles.hoyBadge}>
              <Text style={styles.hoyTexto}>¡HOY!</Text>
            </View>
          ) : (
            <Text style={styles.etiqueta}>{promo.etiqueta}</Text>
          )}
        </View>

        <Text style={styles.titulo} numberOfLines={1}>{promo.titulo}</Text>
        <Text style={styles.descripcion} numberOfLines={2}>{promo.descripcion}</Text>

        <View style={styles.verMasFila}>
          <Text style={styles.verMas}>Ver promo</Text>
          <IconoChevron color="#FFFFFF" size={13} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    minHeight: 160,
    overflow: 'hidden',
  },
  circuloGrande: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.09)',
    top: -40,
    right: -35,
  },
  circuloChico: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -20,
    left: -15,
  },
  filaSuperior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconoCirculo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  etiqueta: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 8,
    letterSpacing: 1,
  },
  hoyBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  hoyTexto: {
    color: COLORES.primario,
    fontFamily: 'Poppins_700Bold',
    fontSize: 9,
  },
  titulo: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
  },
  descripcion: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    flex: 1,
  },
  verMasFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 8,
  },
  verMas: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },
});