// src/screens/HomeScreen.js
// Inicio: header rojo de marca, buscador, filtros, banner, tamaños y lista de productos.

import { useState, useMemo, useRef, useCallback, useDeferredValue } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, Pressable, RefreshControl,
  Animated, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../context/ThemeContext';
import { useFavoritos } from '../context/FavoritosContext';
import { useDatos } from '../context/DatosContext';
import HeroBanner from '../components/HeroBanner';
import PromoCard from '../components/PromoCard';
import FiltrosCategorias from '../components/FiltrosCategorias';
import ProductCard from '../components/ProductCard';
import TarjetaTamano from '../components/TarjetaTamano';
import AlertaPaquetes from '../components/AlertaPaquetes';
import { esPaqueteDePromos } from '../data/paquetes';
import { MARCA, COLORES } from '../config/marca';
import {
  IconoBuscar, IconoPin, IconoSol, IconoLuna, IconoCerrar,
} from '../components/IconosUI';

const ROJO = COLORES.primario;
const DEGRADADO_LOGO = [COLORES.primarioClaro, COLORES.primario, COLORES.primarioOscuro];
const ES_ANDROID = Platform.OS === 'android';

const TARJETAS_ANIMADAS = 6;
const JALON_PARA_VERLO = 80;

const LOGO = require('../../assets/charly-logo.png');

const SUGERENCIAS = ['Pepperoni', 'Hawaiana', 'Mexicana', 'Alitas', 'Refresco'];

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function coincide(producto, palabras) {
  const texto = normalizar(
    `${producto.nombre} ${producto.descripcion} ${producto.categoria} ${producto.subcategoria ?? ''}`
  );
  return palabras.every((palabra) => texto.includes(palabra));
}

export default function HomeScreen() {
  const { tema, modoOscuro, toggleTema } = useTema();
  const { favoritos } = useFavoritos();
  const {
    productos, promociones, tamanos, recargar, error, cargando,
  } = useDatos();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [subcategoria, setSubcategoria] = useState('Todas');
  const [busqueda, setBusqueda] = useState('');
  const [buscadorActivo, setBuscadorActivo] = useState(false);
  const [refrescando, setRefrescando] = useState(false);

  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  const scrollY = useRef(new Animated.Value(0)).current;
  const brinco = useRef(new Animated.Value(0)).current;
  const medidas = useRef({ contenido: 0, visible: 0 });
  const empezoAbajo = useRef(false);
  const [maxScroll, setMaxScroll] = useState(0);

  const actualizarMax = () => {
    const m = Math.max(0, Math.round(medidas.current.contenido - medidas.current.visible));
    setMaxScroll((prev) => (prev === m ? prev : m));
  };
  const alCambiarContenido = (_, alto) => {
    medidas.current.contenido = alto;
    actualizarMax();
  };
  const alMedirLista = (e) => {
    medidas.current.visible = e.nativeEvent.layout.height;
    actualizarMax();
  };

  const mostrarBrinco = () => {
    brinco.stopAnimation();
    brinco.setValue(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.spring(brinco, { toValue: 1, speed: 14, bounciness: 12, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(brinco, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const alEmpezarArrastre = (e) => {
    empezoAbajo.current = maxScroll > 0 && e.nativeEvent.contentOffset.y >= maxScroll - 2;
  };

  const alTerminarArrastre = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    if (ES_ANDROID) {
      if (empezoAbajo.current && y >= maxScroll - 2) mostrarBrinco();
    } else if (y - maxScroll > JALON_PARA_VERLO * 0.7) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const progresoLogo = ES_ANDROID
    ? brinco
    : scrollY.interpolate({
        inputRange: [maxScroll + 10, maxScroll + JALON_PARA_VERLO],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });

  const categoriaLista = useDeferredValue(categoriaActiva);
  const subcategoriaLista = useDeferredValue(subcategoria);
  const busquedaLista = useDeferredValue(busqueda);

  const buscando = busqueda.trim().length > 0;
  const buscandoLista = busquedaLista.trim().length > 0;
  const viendoPizzas = categoriaLista === 'Pizzas' && !buscandoLista;
  const mostrarBanner = !buscandoLista && categoriaLista === 'Todos';

  const sinConexion = Boolean(error) && !cargando;
  const mostrarAvisoSinRed = sinConexion && productos.length > 0;

  const claveAnimacion = `${categoriaLista}|${subcategoriaLista}`;

  const alRefrescar = async () => {
    setRefrescando(true);
    await recargar();
    setRefrescando(false);
  };

  const cambiarCategoria = useCallback((nombre) => {
    setCategoriaActiva(nombre);
    setSubcategoria('Todas');
  }, []);

  const abrirPaqueteDeAlerta = () => {
    navigation.navigate('Promos');
  };

  const productosInicio = useMemo(
    () => productos.filter((p) => !esPaqueteDePromos(p)),
    [productos]
  );

  const subcategoriasPizza = useMemo(() => {
    const unicas = [];
    productosInicio.forEach((p) => {
      if (p.categoria === 'Pizzas' && p.subcategoria && !unicas.includes(p.subcategoria)) {
        unicas.push(p.subcategoria);
      }
    });
    return unicas.length ? ['Todas', ...unicas] : [];
  }, [productosInicio]);

  const productosFiltrados = useMemo(() => {
    const palabras = normalizar(busquedaLista).split(/\s+/).filter(Boolean);

    if (categoriaLista === 'Favoritos') {
      const favs = productosInicio.filter((p) => favoritos.includes(p.id));
      return palabras.length ? favs.filter((p) => coincide(p, palabras)) : favs;
    }

    if (palabras.length) {
      return productosInicio.filter((p) => coincide(p, palabras));
    }

    if (categoriaLista === 'Todos') return productosInicio;

    let lista = productosInicio.filter((p) => p.categoria === categoriaLista);
    if (categoriaLista === 'Pizzas' && subcategoriaLista !== 'Todas') {
      lista = lista.filter((p) => p.subcategoria === subcategoriaLista);
    }
    return lista;
  }, [categoriaLista, subcategoriaLista, busquedaLista, favoritos, productosInicio]);

  const posiciones = useMemo(() => {
    const mapa = new Map();
    productosFiltrados.forEach((p, i) => mapa.set(p.id, i));
    return mapa;
  }, [productosFiltrados]);

  let tituloProductos = 'TODOS LOS PRODUCTOS';
  if (categoriaLista === 'Favoritos') tituloProductos = 'FAVORITOS';
  else if (buscandoLista) tituloProductos = 'RESULTADOS';
  else if (categoriaLista !== 'Todos') tituloProductos = categoriaLista.toUpperCase();

  const textoContador = buscandoLista
    ? `${productosFiltrados.length} ${productosFiltrados.length === 1 ? 'resultado' : 'resultados'} para "${busquedaLista.trim()}"`
    : `${productosFiltrados.length} productos disponibles`;

  let vacio;
  if (productos.length === 0 && sinConexion) {
    vacio = {
      icono: 'cloud-offline-outline',
      titulo: 'Sin conexión',
      texto: 'No pudimos cargar el menú. Revisa tu internet e inténtalo de nuevo.',
      boton: { texto: 'Reintentar', alPresionar: recargar },
    };
  } else if (productos.length === 0) {
    vacio = {
      icono: 'pizza-outline',
      titulo: 'Cargando el menú...',
      texto: 'Esto solo tarda unos segundos.',
    };
  } else if (categoriaLista === 'Favoritos' && !buscandoLista) {
    vacio = {
      icono: 'heart-outline',
      titulo: 'Aún no tienes favoritos',
      texto: 'Toca el corazón de cualquier producto para guardarlo aquí.',
      boton: { texto: 'Ver el menú', alPresionar: () => cambiarCategoria('Todos') },
    };
  } else if (buscandoLista) {
    vacio = {
      icono: 'search-outline',
      titulo: 'Sin resultados',
      texto: `No encontramos "${busquedaLista.trim()}". Prueba con otra palabra.`,
      boton: { texto: 'Borrar búsqueda', alPresionar: () => setBusqueda('') },
    };
  } else {
    vacio = {
      icono: 'pizza-outline',
      titulo: 'Nada por aquí',
      texto: 'Por ahora no hay productos en esta categoría.',
    };
  }

  const fondoAviso = modoOscuro ? '#2A1A1A' : '#FDECEC';
  const textoAviso = modoOscuro ? '#F2A5A5' : '#9B1C1C';
  const alturaLogoEscondido = Math.max(insets.bottom - 6, 10) + 70 + 14;

  // Colores del buscador (siempre claro, debajo del header rojo)
  const fondoBuscador = modoOscuro ? '#1A1A1A' : '#FFFFFF';
  const fondoCajaBusqueda = modoOscuro ? '#2A2A2A' : '#F2F2F2';
  const colorIconoSuave = '#8A8A8A';

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: ROJO }]}>
      <Animated.ScrollView
        ref={scrollRef}
        style={{ backgroundColor: tema.fondo }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[2]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        onContentSizeChange={alCambiarContenido}
        onLayout={alMedirLista}
        onScrollBeginDrag={alEmpezarArrastre}
        onScrollEndDrag={alTerminarArrastre}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={alRefrescar}
            tintColor="#FFFFFF"
            colors={[ROJO]}
          />
        }
      >
        {/* ── HEADER ROJO ── */}
        <View style={styles.header}>

          {/* Logotipo centrado */}
          <View style={styles.headerLogoWrap}>
            <View style={styles.logoCircle}>
              <Image
                source={LOGO}
                style={styles.logoImagen}
                contentFit="contain"
                accessibilityLabel={`Logo de ${MARCA.nombre}`}
              />
            </View>
          </View>

          {/* Botones centrados debajo del logo */}
          <View style={styles.headerBotones}>
            {/* Botón modo claro/oscuro */}
            <TouchableOpacity
              style={styles.botonRedondo}
              onPress={toggleTema}
              activeOpacity={0.7}
            >
              {modoOscuro
                ? <Ionicons name="moon" size={18} color="#FFFFFF" />
                : <Ionicons name="sunny" size={19} color="#FFFFFF" />}
            </TouchableOpacity>

            {/* Botón sucursales */}
            <TouchableOpacity
              style={styles.sucursalBtn}
              onPress={() => navigation.navigate('Sucursales')}
              activeOpacity={0.7}
            >
              <IconoPin color="#FFFFFF" size={14} />
              <Text style={styles.sucursalTexto}>Sucursales</Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* ── BARRA DE BÚSQUEDA (debajo del header, fondo del tema) ── */}
        <View style={[styles.searchWrapper, { backgroundColor: fondoBuscador }]}>
          <View
            style={[
              styles.searchBox,
              { backgroundColor: fondoCajaBusqueda },
              buscadorActivo && styles.searchBoxActivo,
            ]}
          >
            <IconoBuscar color={buscadorActivo ? ROJO : colorIconoSuave} size={18} />
            <TextInput
              placeholder="Busca pizza, alitas, refresco..."
              placeholderTextColor={modoOscuro ? '#6A6A6A' : '#9A9A9A'}
              value={busqueda}
              onChangeText={setBusqueda}
              onFocus={() => setBuscadorActivo(true)}
              onBlur={() => setBuscadorActivo(false)}
              returnKeyType="search"
              autoCorrect={false}
              style={[styles.searchInput, { color: tema.texto, fontFamily: 'Poppins_400Regular' }]}
            />
            {busqueda.length > 0 && (
              <TouchableOpacity
                onPress={() => setBusqueda('')}
                style={[styles.botonLimpiar, { backgroundColor: modoOscuro ? '#3A3A3A' : '#DDDDDD' }]}
              >
                <IconoCerrar color={modoOscuro ? '#CCCCCC' : '#666666'} size={11} />
              </TouchableOpacity>
            )}
          </View>

          {buscadorActivo && !buscando && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sugerencias}
            >
              {SUGERENCIAS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setBusqueda(s)}
                  style={({ pressed }) => [
                    styles.sugerencia,
                    { borderColor: modoOscuro ? '#3A3A3A' : '#E4E4E4' },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text style={[styles.sugerenciaTexto, { color: tema.textoSecundario }]}>{s}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {mostrarAvisoSinRed && (
            <View style={[styles.avisoSinRed, { backgroundColor: fondoAviso }]}>
              <Ionicons name="cloud-offline-outline" size={15} color={textoAviso} />
              <Text style={[styles.avisoSinRedTexto, { color: textoAviso }]} numberOfLines={1}>
                Sin internet · menú guardado
              </Text>
              <Pressable onPress={recargar} hitSlop={10}>
                <Text style={styles.avisoSinRedBoton}>Reintentar</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── FILTROS (sticky) ── */}
        <View style={[styles.filtrosSticky, { backgroundColor: tema.fondo }]}>
          <FiltrosCategorias
            categoriaActiva={categoriaActiva}
            onSelect={cambiarCategoria}
          />
        </View>

        {/* Banner y promos */}
        <View style={mostrarBanner ? null : styles.oculto}>
          <HeroBanner />
          {promociones.length > 0 && (
            <View style={styles.seccion}>
              <View style={styles.seccionHeader}>
                <Text style={[styles.seccionTitulo, { color: tema.texto }]}>PROMOCIONES</Text>
                <View style={styles.lineaMarca} />
              </View>
              <View style={styles.promosRow}>
                {promociones.slice(0, 2).map((promo) => (
                  <PromoCard
                    key={promo.id}
                    promo={promo}
                    onPress={() => navigation.navigate('Promos')}
                  />
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Tamaños */}
        {viendoPizzas && tamanos.length > 0 && (
          <View style={styles.seccion}>
            <View style={styles.seccionHeader}>
              <Text style={[styles.seccionTitulo, { color: tema.texto }]}>ELIGE TU TAMAÑO</Text>
              <View style={styles.lineaMarca} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tamanosFila}
            >
              {tamanos.map((t, i) => (
                <TarjetaTamano key={t.id} tamano={t} nivel={i} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Título productos */}
        <View style={styles.seccion}>
          <View style={styles.seccionHeader}>
            <Text style={[styles.seccionTitulo, { color: tema.texto }]}>{tituloProductos}</Text>
            <View style={styles.lineaMarca} />
          </View>
          <Text style={[styles.contadorTexto, { color: tema.textoSecundario }]}>
            {textoContador}
          </Text>

          {viendoPizzas && subcategoriasPizza.length > 0 && (
            <View style={styles.subFiltros}>
              {subcategoriasPizza.map((s) => {
                const activo = subcategoria === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setSubcategoria(s)}
                    style={[
                      styles.subFiltro,
                      activo
                        ? { backgroundColor: ROJO }
                        : { borderColor: modoOscuro ? '#3A3A3A' : '#E0E0E0', borderWidth: 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.subFiltroTexto,
                        { color: activo ? '#FFFFFF' : tema.textoSecundario },
                      ]}
                    >
                      {s}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Lista de productos */}
        <View style={styles.productos}>
          {productosFiltrados.length === 0 && (
            <View style={styles.sinResultados}>
              <View style={[styles.circuloVacio, { backgroundColor: tema.card }]}>
                <Ionicons name={vacio.icono} size={34} color={ROJO} />
              </View>
              <Text style={[styles.sinResultadosTitulo, { color: tema.texto }]}>
                {vacio.titulo}
              </Text>
              <Text style={[styles.sinResultadosTexto, { color: tema.textoSecundario }]}>
                {vacio.texto}
              </Text>
              {vacio.boton && (
                <Pressable
                  onPress={vacio.boton.alPresionar}
                  style={({ pressed }) => [styles.botonVacio, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.textoBotonVacio}>{vacio.boton.texto}</Text>
                </Pressable>
              )}
            </View>
          )}

          {productosInicio.map((producto) => {
            const posicion = posiciones.has(producto.id) ? posiciones.get(producto.id) : -1;
            const seAnima = posicion >= 0 && posicion < TARJETAS_ANIMADAS;
            return (
              <View key={producto.id} style={posicion >= 0 ? null : styles.oculto}>
                <ProductCard
                  producto={producto}
                  posicion={seAnima ? posicion : -1}
                  animarAl={seAnima ? claveAnimacion : null}
                />
              </View>
            );
          })}
        </View>

        <View style={{ height: 110 }} />
      </Animated.ScrollView>

      {/* Logo escondido al final */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.logoEscondido,
          {
            bottom: alturaLogoEscondido,
            opacity: progresoLogo,
            transform: [
              { translateY: progresoLogo.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
              { scale: progresoLogo.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
            ],
          },
        ]}
      >
        <Animated.View
          style={{
            transform: [
              { rotate: progresoLogo.interpolate({ inputRange: [0, 1], outputRange: ['-120deg', '0deg'] }) },
            ],
          }}
        >
          <View style={styles.logoEscondidoCirculo}>
            <Image source={LOGO} style={styles.logoImagen} contentFit="contain" />
          </View>
        </Animated.View>
        <Text style={styles.logoEscondidoTexto}>{MARCA.lema}</Text>
      </Animated.View>

      <AlertaPaquetes oscuro={modoOscuro} onVerPaquete={abrirPaqueteDeAlerta} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  oculto: { display: 'none' },

  // ── HEADER ROJO ──
  header: {
    alignItems: 'center',           // todo centrado horizontalmente
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    backgroundColor: ROJO,
  },
  // Contenedor del logo (centrado)
  headerLogoWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  logoCircle: {
    width: 72,                      // más grande al estar solo
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  logoImagen: {
    width: '100%',
    height: '100%',
  },
  // Fila de botones debajo del logo
  headerBotones: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  botonRedondo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sucursalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  sucursalTexto: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },

  // ── BUSCADOR ──
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  searchBoxActivo: { borderColor: ROJO },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  botonLimpiar: {
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  sugerencias: { gap: 8, paddingTop: 10 },
  sugerencia: {
    borderWidth: 1, borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  sugerenciaTexto: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  avisoSinRed: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginTop: 10,
  },
  avisoSinRedTexto: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  avisoSinRedBoton: { color: ROJO, fontFamily: 'Poppins_700Bold', fontSize: 12 },

  // ── FILTROS ──
  filtrosSticky: { paddingVertical: 8 },

  // ── SECCIONES ──
  seccion: { marginTop: 20, paddingHorizontal: 16 },
  seccionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  seccionTitulo: { fontFamily: 'Poppins_700Bold', fontSize: 13, letterSpacing: 1 },
  lineaMarca: { flex: 1, height: 2, backgroundColor: ROJO, marginLeft: 10, borderRadius: 2 },
  contadorTexto: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginBottom: 4, marginTop: 2 },
  promosRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  tamanosFila: { gap: 10, paddingTop: 10, paddingBottom: 8 },
  subFiltros: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  subFiltro: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  subFiltroTexto: { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },

  // ── PRODUCTOS ──
  productos: { marginTop: 8, paddingBottom: 24 },
  sinResultados: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  circuloVacio: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  sinResultadosTitulo: { fontFamily: 'Poppins_700Bold', fontSize: 17, textAlign: 'center' },
  sinResultadosTexto: {
    fontFamily: 'Poppins_400Regular', fontSize: 13,
    lineHeight: 19, textAlign: 'center', marginTop: 4,
  },
  botonVacio: {
    marginTop: 18, backgroundColor: ROJO,
    borderRadius: 22, paddingHorizontal: 22, paddingVertical: 10,
  },
  textoBotonVacio: {
    fontFamily: 'Poppins_700Bold', fontSize: 13,
    color: COLORES.textoSobrePrimario,
  },

  // ── LOGO ESCONDIDO ──
  logoEscondido: {
    position: 'absolute', left: 0, right: 0,
    alignItems: 'center', gap: 6,
  },
  logoEscondidoCirculo: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#FFFFFF', overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center', padding: 5,
    borderWidth: 3, borderColor: ROJO,
  },
  logoEscondidoTexto: {
    color: ROJO, fontFamily: 'Poppins_600SemiBold',
    fontSize: 9, letterSpacing: 2,
  },
});