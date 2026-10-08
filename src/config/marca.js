// src/config/marca.js
// Todo lo que identifica a la pizzería en un solo lugar.
// Para hacer la app de otra pizzería, se cambia este archivo (y los logos en /assets).

export const MARCA = {
  // Nombres
  nombre: 'Charly Pizza', // nombre normal (textos y mensajes)
  nombreMayusculas: 'CHARLY PIZZA', // encabezado del Inicio
  lema: 'DELICIOSAMENTE DIVERTIDA', // debajo del nombre en el Inicio
  lemaCorto: 'Para antojos reales', // frases secundarias

  // Prefijo para lo que se guarda en el teléfono (favoritos, avisos leídos, etc.)
  // Así no se mezcla con Pizzeto's si alguien tiene las dos apps.
  prefijoGuardado: 'charlypizza',

  // Saludo al abrir WhatsApp
  saludoWhatsApp: '¡Hola Charly Pizza!',
};

// Colores de la marca
export const COLORES = {
  primario: '#E31E24', // rojo de Charly Pizza (botones, precios, líneas)
  primarioOscuro: '#B3161B', // para degradados y modo claro
  primarioClaro: '#FF5A5F', // para degradados y modo oscuro
  textoSobrePrimario: '#FFFFFF', // texto encima del rojo (blanco se lee mejor)
  negro: '#1A1A1A',

  // Colores que no son de la marca y se quedan igual
  whatsapp: '#25D366',
  llamar: '#27AE60',
  abierto: '#27AE60',
  cerrado: '#C0392B',
};