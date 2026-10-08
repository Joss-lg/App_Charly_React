// src/data/paquetes.js
// Paquetes que SOLO se muestran en la pestaña Promos (y en la alerta al abrir la app).
// En el Inicio no aparecen: ni en "Todos", ni en la búsqueda, ni en Favoritos.
//
// Ya no son ids fijos: en Supabase, la tabla "productos" tiene la columna
// "solo_promos" (sí / no). Para mandar un producto a Promos, solo se marca
// esa casilla en Supabase; no hay que tocar el código.

// ¿Este producto es uno de los paquetes que solo van en Promos?
export function esPaqueteDePromos(producto) {
  return Boolean(producto?.soloPromos ?? producto?.solo_promos);
}