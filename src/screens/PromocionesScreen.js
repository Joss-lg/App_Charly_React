// src/screens/PromocionesScreen.js
// Pestaña "Promos": los paquetes de la pizzería.
// - Arriba: un paquete destacado que CAMBIA CADA DÍA (va rotando entre todos).
// - Luego: los demás paquetes, cada uno con botón directo a WhatsApp.
// - Al final: cómo pedir en 3 pasos + botones de llamar y WhatsApp.
// - Con varias sucursales, antes de escribir o llamar se elige la sucursal.
// - Al tocar otra vez "Promos" en la barra de abajo, sube hasta arriba.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  RefreshControl, Linking, Alert, Animated, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useScrollToTop, useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useTema } from '../context/ThemeContext';
import { useDatos } from '../context/DatosContext';
import BotonFavorito from '../components/BotonFavorito';
import ElegirSucursal, { estaAbierta } from '../components/ElegirSucursal';
import { IconoChat, IconoTelefono } from '../components/IconosUI';
import { esPaqueteDePromos } from '../data/paquetes';
import { MARCA, COLORES } from '../config/marca';

const ROJO = COLORES.primario;
const VERDE_WHATS = COLORES.whatsapp;
const PROPORCION_FOTO = 16 / 9; // las fotos de los paquetes son horizontales

// ---------- Ajuste para probar (déjalo en 0) ----------
// Cambia a 1, 2 o 3 para ver qué paquete saldría mañana, pasado, etc.
// IMPORTANTE: regrésalo a 0 cuando termines de probar.
const DIAS_DE_PRUEBA = 0;

const PASOS = [
  { titulo: 'Elige tu paquete', texto: 'Revisa qué incluye cada uno.' },
  { titulo: 'Escríbenos o llama', texto: 'A tu sucursal más cercana, por WhatsApp o teléfono.' },
  { titulo: 'Disfrútalo', texto: 'Recién horneada, lista para ti.' },
];

function formatoPrecio(valor) {
  const n = Number(valor);
  if (isNaN(n)) return '';
  return '$' + n.toFixed(Number.isInteger(n) ? 0 : 2);
}

// Número del día de hoy (cambia a medianoche, hora del teléfono)
function numeroDeHoy() {
  const hoy = new Date();
  return (
    Math.floor(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) / 86400000) +
    DIAS_DE_PRUEBA
  );
}

export default function PromocionesScreen() {
  const { tema, modoOscuro } = useTema();
  const { productos, sucursales = [], recargar } = useDatos();
  const navigation = useNavigation();
  const [refrescando, setRefrescando] = useState(false);
  const [dia, setDia] = useState(numeroDeHoy);

  // Acción que espera a que el usuario elija sucursal ({ titulo, hacer })
  const [pendiente, setPendiente] = useState(null);

  // Al tocar otra vez "Promos" en la barra de abajo, sube hasta arriba
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  // Animación de entrada de la tarjeta destacada
  const entrada = useRef(new Animated.Value(0)).current;

  // Revisa si ya cambió el día al entrar a la pestaña...
  useFocusEffect(
    useCallback(() => {
      setDia(numeroDeHoy());
    }, [])
  );

  // ...y al regresar a la app desde segundo plano
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') setDia(numeroDeHoy());
    });
    return () => sub.remove();
  }, []);

  // Solo los paquetes de Promos, en el orden en que vienen de Supabase
  const paquetes = useMemo(() => productos.filter((p) => esPaqueteDePromos(p)), [productos]);

  // El destacado cambia cada día y va rotando entre todos los paquetes
  const destacado =
    paquetes.length > 0 ? paquetes[((dia % paquetes.length) + paquetes.length) % paquetes.length] : null;
  const resto = paquetes.filter((p) => p.id !== destacado?.id);

  useEffect(() => {
    if (!destacado) return;
    entrada.setValue(0);
    Animated.spring(entrada, {
      toValue: 1,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [destacado?.id]);

  // "Abierto ahora" si al menos una sucursal está abierta
  const estados = sucursales.map(estaAbierta).filter((e) => e !== null);
  const abierta = estados.length ? estados.some(Boolean) : null;

  const alRefrescar = async () => {
    setRefrescando(true);
    setDia(numeroDeHoy());
    await recargar();
    setRefrescando(false);
  };

  const abrirDetalle = (p) => {
    navigation.navigate('ProductoDetalle', { id: p.id });
  };

  // Con una sola sucursal se hace directo; con varias, primero se elige
  const conSucursal = (titulo, hacer) => {
    if (sucursales.length <= 1) {
      hacer(sucursales[0]);
      return;
    }
    setPendiente({ titulo, hacer });
  };

  const abrirWhatsApp = async (sucursal, paquete) => {
    if (!sucursal?.whatsapp) {
      Alert.alert('Ups', 'Esta sucursal no tiene WhatsApp registrado.');
      return;
    }
    const mensaje = paquete
      ? `${MARCA.saludoWhatsApp} Quiero pedir el ${paquete.nombre} (${formatoPrecio(paquete.precio)}).`
      : `${MARCA.saludoWhatsApp} Quiero información sobre sus paquetes.`;
    try {
      await Linking.openURL(
        `https://wa.me/${sucursal.whatsapp}?text=${encodeURIComponent(mensaje)}`
      );
    } catch {
      Alert.alert('Ups', 'No se pudo abrir WhatsApp.');
    }
  };

  const abrirLlamada = async (sucursal) => {
    if (!sucursal?.telefono) {
      Alert.alert('Ups', 'Esta sucursal no tiene teléfono registrado.');
      return;
    }
    try {
      await Linking.openURL(`tel:${sucursal.telefono}`);
    } catch {
      Alert.alert('Ups', 'No se pudo abrir el marcador.');
    }
  };

  const pedirPorWhatsApp = (paquete) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    conSucursal('¿A qué sucursal le escribimos?', (s) => abrirWhatsApp(s, paquete));
  };

  const llamar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    conSucursal('¿A qué sucursal llamamos?', abrirLlamada);
  };

  const bordeSuave = modoOscuro ? '#333333' : '#E8E8E8';
  const fondoSuave = modoOscuro ? '#2A2A2A' : '#F2F2F2';

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: tema.fondo }]}>
      <ScrollView
        ref={scrollRef}
        style={{ backgroundColor: tema.fondo }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={alRefrescar}
            tintColor={ROJO}
            colors={[ROJO]}
          />
        }
      >
        {/* ── ENCABEZADO ── */}
        <View style={styles.encabezado}>
          <View style={styles.filaTitulo}>
            <Text style={[styles.titulo, { color: tema.texto }]}>Paquetes</Text>
            {abierta !== null && (
              <View style={[styles.estado, { backgroundColor: fondoSuave }]}>
                <View
                  style={[
                    styles.puntoEstado,
                    { backgroundColor: abierta ? COLORES.abierto : COLORES.cerrado },
                  ]}
                />
                <Text style={[styles.textoEstado, { color: tema.texto }]}>
                  {abierta ? 'Abierto ahora' : 'Cerrado'}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.subtitulo, { color: tema.textoSecundario }]}>
            Pizza, refresco y más en un solo pedido.
          </Text>
        </View>

        {paquetes.length === 0 ? (
          <Text style={[styles.vacio, { color: tema.textoSecundario }]}>
            Cargando los paquetes...{'\n'}Desliza hacia abajo para actualizar.
          </Text>
        ) : (
          <>
            {/* ── DESTACADO DEL DÍA ── */}
            {destacado && (
              <Animated.View
                style={[
                  styles.bloque,
                  {
                    opacity: entrada,
                    transform: [
                      {
                        translateY: entrada.interpolate({
                          inputRange: [0, 1],
                          outputRange: [24, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Pressable
                  onPress={() => abrirDetalle(destacado)}
                  style={({ pressed }) => [
                    styles.tarjetaDestacada,
                    { backgroundColor: tema.card, borderColor: ROJO },
                    pressed && { transform: [{ scale: 0.985 }] },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${destacado.nombre}, ${formatoPrecio(destacado.precio)}`}
                >
                  <View style={styles.fotoDestacada}>
                    <Image
                      source={{ uri: destacado.imagen }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      transition={250}
                      cachePolicy="memory-disk"
                    />
                    <View style={styles.favorito}>
                      <BotonFavorito id={destacado.id} size={38} />
                    </View>
                  </View>

                  <View style={styles.infoDestacada}>
                    <View style={styles.cintaDestacada}>
                      <Text style={styles.textoCinta}>
                        {destacado.oferta ? 'Oferta' : 'Destacado de hoy'}
                      </Text>
                    </View>

                    <View style={styles.filaNombrePrecio}>
                      <Text style={[styles.nombreDestacado, { color: tema.texto }]} numberOfLines={2}>
                        {destacado.nombre}
                      </Text>
                      <Text style={[styles.precioDestacado, { color: tema.precio }]}>
                        {formatoPrecio(destacado.precio)}
                      </Text>
                    </View>

                    {!!destacado.descripcion && (
                      <Text style={[styles.descripcionDestacada, { color: tema.textoSecundario }]}>
                        {destacado.descripcion}
                      </Text>
                    )}

                    <View style={styles.filaBotones}>
                      <Pressable
                        onPress={() => pedirPorWhatsApp(destacado)}
                        style={({ pressed }) => [styles.botonWhats, pressed && { opacity: 0.85 }]}
                        accessibilityLabel={`Pedir ${destacado.nombre} por WhatsApp`}
                      >
                        <IconoChat color="#FFFFFF" size={18} />
                        <Text style={styles.textoWhats}>Pedir por WhatsApp</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => abrirDetalle(destacado)}
                        style={({ pressed }) => [
                          styles.botonDetalle,
                          { borderColor: bordeSuave },
                          pressed && { opacity: 0.7 },
                        ]}
                        accessibilityLabel={`Ver detalle de ${destacado.nombre}`}
                      >
                        <Text style={[styles.textoDetalle, { color: tema.texto }]}>Ver</Text>
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            )}

            {/* ── LOS DEMÁS ── */}
            {resto.length > 0 && (
              <View style={styles.bloque}>
                <View style={styles.seccionHeader}>
                  <Text style={[styles.seccionTitulo, { color: tema.texto }]}>MÁS PAQUETES</Text>
                  <View style={styles.lineaMarca} />
                </View>

                {resto.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => abrirDetalle(p)}
                    style={({ pressed }) => [
                      styles.tarjeta,
                      { backgroundColor: tema.card },
                      pressed && { transform: [{ scale: 0.985 }] },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.nombre}, ${formatoPrecio(p.precio)}`}
                  >
                    <View style={styles.foto}>
                      <Image
                        source={{ uri: p.imagen }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        transition={250}
                        cachePolicy="memory-disk"
                      />
                      <View style={styles.favorito}>
                        <BotonFavorito id={p.id} size={34} />
                      </View>
                    </View>

                    <View style={styles.infoTarjeta}>
                      <View style={styles.columnaTexto}>
                        <Text style={[styles.nombre, { color: tema.texto }]} numberOfLines={1}>
                          {p.nombre}
                        </Text>
                        {!!p.descripcion && (
                          <Text
                            style={[styles.descripcion, { color: tema.textoSecundario }]}
                            numberOfLines={2}
                          >
                            {p.descripcion}
                          </Text>
                        )}
                        <Text style={[styles.precio, { color: tema.precio }]}>
                          {formatoPrecio(p.precio)}
                          <Text style={[styles.moneda, { color: tema.textoSecundario }]}> MXN</Text>
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => pedirPorWhatsApp(p)}
                        hitSlop={8}
                        style={({ pressed }) => [styles.botonWhatsRedondo, pressed && { opacity: 0.85 }]}
                        accessibilityLabel={`Pedir ${p.nombre} por WhatsApp`}
                      >
                        <IconoChat color="#FFFFFF" size={20} />
                      </Pressable>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {/* ── CÓMO PEDIR ── */}
            <View style={styles.bloque}>
              <View style={styles.seccionHeader}>
                <Text style={[styles.seccionTitulo, { color: tema.texto }]}>CÓMO PEDIR</Text>
                <View style={styles.lineaMarca} />
              </View>

              <View style={[styles.cajaPasos, { backgroundColor: tema.card }]}>
                {PASOS.map((paso, i) => (
                  <View key={paso.titulo} style={styles.paso}>
                    <View style={styles.columnaNumero}>
                      <View style={styles.numero}>
                        <Text style={styles.textoNumero}>{i + 1}</Text>
                      </View>
                      {i < PASOS.length - 1 && (
                        <View style={[styles.lineaPaso, { backgroundColor: bordeSuave }]} />
                      )}
                    </View>
                    <View style={styles.textoPaso}>
                      <Text style={[styles.tituloPaso, { color: tema.texto }]}>{paso.titulo}</Text>
                      <Text style={[styles.detallePaso, { color: tema.textoSecundario }]}>
                        {paso.texto}
                      </Text>
                    </View>
                  </View>
                ))}

                {sucursales.length > 0 && (
                  <View style={styles.filaBotones}>
                    <Pressable
                      onPress={llamar}
                      style={({ pressed }) => [
                        styles.botonLlamar,
                        { borderColor: bordeSuave },
                        pressed && { opacity: 0.7 },
                      ]}
                      accessibilityLabel="Llamar a una sucursal"
                    >
                      <IconoTelefono color={tema.texto} size={18} />
                      <Text style={[styles.textoLlamar, { color: tema.texto }]}>Llamar</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => pedirPorWhatsApp(null)}
                      style={({ pressed }) => [styles.botonWhats, pressed && { opacity: 0.85 }]}
                      accessibilityLabel="Escribir por WhatsApp"
                    >
                      <IconoChat color="#FFFFFF" size={18} />
                      <Text style={styles.textoWhats}>WhatsApp</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          </>
        )}

        {/* Espacio para que la barra flotante no tape el contenido */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── ELEGIR SUCURSAL (solo si hay varias) ── */}
      <ElegirSucursal
        visible={!!pendiente}
        titulo={pendiente?.titulo}
        sucursales={sucursales}
        onCerrar={() => setPendiente(null)}
        onElegir={(s) => {
          const accion = pendiente;
          setPendiente(null);
          accion?.hacer(s);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  // Encabezado
  encabezado: { paddingHorizontal: 16, paddingTop: 12 },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titulo: { fontFamily: 'Poppins_700Bold', fontSize: 30, lineHeight: 38 },
  subtitulo: { fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 19, marginTop: 2 },
  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  puntoEstado: { width: 8, height: 8, borderRadius: 4 },
  textoEstado: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },

  bloque: { marginTop: 20, paddingHorizontal: 16 },

  // Destacado
  tarjetaDestacada: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
  },
  fotoDestacada: { width: '100%', aspectRatio: PROPORCION_FOTO, backgroundColor: '#1A1A1A' },
  favorito: { position: 'absolute', top: 10, right: 10 },
  infoDestacada: { padding: 16, paddingTop: 14 },
  cintaDestacada: {
    alignSelf: 'flex-start',
    backgroundColor: ROJO,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  textoCinta: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: COLORES.textoSobrePrimario },
  filaNombrePrecio: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  nombreDestacado: { flex: 1, fontFamily: 'Poppins_700Bold', fontSize: 22, lineHeight: 28 },
  precioDestacado: { fontFamily: 'Poppins_700Bold', fontSize: 30, lineHeight: 34 },
  descripcionDestacada: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },

  // Botones
  filaBotones: { flexDirection: 'row', gap: 10, marginTop: 14 },
  botonWhats: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: VERDE_WHATS,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoWhats: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#FFFFFF' },
  botonDetalle: {
    width: 76,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoDetalle: { fontFamily: 'Poppins_700Bold', fontSize: 14 },
  botonLlamar: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoLlamar: { fontFamily: 'Poppins_700Bold', fontSize: 14 },

  // Secciones
  seccionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  seccionTitulo: { fontFamily: 'Poppins_700Bold', fontSize: 13, letterSpacing: 1 },
  lineaMarca: {
    flex: 1,
    height: 2,
    backgroundColor: ROJO,
    marginLeft: 10,
    borderRadius: 2,
  },

  // Tarjetas normales
  tarjeta: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
  },
  foto: { width: '100%', aspectRatio: PROPORCION_FOTO, backgroundColor: '#1A1A1A' },
  infoTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  columnaTexto: { flex: 1 },
  nombre: { fontFamily: 'Poppins_700Bold', fontSize: 16 },
  descripcion: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 17, marginTop: 2 },
  precio: { fontFamily: 'Poppins_700Bold', fontSize: 22, marginTop: 4 },
  moneda: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  botonWhatsRedondo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: VERDE_WHATS,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Cómo pedir
  cajaPasos: { borderRadius: 20, padding: 16 },
  paso: { flexDirection: 'row', gap: 12 },
  columnaNumero: { alignItems: 'center', width: 30 },
  numero: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: ROJO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoNumero: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: COLORES.textoSobrePrimario },
  lineaPaso: { width: 2, flex: 1, minHeight: 14, marginVertical: 4, borderRadius: 1 },
  textoPaso: { flex: 1, paddingBottom: 14 },
  tituloPaso: { fontFamily: 'Poppins_700Bold', fontSize: 14, lineHeight: 20, marginTop: 4 },
  detallePaso: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 17 },

  vacio: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
});