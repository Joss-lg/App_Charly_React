// src/components/AlertaPaquetes.js
// Alerta emergente al abrir la app (estilo DiDi) con los paquetes de Promociones.
// - Usa la misma regla que la pantalla de Promos (esPaqueteDePromos), en el orden de Supabase.
// - La foto se muestra COMPLETA, con su proporción real (sin recortar el texto de la imagen).
// - Nombre, descripción y precio van debajo de la foto, no encima.
// - Sale una sola vez cada que se abre la app.
// - Cada vez que abres la app empieza con un paquete distinto.
// - Se puede deslizar y avanza sola cada 4 segundos hasta que el usuario la toca.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  FlatList,
  Dimensions,
  Image as ImagenRN,
} from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDatos } from '../context/DatosContext';
import { esPaqueteDePromos } from '../data/paquetes';
import { MARCA, COLORES } from '../config/marca';

// ---------- Ajustes ----------
const CLAVE_INDICE = `${MARCA.prefijoGuardado}:alertaPaquetes:siguienteIndice`;
const RETRASO_MOSTRAR = 900; // ms después de que cargan los datos
const AUTO_AVANCE = 4000; // ms entre paquete y paquete
const PROPORCION_RESPALDO = 16 / 10; // si no se puede medir la foto

// Colores de la marca
const ROJO = COLORES.primario;
const ROJO_OSCURO = COLORES.primarioOscuro;
const ROJO_CLARO = COLORES.primarioClaro;
const NEGRO = COLORES.negro;

// Medidas
const { width: ANCHO_PANTALLA } = Dimensions.get('window');
const ANCHO_TARJETA = Math.min(ANCHO_PANTALLA - 48, 350);
const RELLENO = 18;
const ANCHO_FOTO = ANCHO_TARJETA - RELLENO * 2;

// Para que solo salga una vez por cada vez que se abre la app
let yaSeMostroEnEstaSesion = false;

function formatoPrecio(valor) {
  const n = Number(valor);
  if (isNaN(n)) return '';
  const texto = n.toFixed(Number.isInteger(n) ? 0 : 2);
  return '$' + texto.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Mide el ancho y alto real de una foto (con límite de tiempo)
function medirFoto(uri) {
  return new Promise((resolve) => {
    const limite = setTimeout(() => resolve(null), 2500);
    ImagenRN.getSize(
      uri,
      (w, h) => {
        clearTimeout(limite);
        resolve(w > 0 && h > 0 ? w / h : null);
      },
      () => {
        clearTimeout(limite);
        resolve(null);
      }
    );
  });
}

function IconoCerrar() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M6 6 L18 18 M18 6 L6 18"
        stroke="#FFFFFF"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function AlertaPaquetes({ onVerPaquete, oscuro = false }) {
  const { productos } = useDatos();

  const [visible, setVisible] = useState(false);
  const [indice, setIndice] = useState(0);
  const [proporcion, setProporcion] = useState(PROPORCION_RESPALDO);

  const indiceRef = useRef(0);
  const listaRef = useRef(null);
  const usuarioToco = useRef(false);
  const fondo = useRef(new Animated.Value(0)).current;
  const escala = useRef(new Animated.Value(0.88)).current;

  // Los mismos paquetes que salen en Promociones (solo los que tienen foto)
  const paquetes = useMemo(
    () => (productos || []).filter((p) => esPaqueteDePromos(p) && p.imagen),
    [productos]
  );

  // Alto de la foto según su proporción real (con límites para que no quede gigante)
  const altoFoto = useMemo(() => {
    const alto = ANCHO_FOTO / proporcion;
    return Math.round(Math.min(Math.max(alto, ANCHO_FOTO * 0.5), ANCHO_FOTO * 1.1));
  }, [proporcion]);

  // Mostrar la alerta cuando ya hay paquetes cargados
  useEffect(() => {
    if (yaSeMostroEnEstaSesion || paquetes.length === 0) return;
    let cancelado = false;

    const temporizador = setTimeout(async () => {
      if (cancelado) return;
      let inicio = 0;
      try {
        const guardado = await AsyncStorage.getItem(CLAVE_INDICE);
        const n = parseInt(guardado ?? '0', 10);
        if (!isNaN(n)) inicio = n % paquetes.length;
        await AsyncStorage.setItem(CLAVE_INDICE, String((inicio + 1) % paquetes.length));
      } catch (e) {
        // si falla AsyncStorage, empieza en el primero
      }

      // Medimos la foto antes de mostrar, para que la tarjeta no "brinque"
      const medida = await medirFoto(paquetes[inicio].imagen);
      if (cancelado) return;
      if (medida) setProporcion(medida);

      yaSeMostroEnEstaSesion = true;
      indiceRef.current = inicio;
      usuarioToco.current = false;
      setIndice(inicio);
      setVisible(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }, RETRASO_MOSTRAR);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [paquetes.length]);

  // Animación de entrada
  useEffect(() => {
    if (!visible) return;
    fondo.setValue(0);
    escala.setValue(0.88);
    Animated.parallel([
      Animated.timing(fondo, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(escala, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  // Avance automático entre paquetes
  useEffect(() => {
    if (!visible || paquetes.length < 2) return;
    const id = setInterval(() => {
      if (usuarioToco.current) return;
      const siguiente = (indiceRef.current + 1) % paquetes.length;
      indiceRef.current = siguiente;
      setIndice(siguiente);
      listaRef.current?.scrollToIndex({ index: siguiente, animated: true });
    }, AUTO_AVANCE);
    return () => clearInterval(id);
  }, [visible, paquetes.length]);

  const cerrar = useCallback(
    (despues) => {
      Animated.parallel([
        Animated.timing(fondo, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(escala, { toValue: 0.92, duration: 180, useNativeDriver: true }),
      ]).start(() => {
        setVisible(false);
        if (typeof despues === 'function') setTimeout(despues, 60);
      });
    },
    [fondo, escala]
  );

  const verPaquete = () => {
    const paquete = paquetes[indiceRef.current];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    cerrar(() => {
      if (paquete && onVerPaquete) onVerPaquete(paquete);
    });
  };

  const alTerminarDeslizar = (e) => {
    const nuevo = Math.round(e.nativeEvent.contentOffset.x / ANCHO_FOTO);
    if (nuevo !== indiceRef.current && nuevo >= 0 && nuevo < paquetes.length) {
      indiceRef.current = nuevo;
      setIndice(nuevo);
    }
  };

  if (paquetes.length === 0) return null;

  const actual = paquetes[indice] || paquetes[0];
  const colorTarjeta = oscuro ? '#1C1C1C' : '#FFFFFF';
  const colorTitulo = oscuro ? '#FFFFFF' : NEGRO;
  const colorSecundario = oscuro ? '#B5B5B5' : '#6E6E6E';
  const colorPrecio = oscuro ? ROJO_CLARO : ROJO;
  const colorPuntoApagado = oscuro ? '#444444' : '#E3E3E3';
  const colorBordeFoto = oscuro ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const renderPaquete = ({ item }) => (
    <View style={{ width: ANCHO_FOTO, height: altoFoto }}>
      <Image
        source={{ uri: item.imagen }}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        transition={200}
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => cerrar()}
    >
      <View style={styles.raiz}>
        {/* Fondo oscuro detrás de la alerta (tocarlo cierra) */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.fondo, { opacity: fondo }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => cerrar()} />
        </Animated.View>

        <View style={styles.centro} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.tarjeta,
              { backgroundColor: colorTarjeta, opacity: fondo, transform: [{ scale: escala }] },
            ]}
          >
            {/* Rayita roja de la marca */}
            <View style={styles.rayitaMarca} />

            <Text style={[styles.titulo, { color: colorTitulo }]}>
              Aprovecha nuestros paquetes
            </Text>
            <Text style={[styles.subtitulo, { color: colorSecundario }]}>
              Los tenemos listos para ti
            </Text>

            {/* Foto completa, sin recortes */}
            <View
              style={[
                styles.marcoFoto,
                { height: altoFoto, borderColor: colorBordeFoto },
              ]}
            >
              <FlatList
                ref={listaRef}
                data={paquetes}
                keyExtractor={(p) => String(p.id)}
                renderItem={renderPaquete}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={indice}
                getItemLayout={(_, i) => ({ length: ANCHO_FOTO, offset: ANCHO_FOTO * i, index: i })}
                onScrollBeginDrag={() => {
                  usuarioToco.current = true;
                }}
                onMomentumScrollEnd={alTerminarDeslizar}
              />
            </View>

            {paquetes.length > 1 && (
              <View style={styles.puntos}>
                {paquetes.map((p, i) => (
                  <View
                    key={p.id}
                    style={[
                      styles.punto,
                      i === indice ? styles.puntoActivo : { backgroundColor: colorPuntoApagado },
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Datos del paquete que se está viendo */}
            <View style={styles.filaDatos}>
              <View style={styles.columnaNombre}>
                <Text style={[styles.nombre, { color: colorTitulo }]} numberOfLines={1}>
                  {actual.nombre}
                </Text>
                {!!actual.descripcion && (
                  <Text style={[styles.descripcion, { color: colorSecundario }]} numberOfLines={2}>
                    {actual.descripcion}
                  </Text>
                )}
              </View>
              <View style={styles.columnaPrecio}>
                {actual.precioDesde && (
                  <Text style={[styles.desde, { color: colorSecundario }]}>Desde</Text>
                )}
                <Text style={[styles.precio, { color: colorPrecio }]}>
                  {formatoPrecio(actual.precio)}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={verPaquete}
              style={({ pressed }) => [
                styles.boton,
                pressed && { transform: [{ scale: 0.97 }], backgroundColor: ROJO_OSCURO },
              ]}
            >
              <Text style={styles.textoBoton}>Ver paquete</Text>
            </Pressable>
          </Animated.View>

          <Animated.View style={{ opacity: fondo }}>
            <Pressable
              onPress={() => cerrar()}
              hitSlop={16}
              style={styles.botonCerrar}
              accessibilityLabel="Cerrar"
            >
              <IconoCerrar />
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  raiz: {
    flex: 1,
  },
  fondo: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tarjeta: {
    width: ANCHO_TARJETA,
    borderRadius: 26,
    padding: RELLENO,
    paddingTop: 20,
    overflow: 'hidden',
  },
  rayitaMarca: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: ROJO,
    marginBottom: 10,
  },
  titulo: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 21,
    lineHeight: 27,
  },
  subtitulo: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    marginTop: 1,
    marginBottom: 14,
  },
  marcoFoto: {
    width: ANCHO_FOTO,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: '#141414',
  },
  puntos: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  punto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  puntoActivo: {
    width: 18,
    backgroundColor: ROJO,
  },
  filaDatos: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  columnaNombre: {
    flex: 1,
    paddingRight: 12,
  },
  nombre: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    lineHeight: 22,
  },
  descripcion: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  columnaPrecio: {
    alignItems: 'flex-end',
  },
  desde: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    lineHeight: 13,
  },
  precio: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    lineHeight: 30,
  },
  boton: {
    marginTop: 14,
    height: 52,
    borderRadius: 16,
    backgroundColor: ROJO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBoton: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: COLORES.textoSobrePrimario,
  },
  botonCerrar: {
    marginTop: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
