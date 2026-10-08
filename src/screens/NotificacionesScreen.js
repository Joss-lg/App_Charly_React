// src/screens/NotificacionesScreen.js
// Pestaña "Avisos":
// - Si el usuario no dio permiso, un aviso para activar las notificaciones.
// - Avisos agrupados por día (Hoy, Ayer, Esta semana), con miniatura del producto sin recortes.
// - Estado vacío con mensaje claro.
// - Al tocar otra vez "Avisos" en la barra de abajo, sube hasta arriba.
// - Los colores vienen de src/config/marca.js.

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Linking, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../context/ThemeContext';
import { useDatos } from '../context/DatosContext';
import { useNotificaciones, irADestino } from '../context/NotificacionesContext';
import { estadoPermiso } from '../lib/recordatorios';
import { COLORES } from '../config/marca';

const ROJO = COLORES.primario;
const PROPORCION_FOTO = 16 / 9; // las fotos de productos son horizontales

// Color de cada tipo de aviso. "colorOscuro" se usa en modo oscuro para que se lea.
const TIPOS = {
  promo: { icono: 'pricetag', color: ROJO, colorOscuro: COLORES.primarioClaro, etiqueta: 'Promoción' },
  nuevo: { icono: 'sparkles', color: '#27AE60', colorOscuro: '#4CD483', etiqueta: 'Novedad' },
  aviso: { icono: 'megaphone', color: '#2C3E50', colorOscuro: '#8FA3B8', etiqueta: 'Aviso' },
  recordatorio: {
    icono: 'sparkles',
    color: COLORES.primarioOscuro,
    colorOscuro: COLORES.primarioClaro,
    etiqueta: 'Para ti',
  },
};

const NOMBRES_DESTINO = {
  Promos: 'Ver paquetes',
  Sucursales: 'Ver sucursales',
  Inicio: 'Ver menú',
  ProductoDetalle: 'Ver producto',
};

function textoDestino(destino) {
  if (!destino) return null;
  const pantalla = typeof destino === 'string' ? destino : destino.pantalla;
  return NOMBRES_DESTINO[pantalla] ?? 'Ver más';
}

function tiempoRelativo(fechaISO) {
  if (!fechaISO) return '';
  const minutos = Math.floor((Date.now() - new Date(fechaISO).getTime()) / 60000);
  if (minutos < 60) return `Hace ${Math.max(minutos, 1)} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} h`;
  return new Date(fechaISO).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
}

function inicioDelDia(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
}

// "Hoy", "Ayer" o "Esta semana"
function grupoDeFecha(fechaISO) {
  if (!fechaISO) return 'Anteriores';
  const hoy = inicioDelDia(new Date());
  const dia = inicioDelDia(new Date(fechaISO));
  const diferencia = Math.round((hoy - dia) / 86400000);
  if (diferencia <= 0) return 'Hoy';
  if (diferencia === 1) return 'Ayer';
  if (diferencia < 7) return 'Esta semana';
  return 'Anteriores';
}

function TarjetaAviso({ notif, producto, onPress }) {
  const { tema, modoOscuro } = useTema();
  const tipo = TIPOS[notif.tipo] ?? TIPOS.aviso;
  const enlace = textoDestino(notif.destino);
  const colorEtiqueta = modoOscuro ? tipo.colorOscuro : tipo.color;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tarjeta,
        {
          backgroundColor: tema.card,
          borderColor: notif.leida
            ? modoOscuro ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
            : 'rgba(227,30,36,0.5)',
        },
        pressed && { transform: [{ scale: 0.985 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${notif.leida ? '' : 'Sin leer. '}${notif.titulo}. ${notif.mensaje}`}
    >
      {/* Miniatura horizontal con la misma forma que la foto: se ve completa */}
      {producto?.imagen ? (
        <Image
          source={{ uri: producto.imagen }}
          style={styles.miniatura}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={styles.iconoCaja}>
          <View style={[styles.iconoCirculo, { backgroundColor: tipo.color }]}>
            <Ionicons name={tipo.icono} size={22} color="#FFFFFF" />
          </View>
        </View>
      )}

      <View style={styles.cuerpo}>
        <View style={styles.filaSuperior}>
          <Text style={[styles.etiqueta, { color: colorEtiqueta }]}>{tipo.etiqueta}</Text>
          <Text style={[styles.hora, { color: tema.textoSoloInfo }]}>
            {tiempoRelativo(notif.fecha)}
          </Text>
        </View>

        <Text
          style={[
            styles.titulo,
            { color: tema.texto, fontFamily: notif.leida ? 'Poppins_600SemiBold' : 'Poppins_700Bold' },
          ]}
          numberOfLines={2}
        >
          {notif.titulo}
        </Text>
        <Text style={[styles.mensaje, { color: tema.textoSecundario }]} numberOfLines={3}>
          {notif.mensaje}
        </Text>

        {enlace && (
          <View style={styles.filaEnlace}>
            <Text style={[styles.enlace, { color: tema.precio }]}>{enlace}</Text>
            <Ionicons name="chevron-forward" size={14} color={tema.precio} />
          </View>
        )}
      </View>

      {!notif.leida && <View style={styles.puntoNoLeida} />}
    </Pressable>
  );
}

export default function NotificacionesScreen() {
  const { tema, modoOscuro } = useTema();
  const { productos = [] } = useDatos();
  const navigation = useNavigation();
  const {
    notificaciones, marcarLeida, marcarTodas, noLeidas, refrescarRecordatorios,
  } = useNotificaciones();

  const [permiso, setPermiso] = useState('si');
  const [refrescando, setRefrescando] = useState(false);

  // Al tocar otra vez "Avisos" en la barra de abajo, sube hasta arriba
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  const revisarEstado = useCallback(async () => {
    refrescarRecordatorios();
    const estado = await estadoPermiso().catch(() => 'no');
    setPermiso(estado);
  }, [refrescarRecordatorios]);

  // Cada vez que entras a Avisos, se actualiza todo
  useFocusEffect(
    useCallback(() => {
      revisarEstado();
    }, [revisarEstado])
  );

  const alRefrescar = async () => {
    setRefrescando(true);
    await revisarEstado();
    setRefrescando(false);
  };

  // Agrupa los avisos por día, en orden
  const grupos = useMemo(() => {
    const orden = ['Hoy', 'Ayer', 'Esta semana', 'Anteriores'];
    const mapa = {};
    notificaciones.forEach((n) => {
      const g = grupoDeFecha(n.fecha);
      (mapa[g] = mapa[g] || []).push(n);
    });
    return orden.filter((g) => mapa[g]).map((g) => ({ nombre: g, items: mapa[g] }));
  }, [notificaciones]);

  const buscarProducto = (n) => {
    const id = n.productoId ?? n.destino?.id;
    if (id == null) return null;
    return productos.find((p) => p.id === id) || null;
  };

  const abrir = (notif) => {
    marcarLeida(notif.id);
    irADestino(navigation, notif.destino);
  };

  // Colores del aviso "notificaciones apagadas" (tonos de la marca)
  const fondoEstado = modoOscuro ? '#2A1A1A' : '#FDECEC';
  const textoEstado = modoOscuro ? '#F2A5A5' : '#9B1C1C';

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: tema.fondo }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
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
        <View style={styles.filaTitulo}>
          <Text style={[styles.tituloGrande, { color: tema.texto }]}>Avisos</Text>
          {noLeidas > 0 && (
            <Pressable onPress={marcarTodas} hitSlop={10}>
              <Text style={[styles.marcarTodas, { color: tema.precio }]}>Marcar todo leído</Text>
            </Pressable>
          )}
        </View>
        <Text style={[styles.subtitulo, { color: tema.textoSecundario }]}>
          {noLeidas > 0
            ? `Tienes ${noLeidas} ${noLeidas === 1 ? 'aviso nuevo' : 'avisos nuevos'}`
            : 'Estás al día'}
        </Text>

        {/* ── ESTADO DE LAS NOTIFICACIONES ── */}
        {permiso === 'no' ? (
          <Pressable
            onPress={() => Linking.openSettings().catch(() => {})}
            style={({ pressed }) => [
              styles.cajaEstado,
              { backgroundColor: fondoEstado },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={[styles.iconoEstado, { backgroundColor: 'rgba(227,30,36,0.15)' }]}>
              <Ionicons name="notifications-off" size={20} color={ROJO} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tituloEstado, { color: textoEstado }]}>
                Las notificaciones están apagadas
              </Text>
              <Text style={[styles.detalleEstado, { color: textoEstado }]}>
                Toca aquí para activarlas en Ajustes.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={textoEstado} />
          </Pressable>
        ) : null}

        {/* ── LISTA ── */}
        {notificaciones.length === 0 ? (
          <View style={styles.vacio}>
            <View style={[styles.circuloVacio, { backgroundColor: tema.card }]}>
              <Ionicons name="notifications-outline" size={34} color={ROJO} />
            </View>
            <Text style={[styles.tituloVacio, { color: tema.texto }]}>Aún no hay avisos</Text>
            <Text style={[styles.textoVacio, { color: tema.textoSecundario }]}>
              Aquí aparecerán los paquetes y antojos que te recomendemos cada día.
            </Text>
          </View>
        ) : (
          grupos.map((grupo) => (
            <View key={grupo.nombre}>
              <View style={styles.seccionHeader}>
                <Text style={[styles.seccionTitulo, { color: tema.texto }]}>
                  {grupo.nombre.toUpperCase()}
                </Text>
                <View style={styles.lineaMarca} />
              </View>
              {grupo.items.map((n) => (
                <TarjetaAviso
                  key={n.id}
                  notif={n}
                  producto={buscarProducto(n)}
                  onPress={() => abrir(n)}
                />
              ))}
            </View>
          ))
        )}

        {/* Espacio para que la barra flotante no tape el contenido */}
        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  filaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tituloGrande: { fontFamily: 'Poppins_700Bold', fontSize: 30, lineHeight: 38 },
  subtitulo: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginBottom: 14 },
  marcarTodas: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },

  // Estado
  cajaEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 14,
    marginBottom: 6,
  },
  iconoEstado: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloEstado: { fontFamily: 'Poppins_700Bold', fontSize: 13 },
  detalleEstado: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 17 },

  // Secciones por día
  seccionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  seccionTitulo: { fontFamily: 'Poppins_700Bold', fontSize: 13, letterSpacing: 1 },
  lineaMarca: {
    flex: 1,
    height: 2,
    backgroundColor: ROJO,
    marginLeft: 10,
    borderRadius: 2,
  },

  // Tarjeta
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  // 96 x 54 = forma horizontal 16:9, igual que las fotos de los productos
  miniatura: {
    width: 96,
    aspectRatio: PROPORCION_FOTO,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    marginTop: 2,
  },
  iconoCaja: { width: 96, alignItems: 'center', paddingTop: 2 },
  iconoCirculo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuerpo: { flex: 1 },
  filaSuperior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 14,
  },
  etiqueta: { fontFamily: 'Poppins_700Bold', fontSize: 11 },
  hora: { fontFamily: 'Poppins_400Regular', fontSize: 11 },
  titulo: { fontSize: 15, lineHeight: 20, marginTop: 1 },
  mensaje: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 17, marginTop: 2 },
  filaEnlace: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6 },
  enlace: { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  puntoNoLeida: {
    position: 'absolute',
    top: 14,
    right: 12,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: ROJO,
  },

  // Vacío
  vacio: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  circuloVacio: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  tituloVacio: { fontFamily: 'Poppins_700Bold', fontSize: 17 },
  textoVacio: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 4,
  },
});