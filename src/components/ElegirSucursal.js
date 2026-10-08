// src/components/ElegirSucursal.js
// Ventanita que sube desde abajo para elegir una sucursal
// (se usa antes de llamar o escribir por WhatsApp cuando hay varias).
// - Muestra nombre, dirección y si está Abierta o Cerrada.
// - Exporta estaAbierta(sucursal) para usarla en otras pantallas.
//
// Uso:
//   <ElegirSucursal
//     visible={...}
//     sucursales={sucursales}
//     titulo="¿A qué sucursal le escribimos?"
//     onElegir={(s) => ...}
//     onCerrar={() => ...}
//   />

import { useEffect, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, Pressable, Animated, Easing, ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTema } from '../context/ThemeContext';
import { COLORES } from '../config/marca';

// ¿La sucursal está abierta ahorita?
// Regresa true / false, o null si la sucursal no tiene horario.
// Funciona aunque cierre después de medianoche (ej. 18 a 2).
export function estaAbierta(sucursal) {
  if (!sucursal) return null;
  const abre = Number(sucursal.horario?.apertura ?? sucursal.hora_apertura);
  const cierra = Number(sucursal.horario?.cierre ?? sucursal.hora_cierre);
  if (
    sucursal.horario?.apertura == null && sucursal.hora_apertura == null
  ) return null;
  if (isNaN(abre) || isNaN(cierra)) return null;

  const ahora = new Date();
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const minAbre = abre * 60;
  const minCierra = cierra * 60;

  if (minCierra > minAbre) {
    return minutosAhora >= minAbre && minutosAhora < minCierra;
  }
  // Cierra pasada la medianoche
  return minutosAhora >= minAbre || minutosAhora < minCierra;
}

export default function ElegirSucursal({
  visible,
  sucursales = [],
  titulo = 'Elige tu sucursal',
  onElegir,
  onCerrar,
}) {
  const { tema, modoOscuro } = useTema();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const fondo = useRef(new Animated.Value(0)).current;
  const subida = useRef(new Animated.Value(0)).current;

  // Al abrir: el fondo se oscurece y la hoja sube con resorte
  useEffect(() => {
    if (!visible) return;
    fondo.setValue(0);
    subida.setValue(0);
    Animated.parallel([
      Animated.timing(fondo, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(subida, { toValue: 1, damping: 18, stiffness: 180, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  // Al cerrar: baja la hoja y luego avisa
  const cerrar = (despues) => {
    Animated.parallel([
      Animated.timing(fondo, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(subida, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (despues) despues();
      else if (onCerrar) onCerrar();
    });
  };

  const elegir = (s) => {
    Haptics.selectionAsync().catch(() => {});
    cerrar(() => onElegir && onElegir(s));
  };

  const translateY = subida.interpolate({
    inputRange: [0, 1],
    outputRange: [height * 0.6, 0],
  });

  const bordeSuave = modoOscuro ? '#2C2C2C' : '#EEEEEE';
  const fondoFila = modoOscuro ? '#242424' : '#F7F7F7';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => cerrar()}
    >
      {/* Fondo oscuro: tocarlo cierra */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.fondo, { opacity: fondo }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => cerrar()}
          accessibilityLabel="Cerrar"
        />
      </Animated.View>

      <View style={styles.abajo} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.hoja,
            {
              backgroundColor: tema.card,
              paddingBottom: insets.bottom + 14,
              maxHeight: height * 0.75,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Rayita para indicar que es una hoja */}
          <View style={[styles.rayita, { backgroundColor: modoOscuro ? '#444' : '#D6D6D6' }]} />

          <Text style={[styles.titulo, { color: tema.texto }]}>{titulo}</Text>

          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={styles.lista}
            showsVerticalScrollIndicator={false}
          >
            {sucursales.map((s, i) => {
              const abierta = estaAbierta(s);
              return (
                <Pressable
                  key={s.id ?? `${s.nombre}-${i}`}
                  onPress={() => elegir(s)}
                  style={({ pressed }) => [
                    styles.fila,
                    { backgroundColor: fondoFila, borderColor: bordeSuave },
                    pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.nombre}${abierta === null ? '' : abierta ? ', abierta' : ', cerrada'}`}
                >
                  <View style={[styles.icono, { backgroundColor: COLORES.primario }]}>
                    <Ionicons name="storefront" size={18} color={COLORES.textoSobrePrimario} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nombre, { color: tema.texto }]} numberOfLines={1}>
                      {s.nombre}
                    </Text>
                    {s.direccion ? (
                      <Text style={[styles.direccion, { color: tema.textoSecundario }]} numberOfLines={2}>
                        {s.direccion}
                      </Text>
                    ) : null}
                  </View>

                  {abierta !== null && (
                    <View
                      style={[
                        styles.pildora,
                        { backgroundColor: (abierta ? COLORES.abierto : COLORES.cerrado) + '22' },
                      ]}
                    >
                      <View
                        style={[
                          styles.punto,
                          { backgroundColor: abierta ? COLORES.abierto : COLORES.cerrado },
                        ]}
                      />
                      <Text
                        style={[
                          styles.pildoraTexto,
                          { color: abierta ? COLORES.abierto : COLORES.cerrado },
                        ]}
                      >
                        {abierta ? 'Abierta' : 'Cerrada'}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={() => cerrar()}
            style={({ pressed }) => [
              styles.cancelar,
              { borderColor: bordeSuave },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
          >
            <Text style={[styles.cancelarTexto, { color: tema.texto }]}>Cancelar</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  abajo: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  hoja: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  rayita: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 12,
  },
  titulo: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 14,
  },
  lista: {
    gap: 10,
    paddingBottom: 4,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  icono: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombre: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  direccion: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  pildora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  punto: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  pildoraTexto: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },
  cancelar: {
    marginTop: 12,
    height: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelarTexto: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
});