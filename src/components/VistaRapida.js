// src/components/VistaRapida.js
// Vista rápida de un producto (se abre al mantener presionada una tarjeta).
// - Foto completa con su forma real, favorito, nombre, descripción y precio.
// - Botones: Ver detalle, WhatsApp y Compartir.
// - Con varias sucursales, antes de escribir por WhatsApp se elige la sucursal.
// - iPhone: fondo difuminado. Android: fondo oscuro semitransparente
//   (el difuminado de Android no es confiable).

import { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, Pressable, Animated,
  Share, Linking, Alert, Platform, useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../context/ThemeContext';
import { useDatos } from '../context/DatosContext';
import BotonFavorito from './BotonFavorito';
import ElegirSucursal from './ElegirSucursal';
import { IconoChat } from './IconosUI';
import { MARCA, COLORES } from '../config/marca';

const ES_ANDROID = Platform.OS === 'android';

// Forma inicial mientras carga la foto
const PROPORCION_INICIAL = 1.9;

// Límite para fotos muy altas: la tarjeta nunca se sale de la pantalla
const PROPORCION_MINIMA = 0.9;

// Recuerda la forma de cada foto ya cargada (así no "brinca" la segunda vez)
const proporcionesConocidas = new Map();

function IconoCompartir({ color, size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 3v12M8 7l4-4 4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export default function VistaRapida({ producto, visible, onCerrar, onVerDetalle }) {
  const { tema, modoOscuro } = useTema();
  const { sucursales = [] } = useDatos();
  const { width } = useWindowDimensions();
  const anchoTarjeta = width - 40;

  const [proporcion, setProporcion] = useState(
    () => proporcionesConocidas.get(producto.imagen) ?? PROPORCION_INICIAL
  );
  // Se abre la lista de sucursales (solo cuando hay varias)
  const [eligiendo, setEligiendo] = useState(false);

  const escala = useRef(new Animated.Value(0.85)).current;
  const opacidad = useRef(new Animated.Value(0)).current;

  const textoPrecio = `${producto.precioDesde ? 'desde ' : ''}$${producto.precio}`;

  // Animación de apertura: crece con resorte y aparece el fondo
  // (también corre la primera vez, cuando la vista se crea ya abierta)
  useEffect(() => {
    if (!visible) return;
    escala.setValue(0.85);
    opacidad.setValue(0);
    Animated.parallel([
      Animated.spring(escala, { toValue: 1, damping: 14, stiffness: 180, useNativeDriver: true }),
      Animated.timing(opacidad, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  // Al cargar la foto, el recuadro toma su forma exacta para que se vea completa
  const alCargarFoto = (e) => {
    const ancho = e?.source?.width;
    const alto = e?.source?.height;
    if (!ancho || !alto) return;
    const nueva = Math.max(ancho / alto, PROPORCION_MINIMA);
    proporcionesConocidas.set(producto.imagen, nueva);
    setProporcion(nueva);
  };

  // Animación de cierre; "despues" se ejecuta cuando termina (ej. navegar)
  const cerrar = (despues) => {
    Animated.parallel([
      Animated.timing(escala, { toValue: 0.9, duration: 150, useNativeDriver: true }),
      Animated.timing(opacidad, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      onCerrar();
      if (despues) despues();
    });
  };

  // Texto del mensaje que se comparte (los emojis aquí son parte del mensaje, no íconos de la app)
  const compartir = () => {
    const unica = sucursales.length === 1 ? sucursales[0] : null;
    const comoPedir = unica
      ? `Pide al ${unica.telefonoFormato || unica.telefono}`
      : `Pide en tu sucursal ${MARCA.nombre} más cercana`;
    Share.share({
      message: `🍕 ${producto.nombre} en ${MARCA.nombre} ${textoPrecio}\n${producto.descripcion}\n\n${comoPedir}`,
    }).catch(() => {});
  };

  const abrirWhatsApp = async (sucursal) => {
    if (!sucursal?.whatsapp) {
      Alert.alert('Ups', 'Esta sucursal no tiene WhatsApp registrado.');
      return;
    }
    const mensaje = `${MARCA.saludoWhatsApp} Quiero información sobre "${producto.nombre}" (${textoPrecio}) 🍕`;
    try {
      await Linking.openURL(`https://wa.me/${sucursal.whatsapp}?text=${encodeURIComponent(mensaje)}`);
    } catch {
      Alert.alert('Ups', 'No se pudo abrir WhatsApp.');
    }
  };

  // Con una sola sucursal va directo; con varias, primero se elige
  const whatsapp = () => {
    if (sucursales.length <= 1) {
      abrirWhatsApp(sucursales[0]);
      return;
    }
    setEligiendo(true);
  };

  const fondoBotonSecundario = modoOscuro ? '#333333' : '#F0F0F0';

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={() => cerrar()}>
      {/* Fondo: tocarlo cierra */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacidad }]}>
        {ES_ANDROID ? (
          // Android: fondo oscuro parejo (sin difuminado)
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        ) : (
          // iPhone: difuminado + capa oscura suave
          <>
            <BlurView intensity={40} tint={modoOscuro ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
          </>
        )}
        <Pressable style={StyleSheet.absoluteFill} onPress={() => cerrar()} accessibilityLabel="Cerrar vista rápida" />
      </Animated.View>

      <View style={styles.centro} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.tarjeta,
            {
              width: anchoTarjeta,
              backgroundColor: tema.card,
              opacity: opacidad,
              transform: [{ scale: escala }],
            },
          ]}
        >
          {/* Foto completa: el recuadro toma la forma real de la imagen */}
          <View style={[styles.imagen, { width: anchoTarjeta, height: anchoTarjeta / proporcion }]}>
            <Image
              source={{ uri: producto.imagen }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              onLoad={alCargarFoto}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.85)']}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <BotonFavorito id={producto.id} size={40} style={styles.favorito} />

            {/* Etiqueta de oferta con ícono dibujado (sin emoji) */}
            {producto.oferta && (
              <View style={styles.badgeOferta}>
                <Ionicons name="flame" size={11} color={COLORES.textoSobrePrimario} />
                <Text style={styles.badgeOfertaTexto}>¡OFERTA!</Text>
              </View>
            )}

            <View style={styles.textoImagen}>
              <Text style={styles.categoria}>
                {producto.subcategoria
                  ? `PIZZA ${producto.subcategoria.toUpperCase()}`
                  : producto.categoria.toUpperCase()}
              </Text>
              <Text style={styles.nombre} numberOfLines={1}>{producto.nombre}</Text>
            </View>
          </View>

          {/* Info */}
          <View style={styles.cuerpo}>
            <Text style={[styles.descripcion, { color: tema.textoSecundario }]}>
              {producto.descripcion}
            </Text>
            <View style={styles.precioRow}>
              {producto.precioDesde && (
                <Text style={[styles.desde, { color: tema.textoSecundario }]}>Desde</Text>
              )}
              <Text style={[styles.precio, { color: tema.precio }]}>${producto.precio}</Text>
              <Text style={[styles.moneda, { color: tema.textoSoloInfo }]}>MXN</Text>
            </View>

            {/* Acciones rápidas */}
            <View style={styles.acciones}>
              <Pressable
                style={({ pressed }) => [styles.botonPrincipal, pressed && { opacity: 0.85 }]}
                onPress={() => cerrar(onVerDetalle)}
                accessibilityRole="button"
              >
                <Text style={styles.botonPrincipalTexto}>Ver detalle</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.botonCirculo, { backgroundColor: COLORES.whatsapp }, pressed && { opacity: 0.8 }]}
                onPress={whatsapp}
                accessibilityRole="button"
                accessibilityLabel="Preguntar por WhatsApp"
              >
                <IconoChat color="#FFFFFF" size={21} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.botonCirculo, { backgroundColor: fondoBotonSecundario }, pressed && { opacity: 0.8 }]}
                onPress={compartir}
                accessibilityRole="button"
                accessibilityLabel="Compartir"
              >
                <IconoCompartir color={tema.texto} />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Elegir sucursal (va dentro del Modal para que se abra encima) */}
      <ElegirSucursal
        visible={eligiendo}
        titulo="¿A qué sucursal le escribimos?"
        sucursales={sucursales}
        onCerrar={() => setEligiendo(false)}
        onElegir={(s) => {
          setEligiendo(false);
          abrirWhatsApp(s);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tarjeta: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 20,
  },
  imagen: {
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  favorito: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  badgeOferta: {
    position: 'absolute',
    top: 16,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORES.primario,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeOfertaTexto: {
    color: COLORES.textoSobrePrimario,
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
  },
  textoImagen: {
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  categoria: {
    color: COLORES.primarioClaro,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    letterSpacing: 2,
  },
  nombre: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
    lineHeight: 32,
  },
  cuerpo: {
    padding: 18,
  },
  descripcion: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 21,
  },
  precioRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 8,
  },
  desde: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  precio: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
  },
  moneda: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  acciones: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  botonPrincipal: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORES.primario,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonPrincipalTexto: {
    color: COLORES.textoSobrePrimario,
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
  },
  botonCirculo: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});