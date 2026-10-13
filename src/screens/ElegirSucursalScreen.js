// src/screens/ElegirSucursalScreen.js
// Pantalla de inicio: logo de Charly y un carrusel deslizante para elegir sucursal.
// Se muestra solo cuando el cliente todavía no ha elegido (ver App.js).

import { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatos } from '../context/DatosContext';
import { useSucursal } from '../context/SucursalContext';

const LOGO = require('../../assets/charly-logo.png');
const ROJO = '#C0392B';
const ROJO_OSCURO = '#7E160C';
const SEPARACION = 16;

// La foto puede ser un enlace (texto) o una imagen local
const comoFuente = (img) => (typeof img === 'string' ? { uri: img } : img);

// ¿Está abierta ahora? (horas en formato 0–24; si cierra pasada la medianoche también funciona)
function estaAbierta(horario) {
  const a = horario?.apertura;
  const c = horario?.cierre;
  if (a == null || c == null) return null;
  const h = new Date().getHours();
  return a < c ? h >= a && h < c : h >= a || h < c;
}

export default function ElegirSucursalScreen() {
  const ancho = useWindowDimensions().width;
  const { sucursales, recargar, cargando } = useDatos();
  const { elegirSucursal } = useSucursal();

  const [indice, setIndice] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Entrada suave: el contenido aparece y sube un poco
  const entrada = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrada, {
      toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [entrada]);

  // Solo sucursales reales (con id)
  const lista = sucursales.filter((s) => s.id != null);

  const anchoTarjeta = Math.min(ancho * 0.76, 340);
  const paso = anchoTarjeta + SEPARACION;
  const relleno = (ancho - anchoTarjeta) / 2;

  const elegir = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    elegirSucursal(id);
  };

  const renderTarjeta = ({ item, index }) => {
    const rango = [(index - 1) * paso, index * paso, (index + 1) * paso];
    const escala = scrollX.interpolate({
      inputRange: rango, outputRange: [0.9, 1, 0.9], extrapolate: 'clamp',
    });
    const opacidad = scrollX.interpolate({
      inputRange: rango, outputRange: [0.7, 1, 0.7], extrapolate: 'clamp',
    });
    const foto = item.imagenes?.[0] || item.imagen;
    const abierta = estaAbierta(item.horario);

    return (
      <Animated.View
        style={{
          width: anchoTarjeta, marginRight: SEPARACION,
          opacity: opacidad, transform: [{ scale: escala }],
        }}
      >
        <Pressable
          onPress={() => elegir(item.id)}
          style={({ pressed }) => [styles.tarjeta, pressed && { transform: [{ scale: 0.98 }] }]}
          accessibilityRole="button"
          accessibilityLabel={`Elegir sucursal ${item.nombre}`}
        >
          {/* Zona de la foto */}
          <View style={styles.zonaFoto}>
            {foto ? (
              <Image source={comoFuente(foto)} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <LinearGradient
                colors={['#F0584A', '#B5271B', '#7E160C']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              >
                <View style={[styles.circulo, { width: 190, height: 190, top: -60, right: -50 }]} />
                <View style={[styles.circulo, { width: 120, height: 120, bottom: -30, left: -30 }]} />
                <Text style={styles.pizzaGrande}>🍕</Text>
              </LinearGradient>
            )}

            {/* Sombra abajo para que se lea el nombre */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.65)']}
              style={styles.sombraFoto}
            />

            {abierta !== null && (
              <View style={[styles.insignia, { backgroundColor: abierta ? '#1FA45B' : '#6B6B6B' }]}>
                <View style={styles.insigniaPunto} />
                <Text style={styles.insigniaTexto}>{abierta ? 'ABIERTO AHORA' : 'CERRADO'}</Text>
              </View>
            )}

            <Text style={styles.nombre} numberOfLines={2}>{item.nombre}</Text>
          </View>

          {/* Datos */}
          <View style={styles.datos}>
            {!!item.direccion && (
              <View style={styles.fila}>
                <Ionicons name="location" size={16} color={ROJO} />
                <Text style={styles.detalle} numberOfLines={2}>{item.direccion}</Text>
              </View>
            )}
            {!!item.horarioTexto && (
              <View style={styles.fila}>
                <Ionicons name="time" size={16} color={ROJO} />
                <Text style={styles.detalle}>{item.horarioTexto}</Text>
              </View>
            )}

            <LinearGradient
              colors={['#D8402F', ROJO]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.boton}
            >
              <Text style={styles.botonTexto}>Entrar</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <LinearGradient colors={[ROJO, '#A82A1C', ROJO_OSCURO]} style={styles.raiz}>
      {/* Círculos decorativos del fondo */}
      <View style={[styles.circuloFondo, { width: 300, height: 300, top: -120, left: -100 }]} />
      <View style={[styles.circuloFondo, { width: 380, height: 380, bottom: -160, right: -140 }]} />

      <SafeAreaView style={styles.contenido} edges={['top', 'bottom']}>
        <Animated.View
          style={{
            flex: 1,
            opacity: entrada,
            transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          }}
        >
          <View style={styles.cabecera}>
            <Image source={LOGO} style={styles.logo} contentFit="contain" />
            <Text style={styles.titulo}>¿A qué sucursal quieres entrar?</Text>
            <View style={styles.subtituloFila}>
              <Ionicons name="swap-horizontal" size={16} color="rgba(255,255,255,0.85)" />
              <Text style={styles.subtitulo}>Desliza y toca la tuya</Text>
            </View>
          </View>

          {lista.length === 0 ? (
            <View style={styles.vacio}>
              <Ionicons name="cloud-offline-outline" size={44} color="#FFFFFF" />
              <Text style={styles.vacioTexto}>
                No pudimos cargar las sucursales. Revisa tu internet e inténtalo de nuevo.
              </Text>
              <Pressable onPress={recargar} style={styles.botonReintentar}>
                <Text style={styles.botonReintentarTexto}>{cargando ? 'Cargando…' : 'Reintentar'}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Animated.FlatList
                data={lista}
                keyExtractor={(s) => String(s.id)}
                renderItem={renderTarjeta}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={paso}
                snapToAlignment="start"
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: relleno, paddingVertical: 14 }}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                  useNativeDriver: true,
                })}
                scrollEventThrottle={16}
                onMomentumScrollEnd={(e) => {
                  const i = Math.round(e.nativeEvent.contentOffset.x / paso);
                  setIndice(Math.max(0, Math.min(i, lista.length - 1)));
                }}
                style={styles.carrusel}
              />
              <View style={styles.puntos}>
                {lista.map((s, i) => (
                  <View key={s.id} style={[styles.punto, i === indice && styles.puntoActivo]} />
                ))}
              </View>
            </>
          )}
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  contenido: { flex: 1 },
  circuloFondo: {
    position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)',
  },

  cabecera: { alignItems: 'center', paddingTop: 6 },
  logo: { width: '78%', height: 170 },
  titulo: {
    fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#FFFFFF',
    textAlign: 'center', marginTop: 2, paddingHorizontal: 24,
  },
  subtituloFila: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  subtitulo: {
    fontFamily: 'Poppins_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.85)',
  },

  carrusel: { flexGrow: 0, marginTop: 14 },
  tarjeta: {
    backgroundColor: '#FFFFFF', borderRadius: 28, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  zonaFoto: { height: 190, justifyContent: 'flex-end', backgroundColor: '#B5271B' },
  circulo: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' },
  pizzaGrande: {
    position: 'absolute', alignSelf: 'center', top: 34, fontSize: 84,
  },
  sombraFoto: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 110 },
  insignia: {
    position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  insigniaPunto: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFFFFF', marginRight: 6,
  },
  insigniaTexto: {
    fontFamily: 'Poppins_700Bold', fontSize: 10.5, color: '#FFFFFF', letterSpacing: 0.8,
  },
  nombre: {
    fontFamily: 'Poppins_700Bold', fontSize: 21, lineHeight: 27, color: '#FFFFFF',
    paddingHorizontal: 16, paddingBottom: 14,
  },

  datos: { padding: 16 },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  detalle: {
    flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 19, color: '#5E5E5E',
  },
  boton: {
    marginTop: 8, borderRadius: 16, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  botonTexto: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#FFFFFF' },

  puntos: { flexDirection: 'row', justifyContent: 'center', marginTop: 6 },
  punto: {
    width: 8, height: 8, borderRadius: 4, marginHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  puntoActivo: { backgroundColor: '#FFFFFF', width: 24 },

  vacio: { padding: 32, alignItems: 'center', gap: 12 },
  vacioTexto: {
    fontFamily: 'Poppins_400Regular', fontSize: 15, color: '#FFFFFF', textAlign: 'center',
  },
  botonReintentar: {
    marginTop: 6, backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingVertical: 11, paddingHorizontal: 28,
  },
  botonReintentarTexto: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: ROJO },
});