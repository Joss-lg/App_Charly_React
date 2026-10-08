import 'react-native-url-polyfill/auto';
import { PostgrestClient } from '@supabase/postgrest-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const clave = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Si faltan las llaves, la app sigue funcionando con los datos locales
export const supabaseConfigurado = Boolean(url && clave);

// Encabezados que pide Supabase. Las claves viejas (anon, empiezan con "eyJ")
// también van en Authorization; las nuevas (sb_publishable_...) solo en apikey.
const encabezados = { apikey: clave };
if (clave?.startsWith('eyJ')) {
  encabezados.Authorization = `Bearer ${clave}`;
}

// Cliente de solo lectura para las tablas (sin login, tiempo real ni storage).
// Se usa igual que el cliente completo: supabase.from('tabla').select('*')
export const supabase = supabaseConfigurado
  ? new PostgrestClient(`${url}/rest/v1`, { headers: encabezados })
  : null;