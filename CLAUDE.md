# CLAUDE.md — Sistema de Techumbre Automatizada Inteligente

## Contexto del Proyecto

Aplicación web fullstack para controlar y monitorear una techumbre automatizada en la Facultad de Ingeniería Mochis (Universidad Autónoma de Sinaloa). La techumbre se abre/cierra mediante servomotores controlados por un ESP32 que lee sensores ambientales (temperatura, humedad, lluvia, UV) y un lector RFID para presencia de alumnos. Los alumnos pueden votar democráticamente para abrir o cerrar el techo si hay quórum.

**Uso:** Demostración temporal para presentación de proyecto universitario. No requiere seguridad extrema pero sí autenticación funcional.

**Acceso:** Debe ser accesible desde cualquier red (internet público) con dominio personalizado.

---

## Stack Tecnológico

### Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** Express.js
- **Base de datos:** PostgreSQL (usar Prisma ORM)
- **Tiempo real:** Socket.IO (comunicación bidireccional con ESP32 y frontend)
- **Autenticación:** JWT (jsonwebtoken) con bcrypt para hashing de contraseñas
- **Validación:** zod
- **Scheduler:** node-cron (horarios programados de apertura/cierre)

### Frontend
- **Framework:** React 18+ con Vite
- **Estilos:** Tailwind CSS
- **Gráficas:** Recharts (para históricos de sensores)
- **Tiempo real:** socket.io-client
- **HTTP:** axios
- **Routing:** react-router-dom v6
- **Iconos:** lucide-react

### Despliegue
- **Backend + DB:** Railway o Render (PostgreSQL incluido)
- **Frontend:** Vercel o Netlify
- **Dominio:** Configurar dominio personalizado en el servicio elegido

---

## Estructura del Proyecto (Monorepo)

```
techumbre-iot/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   │   └── index.js          # Variables de entorno
│   │   ├── middlewares/
│   │   │   ├── auth.js            # Verificar JWT y roles
│   │   │   └── validate.js        # Validación con zod
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── telemetry.js
│   │   │   ├── presence.js
│   │   │   ├── voting.js
│   │   │   ├── control.js
│   │   │   └── students.js
│   │   ├── services/
│   │   │   ├── votingService.js   # Lógica de quórum y conteo
│   │   │   ├── schedulerService.js # Cron jobs de horarios
│   │   │   └── telemetryService.js
│   │   ├── socket/
│   │   │   └── index.js           # Configuración Socket.IO y canales
│   │   └── index.js               # Entry point: Express + Socket.IO
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/             # Componentes del dashboard admin
│   │   │   ├── student/           # Componentes del portal alumno
│   │   │   └── shared/            # Navbar, ProtectedRoute, etc.
│   │   ├── hooks/
│   │   │   ├── useSocket.js
│   │   │   └── useAuth.js
│   │   ├── services/
│   │   │   ├── api.js             # Instancia axios
│   │   │   └── socket.js          # Instancia socket.io-client
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   └── StudentPortal.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## Base de Datos — Schema Prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  STUDENT
  ADMIN
}

enum RoofState {
  OPEN
  CLOSED
  MOVING
}

enum VoteOption {
  OPEN
  CLOSE
}

enum SessionStatus {
  ACTIVE
  CLOSED
  EXPIRED
}

enum SessionResult {
  OPEN
  CLOSE
  NO_QUORUM
  TIE
}

enum OverrideAction {
  FORCE_OPEN
  FORCE_CLOSE
  RELEASE
}

model User {
  id           Int            @id @default(autoincrement())
  matricula    String         @unique
  name         String
  career       String         @default("Ingeniería en Software")
  rfidUid      String?        @unique @map("rfid_uid")
  passwordHash String         @map("password_hash")
  role         Role           @default(STUDENT)
  createdAt    DateTime       @default(now()) @map("created_at")
  presenceLogs PresenceLog[]
  votes        Vote[]

  @@map("users")
}

model PresenceLog {
  id       Int       @id @default(autoincrement())
  userId   Int       @map("user_id")
  rfidUid  String    @map("rfid_uid")
  checkIn  DateTime  @default(now()) @map("check_in")
  checkOut DateTime? @map("check_out")
  active   Boolean   @default(true)
  user     User      @relation(fields: [userId], references: [id])

  @@map("presence_logs")
}

model Telemetry {
  id          Int       @id @default(autoincrement())
  temperature Float
  humidity    Float
  rain        Boolean
  rainAnalog  Int       @default(0) @map("rain_analog")
  uvIndex     Float     @map("uv_index")
  roofState   RoofState @default(CLOSED) @map("roof_state")
  createdAt   DateTime  @default(now()) @map("created_at")

  @@map("telemetry")
}

model VotingSession {
  id           Int            @id @default(autoincrement())
  status       SessionStatus  @default(ACTIVE)
  result       SessionResult?
  totalPresent Int            @default(0) @map("total_present")
  totalVotes   Int            @default(0) @map("total_votes")
  quorumNeeded Int            @default(0) @map("quorum_needed")
  startedAt    DateTime       @default(now()) @map("started_at")
  closedAt     DateTime?      @map("closed_at")
  votes        Vote[]

  @@map("voting_sessions")
}

model Vote {
  id        Int          @id @default(autoincrement())
  userId    Int          @map("user_id")
  sessionId Int          @map("session_id")
  vote      VoteOption
  createdAt DateTime     @default(now()) @map("created_at")
  user      User         @relation(fields: [userId], references: [id])
  session   VotingSession @relation(fields: [sessionId], references: [id])

  @@unique([userId, sessionId])
  @@map("votes")
}

model Override {
  id         Int             @id @default(autoincrement())
  adminId    Int             @map("admin_id")
  action     OverrideAction
  reason     String?
  active     Boolean         @default(true)
  createdAt  DateTime        @default(now()) @map("created_at")
  releasedAt DateTime?       @map("released_at")

  @@map("overrides")
}

model Schedule {
  id        Int      @id @default(autoincrement())
  dayOfWeek Int[]    @map("day_of_week")
  action    VoteOption
  time      String
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")

  @@map("schedules")
}

model SystemState {
  id                Int       @id @default(1)
  roofState         RoofState @default(CLOSED) @map("roof_state")
  activePriority    Int       @default(4) @map("active_priority")
  emergencyLock     Boolean   @default(false) @map("emergency_lock")
  rainAutoMode      Boolean   @default(true) @map("rain_auto_mode")
  lastEsp32Ping     DateTime? @map("last_esp32_ping")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  @@map("system_state")
}
```

---

## API Endpoints

### Autenticación
```
POST /api/auth/register        # Body: { matricula, name, password, career? }
POST /api/auth/login           # Body: { matricula, password } → { token, user }
POST /api/auth/admin/login     # Body: { matricula, password } → { token, user } (verifica role=ADMIN)
GET  /api/auth/me               # Header: Authorization Bearer → { user }
```

### Telemetría (ESP32 → Servidor → Frontend)
```
POST /api/telemetry             # Body: { temperature, humidity, rain, rainAnalog, uvIndex, roofState }
                                # Sin auth (viene del ESP32, validar por API key simple en header)
GET  /api/telemetry/current     # Última lectura
GET  /api/telemetry/history     # Query: ?hours=2 (default 2h) → array de lecturas para gráficas
```

### Presencia (RFID)
```
POST /api/presence/checkin      # Body: { rfidUid } — ESP32 envía UID, servidor busca usuario
POST /api/presence/checkout     # Body: { rfidUid }
GET  /api/presence/active       # Lista de alumnos presentes ahora → [{ id, name, matricula, checkIn }]
GET  /api/presence/count        # → { total: N }
```

### Votación
```
POST /api/voting/session/start  # Solo admin. Calcula quórum con presentes actuales.
POST /api/voting/vote           # Auth student. Body: { vote: "OPEN"|"CLOSE" }. Verifica presencia.
GET  /api/voting/session/current # Sesión activa: votos OPEN, CLOSE, total, quórum, estado
POST /api/voting/session/close  # Solo admin o por timeout. Calcula resultado.
```

### Control (Admin)
```
POST /api/control/override      # Body: { action: "FORCE_OPEN"|"FORCE_CLOSE"|"RELEASE", reason? }
GET  /api/control/status        # Estado completo del sistema: roof, prioridad activa, emergency, etc.
POST /api/control/rain-auto     # Body: { enabled: boolean } — Toggle modo lluvia automático
```

### Horarios (Admin)
```
GET    /api/schedules            # Lista de horarios
POST   /api/schedules            # Body: { dayOfWeek: [0-6], action, time }
PUT    /api/schedules/:id        # Editar horario
DELETE /api/schedules/:id        # Eliminar horario
PATCH  /api/schedules/:id/toggle # Activar/desactivar
```

### Alumnos (Admin)
```
GET    /api/students             # Lista paginada. Query: ?search=
POST   /api/students             # Crear alumno (admin registra con RFID)
PUT    /api/students/:id         # Editar
DELETE /api/students/:id         # Eliminar
POST   /api/students/:id/rfid   # Body: { rfidUid } — Vincular tarjeta RFID a alumno
```

---

## Socket.IO — Canales y Eventos

```javascript
// SERVIDOR → CLIENTES
"sensors:live"        // Cada 5s. Data: { temperature, humidity, rain, uvIndex, roofState }
"presence:change"     // Cuando alguien entra/sale. Data: { action, student, totalPresent }
"vote:update"         // Cuando se emite un voto. Data: { votesOpen, votesClose, totalVotes, quorum }
"session:started"     // Nueva sesión. Data: { sessionId, totalPresent, quorumNeeded }
"session:result"      // Sesión cerrada. Data: { result, votesOpen, votesClose }
"system:status"       // Cambio de estado. Data: { roofState, priority, emergencyLock }
"roof:moving"         // Techo en transición. Data: { targetState }
"esp32:connected"     // ESP32 se conecta/desconecta. Data: { connected }

// ESP32 → SERVIDOR
"telemetry:update"    // Data: { temperature, humidity, rain, rainAnalog, uvIndex, roofState }
"rfid:scan"           // Data: { uid }
"status:ack"          // Confirmación de comando ejecutado. Data: { command, success }

// SERVIDOR → ESP32
"roof:command"        // Data: { command: "SET_ROOF", state: "OPEN"|"CLOSED", source, priority }
```

---

## Lógica de Prioridades (implementar en backend)

```
Prioridad 1 (MÁXIMA) — Emergencia Climática:
  Si rain == true O uvIndex >= 8 → CERRAR obligatoriamente.
  Activar emergencyLock = true.
  Solo se desactiva cuando sensores vuelven a normal por 60 segundos.
  Mientras esté activo, ignorar TODA acción manual, scheduler y votación.

Prioridad 2 — Override Manual (Admin):
  El admin fuerza ABRIR o CERRAR desde el dashboard.
  Se mantiene hasta que el admin haga RELEASE.
  Solo la Prioridad 1 puede anularlo.

Prioridad 3 — Scheduler (Horarios Programados):
  Abrir o cerrar automáticamente a una hora definida.
  Se ejecuta solo si no hay Prioridad 1 ni 2 activas.

Prioridad 4 (MÍNIMA) — Votación Estudiantil:
  Se ejecuta solo si hay quórum (>= 30% de presentes votaron)
  y más del 50% votó en una dirección.
  Solo funciona si no hay prioridades superiores activas.
```

---

## Lógica de Quórum y Votación

```
Al abrir sesión:
  N = alumnos con presencia activa (RFID marcado)
  quórum_mínimo = ceil(0.30 * N)
  Timeout de sesión: 10 minutos

Al votar:
  Verificar: JWT válido + presencia activa + no ha votado en esta sesión
  Si falla cualquiera → rechazar con mensaje específico

Al cerrar sesión (timeout o admin):
  Si total_votos < quórum → resultado = NO_QUORUM, no hacer nada
  Si votos_OPEN > votos_CLOSE → resultado = OPEN
  Si votos_CLOSE > votos_OPEN → resultado = CLOSE
  Si empate → resultado = TIE, mantener estado actual
  Si resultado válido y no hay prioridad superior → enviar comando al ESP32
```

---

## Diseño UI — Especificaciones por Módulo

### Paleta de Colores
```css
/* Colores institucionales UAS */
--azul-primario: #1565C0;     /* Header admin, botones principales */
--azul-oscuro: #0D1B2A;       /* Sidebar admin */
--verde-exito: #2E7D32;       /* Estado abierto, presencia confirmada */
--amarillo-alerta: #F9A825;   /* Estado cerrado, advertencias */
--rojo-emergencia: #C62828;   /* Emergencia, errores */
--gris-fondo: #F5F5F5;        /* Fondo general */
--blanco: #FFFFFF;            /* Tarjetas */
```

### Tipografía
Usar Google Fonts. Sugerencia basada en los mockups:
- **Títulos:** "Plus Jakarta Sans" o "DM Sans" (bold, moderna, limpia)
- **Cuerpo:** "Inter" o la misma en weight regular
- **Datos numéricos grandes (sensores):** Weight bold, tamaño 2rem+

---

### MÓDULO LOGIN (`/login`)

Referencia: mockup "Modulo Login"

- Fondo con gradiente sutil azul oscuro a azul medio
- Tarjeta centrada con fondo blanco, bordes redondeados, sombra suave
- Logo de la universidad centrado arriba (usar un placeholder circular con las iniciales "UAS" o un SVG genérico de escudo universitario)
- Título: "Acceso a Control de Ambiente"
- Subtítulo: "Facultad de Ingeniería Mochis"
- Campo: "Matrícula Universitaria" (placeholder: "Ej: 21030456")
- Campo: "Contraseña" (type password)
- Botón "Ingresar" — azul primario, ancho completo, bordes redondeados
- Link abajo: "Acceso Administrativo" — abre modal o redirige a `/admin/login`
- Footer: "© 2025 Universidad Autónoma de Sinaloa. Todos los derechos reservados."
- Responsive: en móvil la tarjeta ocupa ~95% del ancho

---

### MÓDULO ADMINISTRACIÓN (`/admin`)

Referencia: mockup "Modulo Administración"

**Layout:**
- Sidebar izquierdo fijo (colapsable en móvil a hamburger menu):
  - Logo UAS + "Universidad Autónoma de Sinaloa"
  - Logo Facultad + "Facultad de Ingeniería Mochis"
  - Navegación: Dashboard, Analíticas, Programación, Configuración
  - Footer sidebar: "Sistema de Techumbre v1.0"
- Header superior: "Panel de Control de Infraestructura" + nombre del admin + botón Salir
- Contenido principal con scroll

**Sección 1 — Estado y Sensores (fila superior):**
- Tarjeta grande izquierda: ESTADO DEL TECHO
  - Círculo animado con icono de techo (abierto o cerrado)
  - Texto grande: "ABIERTO" (verde) o "CERRADO" (amarillo/naranja)
  - Badge: "Modo: AUTOMÁTICO" / "OVERRIDE" / "EMERGENCIA"
- 4 tarjetas de sensores en fila:
  - Temperatura: icono termómetro, valor grande con °C, subtexto "Última lectura: ahora"
  - Humedad: icono gota, valor con %, barra de progreso visual
  - Prob. Lluvia: icono nube, porcentaje, fondo amarillo si >50%
  - Índice UV: icono sol, valor numérico, texto "Alto"/"Bajo"/"Extremo" según rango
- Todos actualizados en tiempo real por WebSocket cada 5 segundos

**Sección 2 — Control Manual + Programación:**
- Panel izquierdo: CONTROL MANUAL
  - Botón "FORZAR APERTURA" — verde con icono de unlock
  - Botón "FORZAR CIERRE" — amarillo/naranja con icono de lock
  - Toggle switch: "Modo Lluvia Automático" con descripción "Cierra automáticamente si detecta lluvia"
  - Si emergencia activa: mostrar banner rojo "EMERGENCIA CLIMÁTICA ACTIVA" y deshabilitar botones
- Panel derecho: PROGRAMACIÓN DE HORARIOS
  - Formulario inline: dropdown (Abrir/Cerrar) + inputs hora:minuto + botón "+"
  - Lista de horarios activos: cada uno con descripción, días, y botón eliminar (icono basura rojo)
  - Ejemplos: "CERRAR de 20:00 a 07:00 — Todos los días" / "ABRIR de 08:00 a 08:30 — Lunes a Viernes"

**Sección 3 — Resumen de Votación Estudiantil:**
- Fila de 4 tarjetas con iconos:
  - Alumnos Presentes (icono grupo) — número grande
  - Votos para Abrir (icono sol) — número grande
  - Votos para Cerrar (icono nube) — número grande
  - Participación (icono circular de progreso) — porcentaje
- Texto inferior: "Quórum necesario: X votos"
- Badge esquina superior derecha: "Esperando Quórum" / "Votación Activa" / "Resultado: ABRIR"
- Botones admin: "Iniciar Votación" / "Cerrar Votación"

**Sección Analíticas (página separada o tab):**
- Gráfica de líneas (Recharts LineChart) con histórico de últimas 2-24 horas (selector)
- Líneas: temperatura (rojo), humedad (azul), UV (amarillo)
- Eje X: tiempo. Eje Y: valores. Tooltip on hover.

---

### MÓDULO ALUMNADO (`/alumnado`)

Referencia: mockup "Modulo Alumnado"

**Layout:**
- Header azul primario con:
  - Logo + "Sistema de Techumbre" / "Facultad de Ingeniería Mochis"
  - Botón "Salir" a la derecha
- Contenido centrado, max-width ~600px, padding lateral

**Sección 1 — Bienvenida:**
- Tarjeta blanca con borde sutil
- "¡Hola, [Nombre del alumno]!"
- Subtexto: "Matrícula: [XXXX] | [Carrera]"

**Sección 2 — Estado de Ubicación:**
- Tarjeta con icono de ubicación verde y check verde si presencia activa
- "Estado de Ubicación: DENTRO DE LA FACULTAD" (si RFID marcó)
- Si no tiene presencia: icono rojo, "FUERA DE LA FACULTAD — Pasa tu credencial por el lector para votar"

**Sección 3 — Estado del Techo:**
- "ESTADO ACTUAL DEL TECHO"
- Badge grande: "CERRADO" (naranja) o "ABIERTO" (verde)
- Barra de progreso de votación:
  - Texto: "Votación estudiantil" — "X% para [abrir/cerrar]"
  - Barra visual con el porcentaje
  - Subtexto: "La mayoría prefiere el techo [abierto/cerrado]"
- Si no hay sesión activa: "No hay votación en curso"

**Sección 4 — Votación:**
- "¿Cómo prefieres el ambiente ahora?"
- Subtexto: "Tu voto ayuda a decidir el estado del techo"
- 2 botones grandes lado a lado:
  - "SOLICITAR APERTURA" — verde con icono sol
  - "SOLICITAR CIERRE" — naranja con icono nube
- Si ya votó: botones deshabilitados + texto "Ya emitiste tu voto"
- Si sin presencia: botones deshabilitados + texto "Debes estar presente para votar"
- Si emergencia: botones deshabilitados + banner "Techo bloqueado por emergencia climática"

**Sección 5 — Datos Climáticos:**
- Fila de 4 mini-tarjetas:
  - Temperatura (°C)
  - Humedad (%)
  - Lluvia Próxima (Sí/No)
  - Índice UV (valor)
- Actualizadas en tiempo real por WebSocket

**Footer:**
- "Sistema de Techumbre Automatizada Inteligente v1.0"
- "© 2025 Facultad de Ingeniería Mochis - UAS"

---

## Responsive Design

- **Desktop (>1024px):** Layout completo con sidebar visible
- **Tablet (768-1024px):** Sidebar colapsable, tarjetas en grid 2 columnas
- **Móvil (<768px):** Sidebar como drawer/hamburger, tarjetas apiladas verticalmente, botones full-width
- El módulo de alumnado está diseñado mobile-first (los alumnos votarán desde sus celulares)

---

## Comunicación ESP32 ↔ Servidor

El ESP32 se conecta al backend de dos formas:

1. **HTTP POST cada 5 segundos** a `/api/telemetry` con header `x-api-key: [API_KEY_SIMPLE]`
2. **WebSocket** (Socket.IO o WebSocket puro) para recibir comandos en tiempo real

El backend al recibir telemetría:
- Guarda en DB (tabla Telemetry)
- Evalúa prioridades (¿lluvia? ¿UV extremo?)
- Si hay emergencia → envía comando de cierre al ESP32 por WebSocket
- Emite `sensors:live` a todos los clientes frontend conectados

---

## Seed de Base de Datos

Crear un script `prisma/seed.js` que inserte:

```javascript
// Admin por defecto
{
  matricula: "ADMIN001",
  name: "Carlos Mendoza",
  career: "Coordinador de Infraestructura",
  role: "ADMIN",
  password: "admin123" // hash con bcrypt
}

// 5 alumnos de prueba
{ matricula: "21030001", name: "Juan Carlos Hernández", career: "Ingeniería en Software" }
{ matricula: "21030002", name: "María López García", career: "Ingeniería Civil" }
{ matricula: "21030003", name: "Roberto Sánchez Pérez", career: "Ingeniería Mecánica" }
{ matricula: "21030004", name: "Ana Martínez Díaz", career: "Ingeniería en Sistemas" }
{ matricula: "21030005", name: "Diego Ramírez Torres", career: "Ingeniería Eléctrica" }
// password para todos: "alumno123"

// Estado inicial del sistema
{ id: 1, roofState: "CLOSED", activePriority: 4, emergencyLock: false, rainAutoMode: true }
```

---

## Variables de Entorno (.env)

```env
DATABASE_URL=postgresql://user:pass@host:5432/techumbre
JWT_SECRET=techumbre-secret-key-2025
ESP32_API_KEY=esp32-techumbre-key
PORT=3001
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

---

## Instrucciones de Desarrollo

1. Iniciar con el backend: schema Prisma, migración, seed, endpoints REST básicos
2. Implementar Socket.IO en el backend
3. Construir el frontend: Login → Admin Dashboard → Student Portal
4. Conectar frontend con backend (axios + socket.io-client)
5. Probar flujo completo con datos simulados (sin ESP32)
6. Agregar endpoint para simular datos de sensores (útil para la demo sin ESP32):
   - `POST /api/telemetry/simulate` que genera datos aleatorios realistas

---

## Comandos

```bash
# Backend
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev    # nodemon src/index.js

# Frontend
cd frontend
npm install
npm run dev    # vite dev server
```

---

## Notas Importantes

- La gráfica de analíticas debe verse profesional: tooltips, leyenda, ejes con formato, animaciones suaves
- Toda tarjeta de sensor debe tener una animación sutil al actualizarse (pulse o fade)
- Los botones de override deben tener confirmación (modal "¿Estás seguro?")
- El sistema debe mostrar claramente QUÉ PRIORIDAD está activa en todo momento
- El portal de alumnos NO debe mostrar el conteo parcial de votos (solo % de participación y barra general) para no sesgar
- Implementar un indicador visual de conexión WebSocket (punto verde/rojo en la esquina)
- Si el ESP32 no envía datos por más de 30 segundos, mostrar banner "ESP32 desconectado" en el dashboard
