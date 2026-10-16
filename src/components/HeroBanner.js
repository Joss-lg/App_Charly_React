// src/components/HeroBanner.js
// Carrusel de arriba del Inicio. Se arma SOLO con lo que hay en Supabase:
// 1) Bienvenida con el lema y el precio más bajo de los tamaños → abre la primera pizza.
// 2) Hasta 2 promociones → llevan a la pestaña Promos.
// 3) Un slide por cada paquete de Promos → lleva a la pestaña Promos.
// 4) Hasta 2 productos en oferta → abren su detalle.
// Se mueve solo, pero se pausa si no estás en Inicio o si el teléfono tiene "Reducir movimiento".
// Los slides sin foto usan un fondo de marca (rojo a negro con marco dorado).

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet,
  FlatList, Pressable, useWindowDimensions, AccessibilityInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useDatos } from '../context/DatosContext';
import { esPaqueteDePromos } from '../data/paquetes';
import { MARCA, COLORES } from '../config/marca';
import ImageBackground from './ImagenFondo';

const INTERVALO = 4500;
const MAX_OFERTAS = 2;
const MAX_PROMOS = 2;
const FUENTE_TITULOS = 'LilitaOne_400Regular';
const DORADO = '#C9A24B';

function formatoPrecio(valor) {
  const n = Number(valor);
  if (isNaN(n)) return '';
  return '$' + n.toFixed(Number.isInteger(n) ? 0 : 2);
}

export default function HeroBanner() {
  const navigation = useNavigation();
  const enPantalla = useIsFocused(); // solo se mueve solo si estás en Inicio
  const { productos, promociones = [], tamanos = [] } = useDatos();
  const { width } = useWindowDimensions();
  const anchoSlide = width - 32;

  const slides = useMemo(() => {
    const pizzas = productos.filter((p) => p.categoria === 'Pizzas');
    const primeraPizza = pizzas[0] || productos.find((p) => !esPaqueteDePromos(p));

    // Precio más bajo de los tamaños (o de las pizzas, si no hay tamaños)
    const precios = (tamanos.length ? tamanos : pizzas)
      .map((t) => Number(t.precio))
      .filter((n) => !isNaN(n) && n > 0);
    const desde = precios.length ? Math.min(...precios) : null;

    const bienvenida = {
      id: 'bienvenida',
      etiqueta: MARCA.nombreMayusculas,
      titulo: MARCA.lema,
      subtitulo: desde ? `Pizzas desde ${formatoPrecio(desde)}` : 'Conoce nuestro menú',
      imagen: primeraPizza?.imagen ?? null,
      irA: primeraPizza ? { pantalla: 'ProductoDetalle', id: primeraPizza.id } : null,
    };

    const promos = promociones.slice(0, MAX_PROMOS).map((p) => ({
      id: `promo-${p.id}`,
      etiqueta: p.etiqueta ? `PROMO ${p.etiqueta}` : 'PROMOCIÓN',
      titulo: p.titulo,
      subtitulo: p.descripcion || 'Pregunta en tu sucursal',
      imagen: null,
      irA: { pantalla: 'Promos' },
    }));

    const paquetes = productos.filter(esPaqueteDePromos).map((p) => ({
      id: `paquete-${p.id}`,
      etiqueta: 'PAQUETE',
      titulo: p.nombre,
      subtitulo: p.descripcion
        ? `${p.descripcion} · ${formatoPrecio(p.precio)}`
        : formatoPrecio(p.precio),
      imagen: p.imagen,
      irA: { pantalla: 'Promos' },
    }));

    const ofertas = productos
      .filter((p) => p.oferta && !esPaqueteDePromos(p))
      .slice(0, MAX_OFERTAS)
      .map((p) => ({
        id: `oferta-${p.id}`,
        etiqueta: 'OFERTA',
        titulo: p.nombre,
        subtitulo: `${p.precioDesde ? 'Desde ' : ''}${formatoPrecio(p.precio)}`,
        imagen: p.imagen,
        irA: { pantalla: 'ProductoDetalle', id: p.id },
      }));

    return [bienvenida, ...promos, ...paquetes, ...ofertas];
  }, [productos, promociones, tamanos]);

  const listaRef = useRef(null);
  const indiceRef = useRef(0);
  const timerRef = useRef(null);
  const [activo, setActivo] = useState(0);
  const [reducirMovimiento, setReducirMovimiento] = useState(false);

  // Respeta "Reducir movimiento" del teléfono
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => vivo && setReducirMovimiento(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducirMovimiento);
    return () => {
      vivo = false;
      sub?.remove?.();
    };
  }, []);

  // Si cambia el número de slides (llegan los datos), regresa al primero si hace falta
  useEffect(() => {
    if (indiceRef.current >= slides.length) {
      indiceRef.current = 0;
      setActivo(0);
      listaRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [slides.length]);

  const detenerAuto = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const iniciarAuto = () => {
    detenerAuto();
    if (!enPantalla || reducirMovimiento || slides.length < 2) return;
    timerRef.current = setInterval(() => {
      const siguiente = (indiceRef.current + 1) % slides.length;
      listaRef.current?.scrollToOffset({ offset: siguiente * anchoSlide, animated: true });
      indiceRef.current = siguiente;
      setActivo(siguiente);
    }, INTERVALO);
  };

  // Arranca o se pausa según la pestaña, el tamaño y "Reducir movimiento"
  useEffect(() => {
    iniciarAuto();
    return detenerAuto;
  }, [anchoSlide, enPantalla, reducirMovimiento, slides.length]);

  const alTerminarScroll = (e) => {
    const indice = Math.round(e.nativeEvent.contentOffset.x / anchoSlide);
    indiceRef.current = indice;
    setActivo(indice);
    iniciarAuto();
  };

  const abrir = (slide) => {
    if (!slide.irA) return;
    if (slide.irA.pantalla === 'ProductoDetalle') {
      navigation.navigate('ProductoDetalle', { id: slide.irA.id });
    } else {
      navigation.navigate(slide.irA.pantalla);
    }
  };

  return (
    <View style={[styles.contenedor, { width: anchoSlide }]}>
      <FlatList
        ref={listaRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={detenerAuto}
        onMomentumScrollEnd={alTerminarScroll}
        getItemLayout={(_, index) => ({ length: anchoSlide, offset: anchoSlide * index, index })}
        initialNumToRender={2}
        windowSize={3}
        renderItem={({ item }) => {
          const contenido = (
            <>
              {/* Degradado: transparente arriba, oscuro abajo donde va el texto */}
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.88)']}
                locations={[0, 0.4, 1]}
                style={StyleSheet.absoluteFill}
              />

              <View style={styles.contenido}>
                <View style={styles.etiqueta}>
                  <Text style={styles.etiquetaTexto}>{item.etiqueta}</Text>
                </View>
                <Text style={styles.titulo} numberOfLines={2}>{item.titulo}</Text>
                <View style={styles.lineaDorada} />
                <View style={styles.filaInferior}>
                  <Text style={styles.subtitulo} numberOfLines={2}>{item.subtitulo}</Text>
                  {item.irA && <Text style={styles.verMas}>Ver más ›</Text>}
                </View>
              </View>
            </>
          );

          return (
            <Pressable
              onPress={() => abrir(item)}
              disabled={!item.irA}
              accessibilityRole="button"
              accessibilityLabel={`${item.titulo}. ${item.subtitulo}`}
            >
              {item.imagen ? (
                <ImageBackground
                  source={{ uri: item.imagen }}
                  style={[styles.slide, { width: anchoSlide }]}
                >
                  {contenido}
                </ImageBackground>
              ) : (
                // Sin foto: fondo de marca (rojo a negro, marco dorado y anillos suaves)
                <View style={[styles.slide, styles.slideSinFoto, { width: anchoSlide }]}>
                  <LinearGradient
                    colors={[COLORES.primarioOscuro, '#3A0B0D', COLORES.negro]}
                    locations={[0, 0.55, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View pointerEvents="none" style={styles.anilloGrande} />
                  <View pointerEvents="none" style={styles.anilloChico} />
                  <View pointerEvents="none" style={styles.marco} />
                  {contenido}
                </View>
              )}
            </Pressable>
          );
        }}
      />

      {/* Puntitos arriba a la derecha, lejos del texto (solo si hay más de uno) */}
      {slides.length > 1 && (
        <View style={styles.puntos} pointerEvents="none">
          {slides.map((s, i) => (
            <View key={s.id} style={[styles.punto, i === activo && styles.puntoActivo]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    height: 210,
    marginTop: 12,
    alignSelf: 'center',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  slide: {
    height: 210,
    justifyContent: 'flex-end',
  },
  slideSinFoto: {
    backgroundColor: COLORES.negro,
    overflow: 'hidden',
  },
  marco: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(201,162,75,0.5)',
  },
  anilloGrande: {
    position: 'absolute',
    top: -40,
    right: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1.5,
    borderColor: 'rgba(201,162,75,0.28)',
  },
  anilloChico: {
    position: 'absolute',
    top: -6,
    right: -16,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(201,162,75,0.2)',
  },
  contenido: {
    padding: 18,
    paddingBottom: 20,
  },
  etiqueta: {
    alignSelf: 'flex-start',
    backgroundColor: COLORES.primario,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DORADO,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 6,
  },
  etiquetaTexto: {
    color: COLORES.textoSobrePrimario,
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  titulo: {
    color: '#FFFFFF',
    fontFamily: FUENTE_TITULOS,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  lineaDorada: {
    width: 36,
    height: 2,
    backgroundColor: DORADO,
    borderRadius: 1,
    marginTop: 6,
    marginBottom: 6,
  },
  filaInferior: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  subtitulo: {
    flex: 1,
    color: 'rgba(255,255,255,0.88)',
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
  },
  verMas: {
    color: COLORES.primarioClaro,
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
  },
  puntos: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  punto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  puntoActivo: {
    width: 16,
    backgroundColor: DORADO,
  },
});