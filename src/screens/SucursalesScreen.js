// src/screens/SucursalesScreen.js
// Pantalla de sucursales:
// - Si hay varias, arriba se elige la sucursal (pastillas con punto verde/rojo).
// - Carrusel de fotos de la sucursal: se mueven solas cada pocos segundos
//   y también se pueden deslizar con el dedo. Puntitos que indican la foto actual.
// - Encima: pastilla Abierto/Cerrado, nombre y cuánto falta para abrir o cerrar.
// - Botones Llamar, WhatsApp y Cómo llegar (cada sucursal con sus propios datos).
// - Dirección, teléfono y horario.
// - Al tocar otra vez la pestaña en la barra de abajo, sube hasta arriba.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  Pressable, Linking, Alert, AccessibilityInfo, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useScrollToTop } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useTema } from '../context/ThemeContext';
import { useDatos } from '../context/DatosContext';
import BotonContacto from '../components/BotonContacto';
import { estaAbierta } from '../components/ElegirSucursal';
import { MARCA, COLORES } from '../config/marca';
import {
  IconoTelefono, IconoPin, IconoReloj, IconoChevron,
} from '../components/IconosUI';

const ROJO = COLORES.primario;
const INICIALES = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0]; // Lunes a Domingo

// ---------- Ajustes del carrusel (puedes cambiarlos) ----------
// Forma del carrusel (ancho / alto). Más bajo = más alto el carrusel.
const PROPORCION_CARRUSEL = 1.1;
// Cada cuántos segundos pasa sola a la siguiente foto
const SEGUNDOS_POR_FOTO = 4;

// Sucursales que se muestran en la app (las demás se ocultan)
const SUCURSALES_VISIBLES = ['Atizapán', 'Nicolás Romero', 'Mixcoac'];

// Convierte 11 → "11:00 AM", 22 → "10:00 PM"
function formatoHora(hora24) {
  const sufijo = hora24 >= 12 ? 'PM' : 'AM';
  const hora12 = hora24 % 12 === 0 ? 12 : hora24 % 12;
  return `${hora12}:00 ${sufijo}`;
}

// Convierte minutos en "8 h 51 min", "45 min", etc.
function formatoDuracion(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function calcularEstado(horario) {
  const apertura = Number(horario?.apertura);
  const cierre = Number(horario?.cierre);
  if (isNaN(apertura) || isNaN(cierre)) return { abierto: null, detalle: '' };

  const ahora = new Date();
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const minApertura = apertura * 60;
  const minCierre = cierre * 60;
  const abierto = minutosAhora >= minApertura && minutosAhora < minCierre;

  if (abierto) {
    const faltan = minCierre - minutosAhora;
    return { abierto, detalle: `Cierra en ${formatoDuracion(faltan)} · ${formatoHora(cierre)}` };
  }

  const faltan = minutosAhora < minApertura
    ? minApertura - minutosAhora
    : 24 * 60 - minutosAhora + minApertura;
  return { abierto, detalle: `Abre en ${formatoDuracion(faltan)} · ${formatoHora(apertura)}` };
}

async function abrirEnlace(url, mensajeError) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Ups', mensajeError);
  }
}

export default function SucursalesScreen() {
  const { tema, modoOscuro } = useTema();
  const { sucursales = [], sucursal: primera } = useDatos();

  // Solo muestra las 3 sucursales principales de Charly Pizza
  const todasLasSucursales = sucursales.length ? sucursales : [primera].filter(Boolean);
  const lista = todasLasSucursales.filter((s) =>
    SUCURSALES_VISIBLES.some((nombre) => s.nombre?.includes(nombre))
  );

  const hayVarias = lista.length > 1;
  const hoy = new Date().getDay();

  // ── Sucursal elegida ──
  // Al abrir: la primera que esté abierta; si ninguna, la primera de la lista
  const [idElegida, setIdElegida] = useState(null);
  const sucursal = useMemo(() => {
    const elegida = lista.find((s) => s.id === idElegida);
    if (elegida) return elegida;
    return lista.find((s) => estaAbierta(s)) || lista[0] || {};
  }, [lista, idElegida]);

  const [estado, setEstado] = useState(() => calcularEstado(sucursal.horario));

  // Al tocar otra vez la pestaña en la barra de abajo, sube hasta arriba
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  // Desvanecido suave al cambiar de sucursal
  const aparicion = useRef(new Animated.Value(1)).current;

  const elegirSucursal = (s) => {
    if (s.id === sucursal.id) return;
    Haptics.selectionAsync().catch(() => {});
    aparicion.setValue(0.2);
    setIdElegida(s.id);
    Animated.timing(aparicion, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  };

  // ── Carrusel ──
  const enPantalla = useIsFocused(); // solo se mueve solo si estás en esta pestaña
  const carruselRef = useRef(null);
  const tocandoRef = useRef(false); // true mientras el dedo está deslizando
  const indiceRef = useRef(0); // foto actual (para el movimiento automático)
  const [medidas, setMedidas] = useState({ ancho: 0, alto: 0 });
  const [fotoActual, setFotoActual] = useState(0);
  const [reinicio, setReinicio] = useState(0); // reinicia la cuenta tras deslizar a mano
  const [reducirMovimiento, setReducirMovimiento] = useState(false);

  // Fotos de la sucursal; si no hay, su imagen de respaldo
  const fotos = useMemo(() => {
    const listaFotos = Array.isArray(sucursal.imagenes) ? sucursal.imagenes.filter(Boolean) : [];
    if (listaFotos.length > 0) return listaFotos;
    return sucursal.imagen ? [sucursal.imagen] : [];
  }, [sucursal.imagenes, sucursal.imagen]);

  const cambiarFoto = (indice) => {
    indiceRef.current = indice;
    setFotoActual((actual) => (actual === indice ? actual : indice));
  };

  // Al cambiar de sucursal (o si llegan fotos nuevas), regresa a la primera foto
  useEffect(() => {
    cambiarFoto(0);
    carruselRef.current?.scrollTo({ x: 0, animated: false });
  }, [sucursal.id, fotos.length]);

  // Respeta "Reducir movimiento" del teléfono
  useEffect(() => {
    let activo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((valor) => activo && setReducirMovimiento(valor))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducirMovimiento);
    return () => {
      activo = false;
      sub?.remove?.();
    };
  }, []);

  // Movimiento automático: pasa a la siguiente foto cada pocos segundos
  useEffect(() => {
    if (!enPantalla || reducirMovimiento) return undefined;
    if (fotos.length < 2 || !medidas.ancho) return undefined;

    const temporizador = setInterval(() => {
      if (tocandoRef.current) return; // si el usuario está deslizando, no interrumpe
      const siguiente = (indiceRef.current + 1) % fotos.length;
      carruselRef.current?.scrollTo({ x: siguiente * medidas.ancho, animated: true });
      cambiarFoto(siguiente);
    }, SEGUNDOS_POR_FOTO * 1000);

    return () => clearInterval(temporizador);
  }, [enPantalla, reducirMovimiento, fotos.length, medidas.ancho, reinicio, sucursal.id]);

  const alMedirCarrusel = (e) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== medidas.ancho || height !== medidas.alto) {
      setMedidas({ ancho: width, alto: height });
    }
  };

  // Mientras deslizas, actualiza el puntito
  const alDeslizarFotos = (e) => {
    if (!medidas.ancho) return;
    const indice = Math.round(e.nativeEvent.contentOffset.x / medidas.ancho);
    if (indice >= 0 && indice < fotos.length) cambiarFoto(indice);
  };

  const alEmpezarATocar = () => {
    tocandoRef.current = true;
  };

  const alSoltar = () => {
    tocandoRef.current = false;
    setReinicio((n) => n + 1); // vuelve a contar los segundos desde cero
  };

  // Recalcula al cambiar de sucursal u horario, y cada minuto
  useEffect(() => {
    setEstado(calcularEstado(sucursal.horario));
    const intervalo = setInterval(() => setEstado(calcularEstado(sucursal.horario)), 60000);
    return () => clearInterval(intervalo);
  }, [sucursal.id, sucursal.horario?.apertura, sucursal.horario?.cierre]);

  // "Cómo llegar": el enlace de la sucursal; si no tiene, busca su dirección en Google Maps
  const urlMaps = sucursal.mapaUrl
    ? sucursal.mapaUrl
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${MARCA.nombre} ${sucursal.direccion ?? ''}`
      )}`;
  const urlWhats = `https://wa.me/${sucursal.whatsapp}?text=${encodeURIComponent(
    `${MARCA.saludoWhatsApp} Quiero información de la sucursal ${sucursal.nombre ?? ''}.`
  )}`;

  const llamar = () => {
    if (!sucursal.telefono) return Alert.alert('Ups', 'Esta sucursal no tiene teléfono registrado.');
    return abrirEnlace(`tel:${sucursal.telefono}`, 'No se pudo abrir el marcador.');
  };
  const whatsapp = () => {
    if (!sucursal.whatsapp) return Alert.alert('Ups', 'Esta sucursal no tiene WhatsApp registrado.');
    return abrirEnlace(urlWhats, 'No se pudo abrir WhatsApp.');
  };
  const comoLlegar = () => abrirEnlace(urlMaps, 'No se pudo abrir el mapa.');

  const bordeSuave = modoOscuro ? '#2C2C2C' : '#EEEEEE';
  const fondoIconoInfo = modoOscuro ? 'rgba(227,30,36,0.18)' : 'rgba(227,30,36,0.10)';
  const fondoDia = modoOscuro ? '#2C2C2C' : '#F2F2F2';

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: tema.fondo }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >

        {/* ── TÍTULO GRANDE ── */}
        <Text style={[styles.tituloGrande, { color: tema.texto }]}>
          {hayVarias ? 'Sucursales' : 'Sucursal'}
        </Text>
        <Text style={[styles.subtitulo, { color: tema.textoSecundario }]}>
          {hayVarias ? 'Elige la más cercana a ti' : 'Visítanos o contáctanos directo'}
        </Text>

        {/* ── SELECTOR DE SUCURSAL (solo si hay varias) ── */}
        {hayVarias && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selector}
            style={styles.selectorCaja}
          >
            {lista.map((s) => {
              const activa = s.id === sucursal.id;
              const abierta = estaAbierta(s);
              return (
                <Pressable
                  key={s.id ?? s.nombre}
                  onPress={() => elegirSucursal(s)}
                  style={({ pressed }) => [
                    styles.pastilla,
                    activa
                      ? styles.pastillaActiva
                      : { backgroundColor: tema.card, borderColor: modoOscuro ? '#333333' : '#E8E8E8' },
                    pressed && { opacity: 0.8 },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activa }}
                  accessibilityLabel={`${s.nombre}${abierta === null ? '' : abierta ? ', abierta' : ', cerrada'}`}
                >
                  {abierta !== null && (
                    <View
                      style={[
                        styles.puntoPastilla,
                        { backgroundColor: abierta ? COLORES.abierto : COLORES.cerrado },
                        activa && styles.puntoPastillaActiva,
                      ]}
                    />
                  )}
                  <Text
                    style={[
                      styles.textoPastilla,
                      { color: activa ? COLORES.textoSobrePrimario : tema.texto },
                    ]}
                    numberOfLines={1}
                  >
                    {s.nombre}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <Animated.View style={{ opacity: aparicion }}>
          {/* ── CARRUSEL DE FOTOS DE LA SUCURSAL ── */}
          <View style={styles.hero} onLayout={alMedirCarrusel}>
            {medidas.ancho > 0 && (
              <ScrollView
                ref={carruselRef}
                horizontal
                pagingEnabled
                bounces={false}
                showsHorizontalScrollIndicator={false}
                scrollEnabled={fotos.length > 1}
                onScroll={alDeslizarFotos}
                onScrollBeginDrag={alEmpezarATocar}
                onScrollEndDrag={alSoltar}
                onMomentumScrollEnd={alDeslizarFotos}
                scrollEventThrottle={16}
                decelerationRate="fast"
                style={StyleSheet.absoluteFill}
              >
                {fotos.map((uri, i) => (
                  <Image
                    key={`${uri}-${i}`}
                    source={{ uri }}
                    style={{ width: medidas.ancho, height: medidas.alto }}
                    contentFit="cover"
                    contentPosition="center"
                    transition={250}
                    cachePolicy="memory-disk"
                    accessibilityLabel={`Foto de la sucursal ${i + 1} de ${fotos.length}`}
                  />
                ))}
              </ScrollView>
            )}

            {/* Todo lo de encima no estorba al deslizar (pointerEvents="none") */}
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <LinearGradient
                colors={['rgba(0,0,0,0.30)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.88)']}
                locations={[0, 0.3, 0.6, 1]}
                style={StyleSheet.absoluteFill}
              />

              {estado.abierto !== null && (
                <View
                  style={[
                    styles.estadoBadge,
                    { backgroundColor: estado.abierto ? COLORES.abierto : COLORES.cerrado },
                  ]}
                >
                  <View style={styles.estadoPunto} />
                  <Text style={styles.estadoTexto}>{estado.abierto ? 'ABIERTO AHORA' : 'CERRADO'}</Text>
                </View>
              )}

              {/* Puntitos: en qué foto vas */}
              {fotos.length > 1 && (
                <View style={styles.puntos}>
                  {fotos.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.punto, i === fotoActual && styles.puntoActivo]}
                    />
                  ))}
                </View>
              )}

              <View style={styles.heroTextos}>
                <Text style={styles.heroMarca}>{MARCA.nombreMayusculas}</Text>
                <Text style={styles.heroNombre}>{sucursal.nombre}</Text>
                {!!estado.detalle && <Text style={styles.heroDetalle}>{estado.detalle}</Text>}
              </View>
            </View>
          </View>

          {/* ── BOTONES DE ACCIÓN ── */}
          <View style={styles.accionesRow}>
            <BotonContacto tipo="llamar" onPress={llamar} />
            <BotonContacto tipo="whatsapp" onPress={whatsapp} />
            <BotonContacto tipo="mapa" onPress={comoLlegar} />
          </View>

          {/* ── INFORMACIÓN ── */}
          <View style={[styles.infoCard, { backgroundColor: tema.card }]}>
            <Pressable
              style={({ pressed }) => [styles.infoFila, pressed && { opacity: 0.6 }]}
              onPress={comoLlegar}
            >
              <View style={[styles.infoIcono, { backgroundColor: fondoIconoInfo }]}>
                <IconoPin color={ROJO} size={19} />
              </View>
              <View style={styles.infoTextos}>
                <Text style={styles.infoEtiqueta}>DIRECCIÓN</Text>
                <Text style={[styles.infoValor, { color: tema.texto }]}>{sucursal.direccion}</Text>
              </View>
              <IconoChevron color={tema.textoSoloInfo} />
            </Pressable>

            <View style={[styles.separador, { backgroundColor: bordeSuave }]} />

            <Pressable
              style={({ pressed }) => [styles.infoFila, pressed && { opacity: 0.6 }]}
              onPress={llamar}
            >
              <View style={[styles.infoIcono, { backgroundColor: fondoIconoInfo }]}>
                <IconoTelefono color={ROJO} size={18} />
              </View>
              <View style={styles.infoTextos}>
                <Text style={styles.infoEtiqueta}>TELÉFONO</Text>
                <Text style={[styles.infoValor, { color: tema.texto }]}>{sucursal.telefonoFormato}</Text>
              </View>
              <IconoChevron color={tema.textoSoloInfo} />
            </Pressable>

            <View style={[styles.separador, { backgroundColor: bordeSuave }]} />

            {/* ── HORARIO COMPACTO ── */}
            <View style={styles.infoFila}>
              <View style={[styles.infoIcono, { backgroundColor: fondoIconoInfo }]}>
                <IconoReloj color={ROJO} size={19} />
              </View>
              <View style={styles.infoTextos}>
                <Text style={styles.infoEtiqueta}>HORARIO · TODOS LOS DÍAS</Text>
                <Text style={[styles.infoValor, { color: tema.texto }]}>{sucursal.horarioTexto}</Text>
              </View>
            </View>

            <View style={styles.diasFila}>
              {ORDEN_SEMANA.map((dia) => {
                const esHoy = dia === hoy;
                return (
                  <View
                    key={dia}
                    style={[styles.dia, { backgroundColor: esHoy ? ROJO : fondoDia }]}
                    accessibilityLabel={esHoy ? 'Hoy' : undefined}
                  >
                    <Text
                      style={[
                        styles.diaTexto,
                        { color: esHoy ? COLORES.textoSobrePrimario : tema.textoSecundario },
                      ]}
                    >
                      {INICIALES[dia]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* Espacio para que la barra flotante no tape el contenido */}
        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const sombra = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.08,
  shadowRadius: 10,
  elevation: 3,
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  tituloGrande: { fontFamily: 'Poppins_700Bold', fontSize: 30, lineHeight: 38 },
  subtitulo: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginBottom: 16 },

  // Selector de sucursal
  selectorCaja: { marginHorizontal: -16, marginBottom: 14 },
  selector: { paddingHorizontal: 16, gap: 8 },
  pastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    maxWidth: 220,
  },
  pastillaActiva: {
    backgroundColor: ROJO,
    borderColor: ROJO,
    shadowColor: ROJO,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  puntoPastilla: { width: 8, height: 8, borderRadius: 4 },
  puntoPastillaActiva: { borderWidth: 1.5, borderColor: '#FFFFFF' },
  textoPastilla: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, flexShrink: 1 },

  // Carrusel
  hero: {
    aspectRatio: PROPORCION_CARRUSEL,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  heroTextos: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  heroMarca: { color: COLORES.primarioClaro, fontFamily: 'Poppins_600SemiBold', fontSize: 10, letterSpacing: 3 },
  heroNombre: { color: '#FFF', fontFamily: 'Poppins_700Bold', fontSize: 22, lineHeight: 28 },
  heroDetalle: { color: 'rgba(255,255,255,0.85)', fontFamily: 'Poppins_400Regular', fontSize: 12 },

  estadoBadge: {
    position: 'absolute', top: 14, left: 14,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  estadoPunto: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFF' },
  estadoTexto: { color: '#FFF', fontFamily: 'Poppins_700Bold', fontSize: 9, letterSpacing: 0.5 },

  puntos: {
    position: 'absolute', top: 16, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 6,
  },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
  puntoActivo: { width: 16, backgroundColor: ROJO },

  accionesRow: { flexDirection: 'row', gap: 10, marginTop: 14 },

  infoCard: { borderRadius: 18, marginTop: 14, overflow: 'hidden', ...sombra },
  infoFila: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  infoIcono: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  infoTextos: { flex: 1 },
  infoEtiqueta: { color: ROJO, fontFamily: 'Poppins_600SemiBold', fontSize: 9, letterSpacing: 1 },
  infoValor: { fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 18, marginTop: 2 },
  separador: { height: 1, marginLeft: 66, marginRight: 14 },

  diasFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 14,
    paddingBottom: 16,
    paddingLeft: 66,
  },
  dia: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diaTexto: { fontFamily: 'Poppins_700Bold', fontSize: 11 },
});