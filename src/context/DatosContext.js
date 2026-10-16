// src/context/DatosContext.js
// Descarga de Supabase el menú, tamaños, promociones, avisos y sucursales.
// - Primero muestra la copia guardada en el teléfono (instantáneo) y luego lo nuevo.
// - Se descarga TODO una sola vez y se entrega solo lo de la sucursal elegida
//   (ver SucursalContext). Así cambiar de sucursal es instantáneo y funciona sin internet.
// - Menú: un catálogo único. La tabla "producto_sucursal" solo tiene filas cuando una
//   sucursal cambia algo (no vende el producto, o lo vende a otro precio).
// - Promociones, avisos y tamaños: columna "sucursal_id". Vacía = para todas las sucursales.
// - Entrega "sucursales" (todas) y "sucursal" (la elegida, o la primera si no hay elegida).

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { AppState, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, supabaseConfigurado } from '../lib/supabase';
import { sucursal as sucursalLocal } from '../data/sucursal';
import { MARCA } from '../config/marca';
import { useSucursal } from './SucursalContext';

const DatosContext = createContext();
// v2: la copia guardada ahora incluye "producto_sucursal" y la sucursal de cada registro
const CLAVE_CACHE = `${MARCA.prefijoGuardado}:datosCache_v2`;

// Cambiar a true solo para diagnosticar problemas de conexión (muestra alertas)
const DEPURAR = false;

// ── Convertidores: de columnas de Supabase al formato que usa la app ──

function formatoHora(hora24) {
  const sufijo = hora24 >= 12 ? 'PM' : 'AM';
  const hora12 = hora24 % 12 === 0 ? 12 : hora24 % 12;
  return `${hora12}:00 ${sufijo}`;
}

function formatoTelefono(tel = '') {
  const d = tel.replace(/\D/g, '');
  return d.length === 10 ? `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}` : tel;
}

const convertirProducto = (p) => ({
  id: p.id,
  nombre: p.nombre,
  descripcion: p.descripcion ?? '',
  precio: Number(p.precio),
  categoria: p.categoria,
  subcategoria: p.subcategoria ?? null,
  precioDesde: Boolean(p.precio_desde),
  imagen: p.imagen_url,
  oferta: Boolean(p.oferta),
  // Casilla "solo_promos": el producto solo sale en la pestaña Promos
  soloPromos: Boolean(p.solo_promos),
  // Precios propios por tamaño (Chica, Mediana, Grande, Familiar). Vacío = usa la tabla "tamanos"
  precios: Array.isArray(p.precios) ? p.precios.map(Number) : null,
});

// Excepciones del menú por sucursal
const convertirProductoSucursal = (r) => ({
  productoId: r.producto_id,
  sucursalId: r.sucursal_id,
  disponible: r.disponible !== false,
  precio: r.precio == null ? null : Number(r.precio),
});

const convertirPromocion = (p) => ({
  id: p.id,
  titulo: p.titulo,
  descripcion: p.descripcion ?? '',
  color: p.color ?? '#C0392B',
  icono: p.icono ?? 'pizza',
  emoji: p.icono === 'delivery' ? '🛵' : '🍕',
  etiqueta: p.etiqueta ?? '',
  dia: p.dia ?? null,
  sucursalId: p.sucursal_id ?? null,
});

const convertirSucursal = (s) => ({
  id: s.id,
  nombre: s.nombre,
  direccion: s.direccion ?? '',
  telefono: s.telefono ?? '',
  telefonoFormato: formatoTelefono(s.telefono),
  whatsapp: s.whatsapp ?? '',
  horario: { apertura: s.hora_apertura, cierre: s.hora_cierre },
  horarioTexto: `${formatoHora(s.hora_apertura)} – ${formatoHora(s.hora_cierre)}`,
  imagen: s.imagen_url,
  // Enlace de Google Maps de cada sucursal (columna "mapa_url")
  mapaUrl: s.mapa_url ?? '',
  // Fotos reales de la sucursal para el carrusel (columna "imagenes")
  imagenes: Array.isArray(s.imagenes) ? s.imagenes.filter(Boolean) : [],
});

const convertirNotificacion = (n) => ({
  id: n.id,
  tipo: n.tipo,
  titulo: n.titulo,
  mensaje: n.mensaje ?? '',
  destino: n.destino,
  fecha: n.fecha,
  sucursalId: n.sucursal_id ?? null,
});

// Tamaños de pizza (Chica, Mediana, Grande, Familiar)
const convertirTamano = (t) => ({
  id: t.id,
  nombre: t.nombre,
  rebanadas: t.rebanadas,
  precio: Number(t.precio),
  orden: t.orden ?? 0,
  sucursalId: t.sucursal_id ?? null,
});

// Sin conexión la primera vez: solo los datos locales de la sucursal (sin menú falso)
const DATOS_INICIALES = {
  productos: [],
  productoSucursal: [],
  promociones: [],
  sucursales: [sucursalLocal],
  notificaciones: [],
  tamanos: [],
};

// ── Filtro por sucursal ──

// Un registro es de esta sucursal si es de ella o si no tiene sucursal (= para todas)
const esDeLaSucursal = (item, sucursalId) =>
  item.sucursalId == null || item.sucursalId === sucursalId;

function filtrarPorSucursal(datos, sucursalId) {
  const elegida = datos.sucursales.find((s) => s.id === sucursalId) ?? null;

  // Sin sucursal elegida (o todavía no cargan las sucursales): se entrega todo sin filtrar
  if (sucursalId == null || !elegida) {
    return { ...datos, sucursal: datos.sucursales[0] };
  }

  // Menú: se quitan los no disponibles y se aplica el precio propio de la sucursal
  const reglas = new Map();
  datos.productoSucursal
    .filter((r) => r.sucursalId === sucursalId)
    .forEach((r) => reglas.set(r.productoId, r));

  const productos = datos.productos
    .filter((p) => reglas.get(p.id)?.disponible !== false)
    .map((p) => {
      const regla = reglas.get(p.id);
      return regla?.precio != null ? { ...p, precio: regla.precio } : p;
    });

  // Tamaños: si la sucursal tiene uno propio con el mismo nombre, gana el de la sucursal
  const propios = datos.tamanos.filter((t) => t.sucursalId === sucursalId);
  const nombresPropios = new Set(propios.map((t) => t.nombre));
  const generales = datos.tamanos.filter(
    (t) => t.sucursalId == null && !nombresPropios.has(t.nombre)
  );
  const tamanos = [...generales, ...propios].sort((a, b) => a.orden - b.orden);

  return {
    ...datos,
    productos,
    tamanos,
    promociones: datos.promociones.filter((p) => esDeLaSucursal(p, sucursalId)),
    notificaciones: datos.notificaciones.filter((n) => esDeLaSucursal(n, sucursalId)),
    sucursal: elegida,
  };
}

export function DatosProvider({ children }) {
  const { sucursalId, cambiarSucursal } = useSucursal();
  const [datos, setDatos] = useState(DATOS_INICIALES);
  const [origen, setOrigen] = useState('local'); // 'local' | 'cache' | 'supabase'
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const cargandoRef = useRef(false);

  const descargar = useCallback(async () => {
    if (!supabaseConfigurado) {
      if (DEPURAR) Alert.alert('Supabase', 'Faltan las llaves en .env (URL o clave vacías).');
      return;
    }
    if (cargandoRef.current) return;
    cargandoRef.current = true;
    setCargando(true);

    try {
      const [prods, prodSuc, promos, sucs, notifs, tams] = await Promise.all([
        supabase.from('productos').select('*').order('orden'),
        supabase.from('producto_sucursal').select('*'),
        supabase.from('promociones').select('*').order('orden'),
        supabase.from('sucursales').select('*').order('id'),
        supabase.from('notificaciones').select('*').order('fecha', { ascending: false }),
        supabase.from('tamanos').select('*').order('orden'),
      ]);

      const nombres = [
        'productos', 'producto_sucursal', 'promociones', 'sucursales', 'notificaciones','tamanos',
      ];
      [prods, prodSuc, promos, sucs, notifs, tams].forEach((r, i) => {
        if (r.error) throw new Error(`Tabla ${nombres[i]}: ${r.error.message}`);
      });

      const listaSucursales = sucs.data.length
        ? sucs.data.map(convertirSucursal)
        : [sucursalLocal];

      const nuevos = {
        productos: prods.data.map(convertirProducto),
        productoSucursal: prodSuc.data.map(convertirProductoSucursal),
        promociones: promos.data.map(convertirPromocion),
        sucursales: listaSucursales,
        notificaciones: notifs.data.map(convertirNotificacion),
        tamanos: tams.data.map(convertirTamano),
      };

      setDatos(nuevos);
      setOrigen('supabase');
      setError(null);
      AsyncStorage.setItem(CLAVE_CACHE, JSON.stringify(nuevos)).catch(() => {});

      const resumen =
        `${nuevos.productos.length} productos, ${nuevos.tamanos.length} tamaños, ` +
        `${nuevos.promociones.length} promociones, ${nuevos.notificaciones.length} avisos, ` +
        `${nuevos.sucursales.length} sucursales`;
      console.log(`✅ Supabase: ${resumen}`);
      if (DEPURAR) Alert.alert('✅ Supabase conectado', resumen);
    } catch (e) {
      // Si falla (sin internet, etc.) se quedan los datos que ya había
      const mensaje = e?.message ?? String(e);
      setError(mensaje);
      console.log('⚠️ Supabase no respondió, se usan datos guardados:', mensaje);
      if (DEPURAR) Alert.alert('⚠️ Supabase falló', mensaje);
    } finally {
      cargandoRef.current = false;
      setCargando(false);
    }
  }, []);

  // Al abrir: primero la copia guardada (instantáneo), luego lo nuevo de Supabase
  useEffect(() => {
    AsyncStorage.getItem(CLAVE_CACHE)
      .then((valor) => {
        if (valor) {
          // Se mezcla con los iniciales por si a la copia guardada le falta algo
          setDatos({ ...DATOS_INICIALES, ...JSON.parse(valor) });
          setOrigen('cache');
        }
      })
      .catch(() => {})
      .finally(descargar);
  }, [descargar]);

  // Cada vez que la app vuelve a primer plano, busca cambios
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') descargar();
    });
    return () => sub.remove();
  }, [descargar]);

  // Si la sucursal guardada ya no existe en Supabase, se vuelve a pedir que elija
  useEffect(() => {
    if (origen !== 'supabase' || sucursalId == null) return;
    if (!datos.sucursales.some((s) => s.id === sucursalId)) cambiarSucursal();
  }, [origen, sucursalId, datos.sucursales, cambiarSucursal]);

  // Lo que ven las pantallas: solo lo de la sucursal elegida
  const datosVista = useMemo(() => filtrarPorSucursal(datos, sucursalId), [datos, sucursalId]);

  return (
    <DatosContext.Provider value={{ ...datosVista, origen, cargando, error, recargar: descargar }}>
      {children}
    </DatosContext.Provider>
  );
}

export function useDatos() {
  return useContext(DatosContext);
}