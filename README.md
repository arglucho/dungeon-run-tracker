# 🏰 Dungeon Run Tracker

> App de escritorio para registrar, analizar y comparar runs de mazmorras en **Dofus Retro**.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Electron](https://img.shields.io/badge/Electron-39-47848F?logo=electron)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

---

## ¿Qué es esto?

**Dungeon Run Tracker (DRT)** es una aplicación de escritorio multiplataforma pensada para jugadores de Dofus Retro que quieren llevar un registro detallado de sus runs en mazmorras. Más allá del simple historial, DRT te permite analizar tu rendimiento sala a sala, comparar runs entre sí, rastrear recursos obtenidos y visualizar tendencias en el tiempo — todo sin depender de ningún servidor externo. Tus datos viven localmente en una base de datos SQLite.

---

## Tabla de Contenidos

- [Características](#-características)
- [Stack Tecnológico](#️-stack-tecnológico)
- [Instalación y Configuración](#-instalación-y-configuración)
- [Scripts Disponibles](#-scripts-disponibles)
- [Flujo de Uso](#-flujo-de-uso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Base de Datos](#-base-de-datos)
- [Build y Distribución](#-build-y-distribución)
- [Testing](#-testing)

---

## ✨ Características

### Gestión de Runs
- **Nueva run** desde cualquier mazmorra registrada, en modo Solo o Grupo
- **Cronómetro integrado** por sala o ingreso de tiempo manual
- **Registro por sala**: XP, kamas, turnos, tiempo y recursos obtenidos
- **Finalización automática** al completar todas las salas esperadas
- **Edición de runs** para corregir datos después de registradas

### Análisis y Estadísticas
- **Dashboard** con resumen global: runs totales, XP, kamas y tiempo acumulado
- **Estadísticas globales** con filtros por mazmorra, modo (Solo/Grupo) y rango de fechas
- **Estadísticas por sala**: tiempos promedio, XP, kamas y turnos por número de sala
- **Estadísticas por recurso**: total obtenido, promedio por run y frecuencia de aparición
- **Evolución temporal**: gráfico de XP y kamas por día
- **Comparador**: analiza dos runs lado a lado con sus métricas completas

### Historial y Datos
- **Historial completo** con filtros por mazmorra, estado, modo y fechas
- **Detalle de run**: vista completa sala por sala con recursos y tiempos
- **Gestión de mazmorras**: crear y administrar mazmorras con número de salas esperadas
- **Gestión de recursos**: activar/desactivar recursos del pool disponible

### Importación y Exportación
- **Exportar run a JSON** — formato completo con todas las salas y recursos
- **Exportar todas las runs a JSON** — backup completo de datos
- **Exportar run a PDF** — reporte legible con diálogo de guardado nativo
- **Importar runs desde JSON** — restaura runs individuales o conjuntos
- **Backup de la base de datos** — copia directa del archivo SQLite
- **Restaurar backup** — reemplaza la base de datos desde un archivo .db

### Experiencia de Usuario
- **Tema visual** inspirado en Dofus Retro: paleta de colores tierra y detalles dorados
- **Navegación** con barra lateral persistente y accesos rápidos desde el dashboard
- **Persistencia local** total: sin cuentas, sin internet, sin servidores

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework desktop | Electron | 39 |
| UI | React + TypeScript | 19 / 5 |
| Bundler | electron-vite + Vite | 5 / 7 |
| Estilos | Tailwind CSS | v4 |
| Base de datos | better-sqlite3 (SQLite) | 12 |
| Routing | React Router DOM | 7 |
| Gráficos | Recharts | 3 |
| Exportación PDF | jsPDF | 4 |
| Fechas | date-fns | 4 |
| Testing | Vitest + Testing Library | 4 |
| Linting | ESLint + Prettier | 9 / 3 |

---

## 📦 Instalación y Configuración

**Requisitos previos**: Node.js 20+ y npm.

```bash
# 1. Clonar el repositorio
git clone https://github.com/arglucho/dungeon-run-tracker.git
cd dungeon-run-tracker

# 2. Instalar dependencias (incluye compilación de módulos nativos)
npm install
```

El script `postinstall` ejecuta automáticamente `electron-builder install-app-deps` para compilar `better-sqlite3` contra la versión de Electron del proyecto.

---

## 🚀 Scripts Disponibles

```bash
# Desarrollo — inicia la app con hot reload
npm run dev

# Verificación de tipos TypeScript
npm run typecheck

# Lint con ESLint
npm run lint

# Formateo con Prettier
npm run format

# Tests unitarios (single run)
npm run test

# Tests en modo watch
npm run test:watch

# Build de producción (typecheck + bundle)
npm run build

# Preview del build de producción
npm start
```

---

## 🎮 Flujo de Uso

```
1. Crear mazmorra     →  Nombre + número de salas esperadas
2. Iniciar run        →  Seleccionar mazmorra + modo (Solo / Grupo)
3. Registrar salas    →  XP, kamas, tiempo, turnos y recursos por sala
4. Completar run      →  Finalización automática al cubrir todas las salas
5. Analizar           →  Dashboard, estadísticas, comparador y exportación
```

Cada run queda registrada con su estado (`IN_PROGRESS`, `COMPLETED` o `ABANDONED`), permitiendo retomarla si la aplicación se cierra inesperadamente.

---

## 📁 Estructura del Proyecto

```
dungeon-run-tracker/
├── src/
│   ├── main/                     # Proceso principal de Electron
│   │   ├── database/
│   │   │   ├── schema.ts         # Definición de tablas e índices
│   │   │   ├── migrations.ts     # Sistema de migraciones versionadas
│   │   │   ├── seed.ts           # Datos iniciales desde resources/
│   │   │   └── database.ts       # Singleton de conexión SQLite
│   │   ├── services/
│   │   │   ├── dungeonService.ts # CRUD de mazmorras
│   │   │   ├── runService.ts     # CRUD de runs
│   │   │   ├── roomService.ts    # CRUD de salas
│   │   │   ├── resourceService.ts# CRUD de recursos
│   │   │   ├── statsService.ts   # Estadísticas y comparaciones
│   │   │   ├── exportService.ts  # JSON, PDF, backup e importación
│   │   │   └── mockService.ts    # Generador de datos de prueba (dev)
│   │   └── ipc/
│   │       └── handlers.ts       # Handlers IPC (main ↔ renderer)
│   ├── preload/                  # Bridge seguro via contextBridge
│   └── renderer/src/             # Aplicación React
│       ├── components/           # Button, Card, Modal, Timer, etc.
│       ├── pages/                # Dashboard, History, Statistics, etc.
│       ├── hooks/                # useDungeons, useResources
│       ├── context/              # RunContext / RunProvider
│       └── types/                # Tipos TypeScript compartidos
├── tests/
│   └── services/
│       ├── database.test.ts      # Tests de inicialización y schema
│       └── services.test.ts      # Tests de servicios de negocio
├── resources/                    # Seed data en JSON (editable)
├── electron-builder.yml          # Configuración de empaquetado
├── electron.vite.config.ts       # Configuración de electron-vite
└── vitest.config.ts              # Configuración de Vitest
```

---

## 📊 Base de Datos

SQLite local con 6 tablas y versioning de schema para migraciones futuras.

```
dungeons          resources
  id                id
  name              name
  expected_rooms    is_active
  description       created_at
  created_at
       │                │
       │                │
      runs         room_resources
       id  ◄──────── run_id     room_id ──────► rooms
       dungeon_id           resource_id         id
       start_time           quantity            run_id
       end_time                                 room_number
       total_time_seconds                       turns
       total_xp                                 time_seconds
       total_kamas                              xp
       is_group                                 kamas
       status                                   notes
       notes
                    schema_version
                      version
                      applied_at
```

**Características del schema:**
- Foreign keys con `ON DELETE CASCADE` en `rooms` y `room_resources`
- WAL mode habilitado para mejor rendimiento concurrente
- Índices en columnas de consulta frecuente (`dungeon_id`, `status`, `start_time`, `run_id`)
- Tabla `schema_version` para migraciones incrementales

---

## 📦 Build y Distribución

```bash
# Windows — genera instalador NSIS (.exe)
npm run build:win

# macOS — genera .dmg / .app
npm run build:mac

# Linux — genera AppImage / deb / rpm
npm run build:linux

# Sin empaquetar (directorio) — útil para pruebas
npm run build:unpack
```

Los artefactos se generan en el directorio `dist/`. El instalador de Windows se nombra `DungeonRunTracker-{version}-setup.exe` y permite elegir el directorio de instalación.

La base de datos de producción se almacena en el directorio `userData` de Electron (dependiente del sistema operativo), separada de los archivos de la aplicación.

---

## 🧪 Testing

Los tests unitarios cubren los servicios de la capa de datos (main process) usando una base de datos SQLite en memoria.

```bash
npm run test          # Ejecutar todos los tests
npm run test:watch    # Modo watch para desarrollo
```

```
tests/
└── services/
    ├── database.test.ts   # Schema, inicialización y migraciones
    └── services.test.ts   # dungeonService, runService, roomService, statsService
```

---

Desarrollado con ❤️ para la comunidad de Dofus Retro.
