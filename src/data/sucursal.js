// src/data/sucursal.js
// Respaldo local de la sucursal: se usa solo si todavía no hay datos de Supabase
// (por ejemplo, la primera vez que se abre la app sin internet).
// La lista real de sucursales siempre viene de Supabase (tabla "sucursales").
//
// PENDIENTE: rellenar con los datos de la sucursal principal de Charly Pizza
// cuando los tengamos (dirección, teléfono, WhatsApp, horario y fotos).
// Mientras tanto se deja sin teléfono para no mostrar un número equivocado.

import { MARCA } from '../config/marca';

export const sucursal = {
  id: 0,
  nombre: MARCA.nombre,
  direccion: '',
  telefono: '', // 10 dígitos, ej. '5512345678'
  telefonoFormato: '', // ej. '55 1234 5678'
  whatsapp: '', // 52 + 10 dígitos, ej. '525512345678' (52 = lada de México)
  horario: { apertura: 11, cierre: 22 }, // formato 24 hrs
  horarioTexto: '11:00 AM – 10:00 PM',
  mapaUrl: '', // enlace de Google Maps de la sucursal
  imagen: null,
  // Fotos del carrusel de la pantalla Sucursales
  imagenes: [],
};