import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

// Reemplazo de ImageBackground con caché, fundido al cargar y fondo mientras carga
export default function ImagenFondo({ source, style, imageStyle, children, ...rest }) {
  return (
    <View style={[styles.contenedor, style]} {...rest}>
      <Image
        source={source}
        style={[StyleSheet.absoluteFill, imageStyle]}
        contentFit="cover"
        transition={300}
        cachePolicy="memory-disk"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    overflow: 'hidden',
    backgroundColor: 'rgba(128,128,128,0.18)', // se ve mientras carga la foto
  },
});