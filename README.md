# Panel de Vida ☀️

**Panel de Vida** es una aplicación web personal de una sola página diseñada para centralizar tu agenda de Google Calendar, tu bandeja de Gmail clasificada por inteligencia artificial (Anthropic Claude), tus tareas prioritarias y tus herramientas conectadas. Además, incluye un sistema automatizado (Vercel Cron + Resend) que redacta y te envía un resumen ejecutivo a tu correo cada mañana antes de que empiece tu jornada.

---

## 🛠️ Stack Tecnológico

- **Framework Web:** [Next.js](https://nextjs.org/) (App Router, React 18, TypeScript)
- **Estilos y UI:** [Tailwind CSS](https://tailwindcss.com/) con componentes basados en el diseño minimalista de shadcn/ui (paleta neutra: blanco, grises y negro; compatible con modo claro y oscuro)
- **Base de Datos y Autenticación:** [Supabase](https://supabase.com/) (PostgreSQL con Row Level Security estricto y Supabase Auth con Google)
- **Integraciones:** Google Calendar API y Gmail API (solo lectura: `calendar.readonly` y `gmail.readonly`)
- **Inteligencia Artificial:** [Anthropic Claude](https://www.anthropic.com/) (`claude-sonnet-5-5`) para clasificación estructurada de correos, procesamiento de tareas en lenguaje natural y redacción ejecutiva (<90 segs) del resumen matutino.
- **Servicio de Correo:** [Resend](https://resend.com/) con plantilla HTML limpia y optimizada para dispositivos móviles.
- **Automatización Diaria:** Vercel Cron Jobs (`/api/cron/daily-brief`) protegido con `CRON_SECRET`.
- **Cifrado de Seguridad:** Tokens de actualización (`refresh_token`) cifrados en reposo en Supabase con **AES-256-GCM**.

---

## 📁 Estructura del Proyecto

```text
panel-de-vida/
├── .env.example                      # Plantilla de variables de entorno requeridas
├── vercel.json                       # Definición del Vercel Cron Job diario (12:45 UTC)
├── next.config.mjs                   # Configuración de Next.js
├── tailwind.config.ts                # Tokens de color neutros y diseño
├── supabase/
│   └── migrations/
│       └── 20261018000000_init_schema.sql  # Esquema de tablas y políticas RLS
├── src/
│   ├── middleware.ts                 # Control de acceso estricto (ALLOWED_USER_EMAIL)
│   ├── app/
│   │   ├── layout.tsx                # Proveedor de temas (next-themes) y metadatos
│   │   ├── page.tsx                  # Dashboard principal con las 6 secciones en orden
│   │   ├── globals.css               # Estilos globales y tokens neutros
│   │   ├── login/page.tsx            # Pantalla de inicio de sesión con Google
│   │   ├── access-denied/page.tsx    # Pantalla para usuarios no autorizados
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── callback/route.ts        # Callback de Supabase Auth
│   │       │   └── google/                  # Inicio y callback de OAuth Google
│   │       │       ├── route.ts
│   │       │       └── callback/route.ts
│   │       ├── calendar/events/route.ts     # Agenda, colisiones y tiempo disponible
│   │       ├── emails/sync/route.ts         # Lectura de correos 48h y clasificación Claude
│   │       ├── tasks/                       # CRUD de tareas y parser NLP
│   │       │   ├── route.ts
│   │       │   └── parse/route.ts
│   │       ├── integrations/status/route.ts # Estado de sincronización y reconexión
│   │       ├── cron/daily-brief/route.ts    # Endpoint cron diario asegurado
│   │       └── brief/send-now/route.ts      # Disparo manual "Enviar resumen ahora"
│   ├── components/
│   │   ├── layout/
│   │   │   ├── header.tsx            # Cabecera con fecha, tema, envío manual y logout
│   │   │   └── theme-toggle.tsx      # Selector de modo claro / oscuro
│   │   └── dashboard/
│   │       ├── hoy-en-una-linea.tsx  # Síntesis generada del día
│   │       ├── agenda-timeline.tsx   # Línea de tiempo vertical de 7 días
│   │       ├── correos-section.tsx   # Clasificación de correos con enlaces a Gmail
│   │       ├── tareas-section.tsx    # Grupos (hoy, vencidas, próximos 3 días)
│   │       ├── quick-task-input.tsx  # Entrada en una línea con lenguaje natural
│   │       ├── alertas-cruzadas.tsx  # Cruce de fuentes y detección de anomalías
│   │       └── estado-conexiones.tsx # Estado de proveedores y botón reconectar
│   └── lib/
│       ├── supabase/                 # Clientes browser, server y admin
│       ├── google/                   # Clientes OAuth2 con auto-refresh, Calendar y Gmail
│       ├── anthropic/                # Clasificador de correos, parser y redactor del brief
│       ├── resend/                   # Cliente y plantilla HTML del correo matutino
│       ├── security/crypto.ts        # Cifrado/descifrado AES-256-GCM
│       └── cross-analysis.ts         # Lógica central del cruce de datos
```

---

## 🔐 Configuración de Servicios (Paso a Paso)

### 1. Configuración en Supabase
1. Ingresa a tu panel en [Supabase](https://supabase.com) y crea un nuevo proyecto (o usa uno existente).
2. Ve a **SQL Editor**, copia el contenido del archivo `supabase/migrations/20261018000000_init_schema.sql` y ejecútalo. Esto creará las 4 tablas (`tasks`, `email_classifications`, `daily_briefs`, `integrations`) con sus políticas RLS.
3. Ve a **Project Settings > API**:
   - Copia la **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`).
   - Copia la clave `anon` `public` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
   - Copia la clave `service_role` `secret` (`SUPABASE_SERVICE_ROLE_KEY`).
4. Ve a **Authentication > Providers > Google**:
   - Habilita el proveedor Google (lo enlazarás con las credenciales del paso 2).
   - Copia el **Callback URL** que te muestra Supabase (`https://<tu-proyecto>.supabase.co/auth/v1/callback`).

---

### 2. Configuración en Google Cloud Console
> ⚠️ **¿Por qué la app debe estar en modo "Testing"?**
> Los permisos `gmail.readonly` y `calendar.readonly` son considerados scopes sensibles/restringidos por Google. Para usarlos en producción pública, Google exige un proceso formal de auditoría y verificación de seguridad que tarda semanas y requiere una empresa registrada. 
> Al dejar la pantalla de consentimiento OAuth en **Testing** (Prueba) y agregar tu correo personal como **Test User (Usuario de prueba)**, Google te permite otorgar acceso total e inmediato a tus propios datos sin necesidad de verificación externa.

1. Ingresa a [Google Cloud Console](https://console.cloud.google.com/) y crea un proyecto (ej. `Panel de Vida`).
2. En **APIs y Servicios > Biblioteca**, busca y habilita:
   - **Google Calendar API**
   - **Gmail API**
3. En **APIs y Servicios > Pantalla de consentimiento de OAuth**:
   - Tipo de usuario: **Externo** (External).
   - Estado de publicación: Mantener en **Testing** (Modo de prueba).
   - En **Test Users (Usuarios de prueba)**: Agrega obligatoriamente tu dirección de correo electrónico (`ALLOWED_USER_EMAIL`).
4. En **APIs y Servicios > Credenciales**:
   - Clic en **Crear credenciales > ID de cliente de OAuth**.
   - Tipo de aplicación: **Aplicación web**.
   - Nombre: `Panel de Vida Web`.
   - **URI de redireccionamiento autorizados**: Agrega las siguientes URLs:
     - `http://localhost:3000/api/auth/callback` (Para login Supabase local)
     - `http://localhost:3000/api/auth/google/callback` (Para sincronización de Calendar/Gmail local)
     - `https://<tu-proyecto>.supabase.co/auth/v1/callback` (Callback de Supabase)
     - `https://<tu-app>.vercel.app/api/auth/callback` (Producción Vercel)
     - `https://<tu-app>.vercel.app/api/auth/google/callback` (Producción Vercel)
   - Copia el **Client ID** (`GOOGLE_CLIENT_ID`) y el **Client Secret** (`GOOGLE_CLIENT_SECRET`).
5. En Supabase: Pega el Client ID y Client Secret en **Authentication > Providers > Google**.

---

### 3. Configuración en Resend y Anthropic
- **Anthropic:** Obtén una clave de API en [Anthropic Console](https://console.anthropic.com/) (`ANTHROPIC_API_KEY`).
- **Resend:** Crea una cuenta en [Resend](https://resend.com/) y genera una API Key (`RESEND_API_KEY`). Si estás usando el dominio de prueba de Resend, el remitente por defecto será `onboarding@resend.dev` y enviará correos exclusivamente al correo con el que te registraste en Resend.

---

## 🔑 Variables de Entorno

Crea un archivo `.env.local` para desarrollo local y carga estas mismas variables en el panel de **Vercel** (`Settings > Environment Variables`):

| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | URL pública de la aplicación | `http://localhost:3000` o `https://tu-app.vercel.app` |
| `ALLOWED_USER_EMAIL` | Tu único correo personal autorizado | `tu_correo@gmail.com` |
| `USER_TIMEZONE` | Tu zona horaria para cálculos de agenda | `America/Mexico_City` |
| `PRIORITY_SENDERS` | Remitentes prioritarios (separados por coma) | `jefe@empresa.com,socio@empresa.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase | `https://xyzcompany.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave anónima pública de Supabase | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave Service Role de Supabase | `eyJhbGciOi...` |
| `GOOGLE_CLIENT_ID` | Client ID de Google Cloud | `123456...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Client Secret de Google Cloud | `GOCSPX-abc...` |
| `ENCRYPTION_KEY` | Clave AES-256 de 32 bytes (64 caracteres hex) | `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | API Key de Anthropic Claude | `sk-ant-api03-...` |
| `ANTHROPIC_MODEL` | Modelo de Claude | `claude-sonnet-5-5` |
| `RESEND_API_KEY` | API Key de Resend | `re_123456...` |
| `RESEND_FROM_EMAIL` | Remitente de correo | `onboarding@resend.dev` |
| `CRON_SECRET` | Token secreto para asegurar el Cron Job | `openssl rand -hex 16` |

> 💡 **Para generar tu `ENCRYPTION_KEY` y `CRON_SECRET`:**
> Ejecuta en tu terminal:
> ```bash
> openssl rand -hex 32 # para ENCRYPTION_KEY (64 caracteres hex)
> openssl rand -hex 16 # para CRON_SECRET
> ```

---

## 💻 Instalación y Ejecución Local

1. Clona el repositorio e instala las dependencias:
   ```bash
   npm install
   ```

2. Configura tu archivo `.env.local` con las credenciales descritas arriba.

3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

4. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.
   - Inicia sesión con tu cuenta de Google. Si inicias con un correo diferente al de `ALLOWED_USER_EMAIL`, el middleware te redirigirá a la pantalla de **Acceso Denegado**.
   - Haz clic en **Conectar Google Calendar & Gmail** para autorizar la lectura de eventos y correos.
   - Prueba la creación rápida de tareas con lenguaje natural (ej. *"entregar reporte trimestral el viernes urgente"*).
   - Haz clic en el botón superior **"Enviar resumen ahora"** para recibir tu primer brief matutino en tu correo.

---

## 🚀 Despliegue en Vercel

1. Sube tu código a un repositorio en **GitHub**.
2. Entra a [Vercel](https://vercel.com) y selecciona **Add New > Project**.
3. Importa tu repositorio de GitHub.
4. En la sección **Environment Variables**, añade todas las variables listadas en la tabla anterior.
5. Haz clic en **Deploy**.
6. En Vercel, el archivo `vercel.json` registrará automáticamente el Cron Job en:
   - **Ruta:** `/api/cron/daily-brief`
   - **Frecuencia:** `45 12 * * *` (12:45 UTC = 6:45 AM en zona horaria America/Mexico_City).
7. Agrega la URL final de Vercel (`https://tu-app.vercel.app/api/auth/google/callback` y `https://tu-app.vercel.app/api/auth/callback`) a las URLs autorizadas en tu Google Cloud Console.
