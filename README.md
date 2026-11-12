# EcoNekoApp

App móvil de **EcoNeko** (gestor financiero con asistente IA), migrada desde la versión web en React + Vite.

- **Expo SDK 58** (React Native 0.88) + **expo-router** (navegación por archivos)
- **NativeWind v4** (Tailwind CSS en React Native; usa Tailwind v3)
- TypeScript

## Cómo correrla

1. Instala dependencias y alinea las versiones con el SDK de Expo:

   ```bash
   npm install
   npx expo install --fix
   ```

   > Las dependencias de Expo están con `"*"` en `package.json` a propósito: `expo install --fix`
   > las fija en las versiones exactas compatibles con SDK 58. Haz commit del `package.json` y el
   > `package-lock.json` resultantes.

2. Crea el archivo `.env` a partir del ejemplo y pon la URL de la API:

   ```bash
   cp .env.example .env
   ```

   `localhost` **no funciona** desde el celular: usa la IP de tu PC en la red local
   (ej. `http://192.168.1.20:5000/api`) o la URL publicada en Azure.

3. Inicia el servidor de desarrollo y escanea el QR con **Expo Go**:

   ```bash
   npx expo start
   ```

## Estructura

```
app/                      Rutas (expo-router)
  _layout.tsx             Providers + Stack raíz
  index.tsx               Redirige a /login o /dashboard según la sesión
  verify-email.tsx        Accesible con o sin sesión
  (auth)/                 Solo sin sesión (equivale a <GuestRoute />)
    login, register, forgot-password, reset-password
  (app)/                  Solo con sesión (equivale a <ProtectedRoute />), con barra de pestañas
    dashboard, ingresos, egresos, tarjetas, asistente
src/
  screens/                Pantallas (equivalen a src/pages de la web)
  components/
    ui/                   Kit base: Screen, ModalSheet, Select, DateField, Checkbox, botones...
    auth/ dashboard/ expenses/ cards/ chat/
  context/ hooks/ lib/ services/ types/   Lógica compartida (casi igual a la web)
```

## Diferencias con la versión web

| Web | Móvil |
|---|---|
| `react-router-dom` + navbar `AppLayout` | `expo-router` (pestañas para Inicio, Ingresos, Egresos, Tarjetas y NekoAI) |
| `localStorage` / `sessionStorage` | `AsyncStorage` (usuario), `expo-secure-store` (token), memoria (correo pendiente) |
| Cookie `econeko_auth` | Se mantiene la cookie y, si `/auth/login` devuelve `token`, también se envía como `Authorization: Bearer` |
| `<select>`, `<input type="date">`, checkbox | `Select`, `DateField` y `Checkbox` en `src/components/ui/form.tsx` |
| `window.confirm` / `alert` | `Alert.alert` (helper `confirm()` en `src/components/ui/feedback.tsx`) |
| `<input type="file">` (estado de cuenta) | `expo-document-picker` |
| `navigator.clipboard` | `expo-clipboard` |
| `bg-gradient-to-*` | `expo-linear-gradient` (componente `Gradient`) |
| `VITE_API_ECONEKOAPI_BASE_URL` | `EXPO_PUBLIC_API_ECONEKOAPI_BASE_URL` |

La landing page quedó solo en la web: la app parte en el login.

El registro de qué versión de la web está migrada está en [`MIGRATION.md`](MIGRATION.md).
