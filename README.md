# App Pizzeto's

App móvil informativa de **Pizzeto's** ("La pizza de tu vida"), hecha con React Native, Expo y Supabase.
Muestra el menú, los paquetes y la sucursal. Los pedidos se hacen por teléfono, WhatsApp o en sucursal.

## Qué necesitas tener instalado

- [Node.js](https://nodejs.org) (versión LTS)
- [Git](https://git-scm.com)
- La app **Expo Go** en tu celular (App Store o Google Play)

## Cómo instalar el proyecto (primera vez)

1. Descarga el proyecto:

   ```
   git clone https://github.com/Joss-lg/App-Pizzetos_React.git
   cd App-Pizzetos_React
   ```

2. Instala todos los paquetes (ya vienen listados en `package.json`):

   ```
   npm install
   ```

3. Crea el archivo `.env` en la carpeta principal del proyecto con las llaves de Supabase.
   **Este archivo no está en GitHub** por seguridad: pídeselo a quien administra el proyecto.

   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   ```

4. Arranca la app:

   ```
   npx expo start -c
   ```

5. Escanea el código QR con la cámara (iPhone) o con Expo Go (Android).

## Cada vez que bajes cambios de GitHub

```
git pull origin main
npm install
npx expo start -c
```

`npm install` hace falta cuando se agregaron paquetes nuevos. Si no hubo, no pasa nada por correrlo.

## Antes de subir tus cambios

```
git pull origin main
git add .
git commit -m "Describe aquí tu cambio"
git push origin main
```

## Cosas importantes

- **No corras `npm audit fix --force`.** Los avisos de "vulnerabilities" al instalar son normales en Expo; ese comando rompe la app.
- Para instalar un paquete nuevo usa `npx expo install nombre-del-paquete` (no `npm install`), así se instala la versión compatible con Expo.
- **Notificaciones:** en iPhone funcionan con Expo Go. En **Android con Expo Go no hay notificaciones** (Expo las quitó desde el SDK 53); la app funciona normal, solo sin ellas. En la app final (build con EAS) funcionan en los dos.
- **Contenido:** la app solo muestra lo que aparece en https://pizzetos.com.mx. Los productos, precios y fotos se editan en Supabase.
- Si la app "no se actualiza": cierra la terminal con `Ctrl + C`, corre `npx expo start -c`, cierra Expo Go por completo y vuelve a escanear el QR.