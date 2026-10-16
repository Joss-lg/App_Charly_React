// src/screens/HomeScreen.js
// Inicio: header rojo con logo grande y animado, filtros con botón de tema fijo, banner, tamaños y lista de productos.
// Al tocar un tamaño de pizza, se muestran todas las pizzas con su precio en ese tamaño.

import { useState, useMemo, useRef, useCallback, useDeferredValue, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Pressable, RefreshControl,
  Animated, Easing, Platform, useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useScrollToTop } from '@react-navigation/native';
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
import ListaPizzasTamano from '../components/ListaPizzasTamano';
import AlertaPaquetes from '../components/AlertaPaquetes';
import { esPaqueteDePromos } from '../data/paquetes';
import { MARCA, COLORES } from '../config/marca';

const ROJO = COLORES.primario;
const ES_ANDROID = Platform.OS === 'android';

const TARJETAS_ANIMADAS = 6;
const JALON_PARA_VERLO = 80;
const ALTO_HEADER = 170;
const FUENTE_TITULOS = 'LilitaOne_400Regular';

const LOGO = require('../../assets/charly-logo.png');

// "Mediana" -> "medianas", "Familiar" -> "familiares"
const pluralDe = (nombre = '') => {
  const n = nombre.toLowerCase();
  return n.endsWith('r') ? `${n}es` : `${n}s`;
};

export default function HomeScreen() {
  const { tema, modoOscuro, toggleTema } = useTema();
  const { favoritos } = useFavoritos();
  const {
    productos, promociones, tamanos, recargar, error, cargando,
  } = useDatos();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width: anchoPantalla, height: altoPantalla } = useWindowDimensions();
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [subcategoria, setSubcategoria] = useState('Todas');
  const [refrescando, setRefrescando] = useState(false);
  const [tamanoElegido, setTamanoElegido] = useState(null);

  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  const scrollY = useRef(new Animated.Value(0)).current;
  const brinco = useRef(new Animated.Value(0)).current;
  const medidas = useRef({ contenido: 0, visible: 0 });
  const empezoAbajo = useRef(false);
  const [maxScroll, setMaxScroll] = useState(0);

  // ── Logo del header: entrada con rebote, respiración, parallax y toque ──
  const logoEntrada = useRef(new Animated.Value(0)).current;
  const logoFlota = useRef(new Animated.Value(0)).current;
  const logoToque = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrada una sola vez y luego flota y respira sin parar
    const principal = Animated.sequence([
      Animated.spring(logoEntrada, {
        toValue: 1,
        friction: 5,
        tension: 55,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoFlota, {
            toValue: 1,
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(logoFlota, {
            toValue: 0,
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ),
    ]);

    principal.start();
    return () => {
      principal.stop();
    };
  }, []);

  const alTocarLogo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    logoToque.stopAnimation();
    Animated.sequence([
      Animated.timing(logoToque, { toValue: 0.9, duration: 90, useNativeDriver: true }),
      Animated.spring(logoToque, { toValue: 1, friction: 3, tension: 140, useNativeDriver: true }),
    ]).start();
  };

  const logoOpacidad = logoEntrada.interpolate({
    inputRange: [0, 0.35],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const logoEscalaEntrada = logoEntrada.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });
  const logoCae = logoEntrada.interpolate({
    inputRange: [0, 1],
    outputRange: [-46, 0],
  });
  const logoGiro = logoEntrada.interpolate({
    inputRange: [0, 1],
    outputRange: ['-7deg', '0deg'],
  });
  const logoSube = logoFlota.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -7],
  });
  const logoRespira = logoFlota.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03],
  });
  // Parallax: al bajar la lista el logo se mueve más lento; al jalar para actualizar crece
  const logoParallax = scrollY.interpolate({
    inputRange: [-200, 0, ALTO_HEADER],
    outputRange: [0, 0, ALTO_HEADER * 0.35],
    extrapolate: 'clamp',
  });
  const logoCrece = scrollY.interpolate({
    inputRange: [-200, 0],
    outputRange: [1.25, 1],
    extrapolate: 'clamp',
  });

  // ── Botón de modo claro/oscuro: salpicadura roja ──
  // Un círculo rojo crece desde el botón y cubre la pantalla; ya cubierta, se cambia
  // el modo y el rojo se desvanece mostrando el modo nuevo.
  const rootRef = useRef(null);
  const botonRef = useRef(null);
  const splashActivo = useRef(false);
  const [origenSplash, setOrigenSplash] = useState({ x: 0, y: 0 });
  const splashEscala = useRef(new Animated.Value(0.01)).current;
  const splashOpacidad = useRef(new Animated.Value(0)).current;
  const pulso = useRef(new Animated.Value(1)).current;
  const iconoPop = useRef(new Animated.Value(1)).current;
  const primeraVez = useRef(true);

  // Radio suficiente para cubrir toda la pantalla desde cualquier punto
  const radioSplash = Math.hypot(anchoPantalla, altoPantalla);

  // El icono (sol o luna) aparece girando y con rebote cuando cambia el modo
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    iconoPop.setValue(0);
    Animated.spring(iconoPop, {
      toValue: 1,
      damping: 7,
      stiffness: 140,
      useNativeDriver: true,
    }).start();
  }, [modoOscuro]);

  const giroIcono = iconoPop.interpolate({
    inputRange: [0, 1],
    outputRange: ['-120deg', '0deg'],
  });

  const lanzarSplash = (x, y) => {
    setOrigenSplash({ x, y });
    splashEscala.setValue(0.01);
    splashOpacidad.setValue(1);
    Animated.timing(splashEscala, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      toggleTema(); // la pantalla ya está cubierta de rojo: se cambia el modo
      Animated.timing(splashOpacidad, {
        toValue: 0,
        duration: 380,
        delay: 120,
        useNativeDriver: true,
      }).start(() => {
        splashActivo.current = false;
      });
    });
  };

  const alCambiarTema = () => {
    if (splashActivo.current) return;
    splashActivo.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    Animated.sequence([
      Animated.timing(pulso, { toValue: 0.85, duration: 90, useNativeDriver: true }),
      Animated.spring(pulso, { toValue: 1, damping: 6, stiffness: 180, useNativeDriver: true }),
    ]).start();

    const raiz = rootRef.current;
    const boton = botonRef.current;
    if (!raiz || !boton) {
      // Por si no se pudo medir: cambia el modo sin efecto
      toggleTema();
      splashActivo.current = false;
      return;
    }
    // Mide dónde está el botón para que la salpicadura salga de ahí
    raiz.measureInWindow((rx, ry) => {
      boton.measureInWindow((bx, by, bw, bh) => {
        lanzarSplash(bx - rx + bw / 2, by - ry + bh / 2);
      });
    });
  };

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

  const viendoPizzas = categoriaLista === 'Pizzas';
  const mostrarBanner = categoriaLista === 'Todos';

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
    setTamanoElegido(null);
  }, []);

  const abrirPaqueteDeAlerta = () => {
    navigation.navigate('Promos');
  };

  const abrirProducto = useCallback(
    (id) => navigation.navigate('ProductoDetalle', { id }),
    [navigation]
  );
  const quitarTamano = useCallback(() => setTamanoElegido(null), []);

  const productosInicio = useMemo(
    () => productos.filter((p) => !esPaqueteDePromos(p)),
    [productos]
  );

  // Tamaño elegido (si todavía existe en la sucursal) y las pizzas con su precio en ese tamaño
  const tamanoActual = tamanoElegido !== null ? tamanos[tamanoElegido] ?? null : null;
  const pizzasDelTamano = useMemo(() => {
    if (!tamanoActual) return [];
    return productosInicio
      .filter((p) => p.categoria === 'Pizzas')
      .map((p) => {
        const propio = Array.isArray(p.precios) ? p.precios[tamanoElegido] : null;
        return { producto: p, precio: propio != null ? propio : tamanoActual.precio };
      });
  }, [productosInicio, tamanoActual, tamanoElegido]);

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
    if (categoriaLista === 'Favoritos') {
      return productosInicio.filter((p) => favoritos.includes(p.id));
    }

    if (categoriaLista === 'Todos') return productosInicio;

    let lista = productosInicio.filter((p) => p.categoria === categoriaLista);
    if (categoriaLista === 'Pizzas' && subcategoriaLista !== 'Todas') {
      lista = lista.filter((p) => p.subcategoria === subcategoriaLista);
    }
    return lista;
  }, [categoriaLista, subcategoriaLista, favoritos, productosInicio]);

  const posiciones = useMemo(() => {
    const mapa = new Map();
    productosFiltrados.forEach((p, i) => mapa.set(p.id, i));
    return mapa;
  }, [productosFiltrados]);

  let tituloProductos = 'TODOS LOS PRODUCTOS';
  if (categoriaLista === 'Favoritos') tituloProductos = 'FAVORITOS';
  else if (categoriaLista !== 'Todos') tituloProductos = categoriaLista.toUpperCase();

  const textoContador = `${productosFiltrados.length} productos disponibles`;

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
  } else if (categoriaLista === 'Favoritos') {
    vacio = {
      icono: 'heart-outline',
      titulo: 'Aún no tienes favoritos',
      texto: 'Toca el corazón de cualquier producto para guardarlo aquí.',
      boton: { texto: 'Ver el menú', alPresionar: () => cambiarCategoria('Todos') },
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

  return (
    <SafeAreaView
      ref={rootRef}
      collapsable={false}
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: ROJO }]}
    >
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
        {/* Bloque rojo que queda ARRIBA del header (se ve al jalar para actualizar).
            Va dentro del scroll para moverse junto con el logo. No ocupa espacio. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -1000,
            left: 0,
            right: 0,
            height: 1000,
            backgroundColor: ROJO,
          }}
        />

        {/* ── HEADER ROJO: logo animado, grande y sin margen ── */}
        <View style={styles.header}>
          <Pressable onPress={alTocarLogo} style={styles.logoToque}>
            <Animated.View
              style={{
                width: '100%',
                height: '100%',
                opacity: logoOpacidad,
                transform: [
                  { translateY: logoParallax },
                  { translateY: logoCae },
                  { translateY: logoSube },
                  { rotate: logoGiro },
                  { scale: logoEscalaEntrada },
                  { scale: logoRespira },
                  { scale: logoCrece },
                  { scale: logoToque },
                ],
              }}
            >
              <Image
                source={LOGO}
                style={styles.logoLibre}
                contentFit="contain"
                accessibilityLabel={`Logo de ${MARCA.nombre}`}
              />
            </Animated.View>
          </Pressable>
        </View>

        {/* ── FILTROS (sticky) ──
            Importante: una vista "sticky" ignora el acomodo en fila de lo que lleva dentro.
            Por eso aquí hay DOS vistas: la de afuera es la sticky (solo lleva el fondo)
            y la de adentro es la que acomoda el botón y los filtros en una fila. */}
        <View style={{ backgroundColor: tema.fondo }}>
          <View style={styles.filtrosFila}>
            <Animated.View style={[styles.botonTemaWrap, { transform: [{ scale: pulso }] }]}>
              <View ref={botonRef} collapsable={false}>
                <TouchableOpacity
                  style={styles.botonTema}
                  onPress={alCambiarTema}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={modoOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                >
                  <Animated.View
                    style={[
                      styles.iconoTema,
                      { transform: [{ scale: iconoPop }, { rotate: giroIcono }] },
                    ]}
                  >
                    <Ionicons
                      name={modoOscuro ? 'moon' : 'sunny'}
                      size={modoOscuro ? 20 : 22}
                      color="#FFFFFF"
                    />
                  </Animated.View>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <View style={styles.filtrosLista}>
              <FiltrosCategorias
                categoriaActiva={categoriaActiva}
                onSelect={cambiarCategoria}
              />
            </View>
          </View>
        </View>

        {/* Aviso de sin internet */}
        {mostrarAvisoSinRed && (
          <View style={styles.avisoWrap}>
            <View style={[styles.avisoSinRed, { backgroundColor: fondoAviso }]}>
              <Ionicons name="cloud-offline-outline" size={15} color={textoAviso} />
              <Text style={[styles.avisoSinRedTexto, { color: textoAviso }]} numberOfLines={1}>
                Sin internet · menú guardado
              </Text>
              <Pressable onPress={recargar} hitSlop={10}>
                <Text style={styles.avisoSinRedBoton}>Reintentar</Text>
              </Pressable>
            </View>
          </View>
        )}

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
                <TarjetaTamano
                  key={t.id}
                  tamano={t}
                  nivel={i}
                  activo={i === tamanoElegido}
                  onElegir={setTamanoElegido}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Todas las pizzas del tamaño elegido */}
        {viendoPizzas && tamanoActual && (
          <ListaPizzasTamano
            key={tamanoActual.id ?? tamanoElegido}
            titulo={`PIZZAS ${pluralDe(tamanoActual.nombre).toUpperCase()}`}
            nombreTamano={tamanoActual.nombre}
            items={pizzasDelTamano}
            onAbrir={abrirProducto}
            onCerrar={quitarTamano}
          />
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

      {/* Salpicadura roja del cambio de modo (siempre montada, invisible en reposo) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.splash,
          {
            width: radioSplash * 2,
            height: radioSplash * 2,
            borderRadius: radioSplash,
            left: origenSplash.x - radioSplash,
            top: origenSplash.y - radioSplash,
            opacity: splashOpacidad,
            transform: [{ scale: splashEscala }],
          },
        ]}
      />

      <AlertaPaquetes oscuro={modoOscuro} onVerPaquete={abrirPaqueteDeAlerta} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  oculto: { display: 'none' },

  // ── HEADER ROJO (solo logo, igual en modo claro y oscuro) ──
  header: {
    backgroundColor: ROJO,
    height: ALTO_HEADER,
    overflow: 'hidden',             // lo que sobre del logo ampliado se corta
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoToque: {
    width: '100%',
    height: '100%',
  },
  // Logo grande y libre: sin círculo, sin borde, sin sombra, sin margen.
  // Si aún ves margen, sube el scale (1.4 -> 1.6). Si se corta, bájalo.
  logoLibre: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.4 }],
  },
  // Imagen del logo escondido (círculo de abajo)
  logoImagen: {
    width: '100%',
    height: '100%',
  },

  // ── FILTROS + BOTÓN DE TEMA (en una fila) ──
  filtrosFila: {
    flexDirection: 'row',
    alignItems: 'center',           // el botón queda centrado con los filtros
    paddingTop: 12,
    paddingBottom: 8,
    paddingLeft: 16,
  },
  // Los filtros ya traen su propio margen a la izquierda; se resta para que el botón quede pegado
  filtrosLista: {
    flex: 1,
    marginLeft: -8,
  },
  // zIndex: si un filtro se desliza hacia el botón, pasa por debajo de él
  botonTemaWrap: {
    zIndex: 2,
  },
  botonTema: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ROJO,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ROJO,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  iconoTema: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── SALPICADURA DEL CAMBIO DE MODO ──
  splash: {
    position: 'absolute',
    backgroundColor: ROJO,
  },

  // ── AVISO SIN INTERNET ──
  avisoWrap: { paddingHorizontal: 16, paddingTop: 4 },
  avisoSinRed: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  avisoSinRedTexto: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  avisoSinRedBoton: { color: ROJO, fontFamily: 'Poppins_700Bold', fontSize: 12 },

  // ── SECCIONES ──
  seccion: { marginTop: 20, paddingHorizontal: 16 },
  seccionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  seccionTitulo: { fontFamily: FUENTE_TITULOS, fontSize: 16, letterSpacing: 1.2 },
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