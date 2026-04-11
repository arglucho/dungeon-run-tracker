# 🏰 Dungeon Run Tracker (DRT)

App de escritorio para registrar y analizar runs de mazmorras en **Dofus Retro**.

## ✨ Características

- **Registrar runs** con cronómetro o tiempo manual, XP, kamas y recursos por sala
- **Dashboard** con resumen global, run activa y accesos rápidos
- **Historial** con filtros por mazmorra, estado, modo y fechas
- **Estadísticas** globales, por sala y por recurso con filtros Solo/Grupo
- **Comparador** de runs lado a lado
- **Exportar** runs a JSON o PDF con diálogo nativo
- **Importar** runs desde JSON
- **Backup manual** de la base de datos SQLite
- **Tema visual** estilo Dofus Retro (colores tierra, detalles dorados)

## 🛠️ Stack Tecnológico

- **Electron** + **React** + **TypeScript** + **Vite** (via electron-vite)
- **SQLite** (better-sqlite3) para persistencia local
- **Tailwind CSS v4** para estilos
- **Recharts** para gráficos
- **jsPDF** para exportación PDF
- **Vitest** para testing

## 📦 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/arglucho/dungeon-run-tracker.git
cd dungeon-run-tracker

# Instalar dependencias
npm install
```

## 🚀 Desarrollo

```bash
# Ejecutar en modo desarrollo
npm run dev

# Ejecutar tests
npm run test

# Build de producción (sin empaquetado)
npm run build
```

## 📁 Estructura del Proyecto

```
src/
├── main/              # Proceso principal de Electron
│   ├── database/      # SQLite: schema, migraciones, seed
│   ├── services/      # Lógica de negocio (CRUD, stats, export)
│   └── ipc/           # Handlers IPC
├── preload/           # Bridge seguro (contextBridge)
└── renderer/src/      # React app
    ├── components/    # Componentes reutilizables
    ├── pages/         # Pantallas
    ├── hooks/         # Custom hooks
    ├── context/       # React Context (RunProvider)
    └── types/         # Tipos TypeScript
tests/                 # Tests unitarios (Vitest)
resources/             # Seed data (JSON editable)
```

## 🎮 Flujo de Uso

1. **Crear mazmorra** (nombre + número de salas esperadas)
2. **Iniciar run** (seleccionar mazmorra, modo solo/grupo)
3. **Registrar salas** (XP, kamas, tiempo, recursos, turnos)
4. **Run finaliza** automáticamente al completar todas las salas
5. **Ver estadísticas**, comparar runs, exportar datos

## 📊 Base de Datos

SQLite con 5 tablas: `dungeons`, `resources`, `runs`, `rooms`, `room_resources`.
Foreign keys con CASCADE. WAL mode habilitado.

---

Desarrollado con ❤️ para la comunidad de Dofus Retro.
