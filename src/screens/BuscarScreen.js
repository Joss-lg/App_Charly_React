// src/screens/BuscarScreen.js
// Pestaña Buscar: barra de búsqueda y resultados de productos.

import { useState, useMemo, useRef, useCallback, useDeferredValue } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable, StyleSheet,
  TouchableOpacity, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../context/ThemeContext';
import { useDatos } from '../context/DatosContext';
import ProductCard from '../components/ProductCard';
import { esPaqueteDePromos } from '../data/paquetes';
import { COLORES } from '../config/marca';
import { IconoBuscar, IconoCerrar } from '../components/IconosUI';

const ROJO = COLORES.primario;
const SUGERENCIAS = ['Pepperoni', 'Hawaiana', 'Mexicana', 'Alitas', 'Refresco'];
const TARJETAS_ANIMADAS = 6;

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function coincide(producto, palabras) {
  const texto = normalizar(
    `${producto.nombre} ${producto.descripcion} ${producto.categoria} ${producto.subcategoria ?? ''}`
  );
  return palabras.every((palabra) => texto.includes(palabra));
}

export default function BuscarScreen() {
  const { tema, modoOscuro } = useTema();
  const { productos } = useDatos();
  const [busqueda, setBusqueda] = useState('');
  const [activo, setActivo] = useState(false);
  const inputRef = useRef(null);

  const busquedaLista = useDeferredValue(busqueda);
  const hayBusqueda = busquedaLista.trim().length > 0;

  // Al entrar a la pestaña se abre el teclado; al salir se cierra
  useFocusEffect(
    useCallback(() => {
      const espera = setTimeout(() => inputRef.current?.focus(), 250);
      return () => {
        clearTimeout(espera);
        Keyboard.dismiss();
      };
    }, [])
  );

  const productosInicio = useMemo(
    () => productos.filter((p) => !esPaqueteDePromos(p)),
    [productos]
  );

  const resultados = useMemo(() => {
    const palabras = normalizar(busquedaLista).split(/\s+/).filter(Boolean);
    if (!palabras.length) return [];
    return productosInicio.filter((p) => coincide(p, palabras));
  }, [busquedaLista, productosInicio]);

  const fondoCaja = modoOscuro ? '#2A2A2A' : '#F2F2F2';
  const colorIconoSuave = '#8A8A8A';

  const textoContador = `${resultados.length} ${resultados.length === 1 ? 'resultado' : 'resultados'} para "${busquedaLista.trim()}"`;

  const encabezado = (
    <View style={styles.encabezado}>
      <View style={styles.tituloFila}>
        <Text style={[styles.titulo, { color: tema.texto }]}>BUSCAR</Text>
        <View style={styles.lineaMarca} />
      </View>

      <View
        style={[
          styles.caja,
          { backgroundColor: fondoCaja },
          activo && styles.cajaActiva,
        ]}
      >
        <IconoBuscar color={activo ? ROJO : colorIconoSuave} size={18} />
        <TextInput
          ref={inputRef}
          placeholder="Busca pizza, alitas, refresco..."
          placeholderTextColor={modoOscuro ? '#6A6A6A' : '#9A9A9A'}
          value={busqueda}
          onChangeText={setBusqueda}
          onFocus={() => setActivo(true)}
          onBlur={() => setActivo(false)}
          returnKeyType="search"
          autoCorrect={false}
          style={[styles.input, { color: tema.texto, fontFamily: 'Poppins_400Regular' }]}
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

      {hayBusqueda && resultados.length > 0 && (
        <Text style={[styles.contador, { color: tema.textoSecundario }]}>{textoContador}</Text>
      )}
    </View>
  );

  const vacio = !hayBusqueda ? (
    <View style={styles.vacio}>
      <View style={[styles.circuloVacio, { backgroundColor: tema.card }]}>
        <Ionicons name="search-outline" size={34} color={ROJO} />
      </View>
      <Text style={[styles.vacioTitulo, { color: tema.texto }]}>¿Qué se te antoja?</Text>
      <Text style={[styles.vacioTexto, { color: tema.textoSecundario }]}>
        Escribe el nombre de una pizza, alitas o una bebida.
      </Text>
      <View style={styles.sugerencias}>
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
      </View>
    </View>
  ) : (
    <View style={styles.vacio}>
      <View style={[styles.circuloVacio, { backgroundColor: tema.card }]}>
        <Ionicons name="pizza-outline" size={34} color={ROJO} />
      </View>
      <Text style={[styles.vacioTitulo, { color: tema.texto }]}>Sin resultados</Text>
      <Text style={[styles.vacioTexto, { color: tema.textoSecundario }]}>
        {`No encontramos "${busquedaLista.trim()}". Prueba con otra palabra.`}
      </Text>
      <Pressable
        onPress={() => setBusqueda('')}
        style={({ pressed }) => [styles.botonVacio, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.textoBotonVacio}>Borrar búsqueda</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: tema.fondo }]}>
      <FlatList
        data={resultados}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={encabezado}
        ListEmptyComponent={vacio}
        renderItem={({ item, index }) => (
          <ProductCard
            producto={item}
            posicion={index < TARJETAS_ANIMADAS ? index : -1}
            animarAl={index < TARJETAS_ANIMADAS ? busquedaLista : null}
          />
        )}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.lista}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  lista: { paddingBottom: 130 },

  encabezado: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  tituloFila: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  titulo: { fontFamily: 'Poppins_700Bold', fontSize: 13, letterSpacing: 1 },
  lineaMarca: { flex: 1, height: 2, backgroundColor: ROJO, marginLeft: 10, borderRadius: 2 },

  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cajaActiva: { borderColor: ROJO },
  input: { flex: 1, fontSize: 13, padding: 0 },
  botonLimpiar: {
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  contador: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 10 },

  vacio: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 32 },
  circuloVacio: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  vacioTitulo: { fontFamily: 'Poppins_700Bold', fontSize: 17, textAlign: 'center' },
  vacioTexto: {
    fontFamily: 'Poppins_400Regular', fontSize: 13,
    lineHeight: 19, textAlign: 'center', marginTop: 4,
  },
  sugerencias: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: 8, marginTop: 18,
  },
  sugerencia: {
    borderWidth: 1, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  sugerenciaTexto: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  botonVacio: {
    marginTop: 18, backgroundColor: ROJO,
    borderRadius: 22, paddingHorizontal: 22, paddingVertical: 10,
  },
  textoBotonVacio: {
    fontFamily: 'Poppins_700Bold', fontSize: 13,
    color: COLORES.textoSobrePrimario,
  },
});