// src/components/ElegirSucursal.js
// Ventanita que sube desde abajo para elegir sucursal antes de escribir por
// WhatsApp o llamar (cuando la pizzería tiene varias sucursales).
// - Muestra nombre, dirección y si está abierta o cerrada.
// - No usa la alerta del teléfono porque en Android solo permite 3 botones.
// También exporta estaAbierta(sucursal) para usarla en otras pantallas.

import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../context/ThemeContext';
import { COLORES } from '../config/marca';

// ¿La sucursal está abierta ahorita? Regresa true, false o null si no tiene horario
export function estaAbierta(sucursal) {
  const abre = Number(sucursal?.horario?.apertura);
  const cierra = Number(sucursal?.horario?.cierre);
  if (isNaN(abre) || isNaN(cierra)) return null;
  const ahora = new Date();
  const minutos = ahora.getHours() * 60 + ahora.getMinutes();
  return minutos >= abre * 60 && minutos < cierra * 60;
}

export default function ElegirSucursal({ visible, sucursales = [], titulo, onElegir, onCerrar }) {
  const { tema, modoOscuro } = useTema();
  const insets = useSafeAreaInsets();
  const bordeSuave = modoOscuro ? '#333333' : '#EEEEEE';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCerrar}>
      {/* Fondo oscuro: tocarlo cierra */}
      <Pressable style={styles.fondo} onPress={onCerrar} accessibilityLabel="Cerrar" />

      <View
        style={[
          styles.hoja,
          { backgroundColor: tema.card, paddingBottom: Math.max(insets.bottom, 12) + 8 },
        ]}
      >
        <View style={[styles.agarradera, { backgroundColor: bordeSuave }]} />

        <Text style={[styles.titulo, { color: tema.texto }]}>{titulo ?? '¿A qué sucursal?'}</Text>
        <Text style={[styles.subtitulo, { color: tema.textoSecundario }]}>
          Elige la sucursal más cercana a ti.
        </Text>

        <ScrollView style={styles.lista} showsVerticalScrollIndicator={false}>
          {sucursales.map((s, i) => {
            const abierta = estaAbierta(s);
            return (
              <Pressable
                key={s.id ?? s.nombre ?? i}
                onPress={() => onElegir?.(s)}
                style={({ pressed }) => [
                  styles.fila,
                  i > 0 && { borderTopWidth: 1, borderTopColor: bordeSuave },
                  pressed && { opacity: 0.6 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${s.nombre}${abierta === null ? '' : abierta ? ', abierta' : ', cerrada'}`}
              >
                <View style={styles.icono}>
                  <Ionicons name="storefront-outline" size={20} color={COLORES.primario} />
                </View>

                <View style={styles.textos}>
                  <Text style={[styles.nombre, { color: tema.texto }]} numberOfLines={1}>
                    {s.nombre}
                  </Text>
                  {!!s.direccion && (
                    <Text style={[styles.direccion, { color: tema.textoSecundario }]} numberOfLines={1}>
                      {s.direccion}
                    </Text>
                  )}
                </View>

                {abierta !== null && (
                  <View
                    style={[
                      styles.estado,
                      { backgroundColor: abierta ? 'rgba(39,174,96,0.14)' : 'rgba(192,57,43,0.14)' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.estadoTexto,
                        { color: abierta ? COLORES.abierto : COLORES.cerrado },
                      ]}
                    >
                      {abierta ? 'Abierta' : 'Cerrada'}
                    </Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color={tema.textoSoloInfo} />
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          onPress={onCerrar}
          style={({ pressed }) => [
            styles.cancelar,
            { borderColor: bordeSuave },
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.cancelarTexto, { color: tema.texto }]}>Cancelar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  hoja: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  agarradera: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 14,
  },
  titulo: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
  subtitulo: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 2, marginBottom: 8 },
  lista: { flexGrow: 0 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  icono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(227,30,36,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1 },
  nombre: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  direccion: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 1 },
  estado: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  estadoTexto: { fontFamily: 'Poppins_700Bold', fontSize: 10 },
  cancelar: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  cancelarTexto: { fontFamily: 'Poppins_700Bold', fontSize: 14 },
});