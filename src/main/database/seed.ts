import { getDatabase } from './database'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

interface SeedData {
  dungeon: {
    name: string
    expected_rooms: number
    description: string
  }
  resources: string[]
}

export function seedDatabase(): void {
  const db = getDatabase()

  // Solo insertar seed si no hay datos existentes
  const dungeonCount = db.prepare('SELECT COUNT(*) as count FROM dungeons').get() as {
    count: number
  }
  if (dungeonCount.count > 0) return

  const seedData = loadSeedData()
  if (!seedData) return

  const insertDungeon = db.prepare(
    'INSERT INTO dungeons (name, expected_rooms, description) VALUES (?, ?, ?)'
  )
  const insertResource = db.prepare('INSERT OR IGNORE INTO resources (name) VALUES (?)')

  const transaction = db.transaction(() => {
    // Insertar mazmorra Jalató
    insertDungeon.run(
      seedData.dungeon.name,
      seedData.dungeon.expected_rooms,
      seedData.dungeon.description
    )

    // Insertar recursos (ignorar placeholders)
    for (const resourceName of seedData.resources) {
      if (resourceName && !resourceName.startsWith('AGREGAR_')) {
        insertResource.run(resourceName)
      }
    }
  })

  transaction()
}

function loadSeedData(): SeedData | null {
  // Buscar el archivo JSON de seed en resources/
  const possiblePaths = [
    join(process.cwd(), 'resources', 'jalato-resources.json'),
    // En producción, buscar en el directorio de recursos de la app
    is.dev ? '' : join(process.resourcesPath, 'jalato-resources.json')
  ].filter(Boolean)

  for (const seedPath of possiblePaths) {
    if (existsSync(seedPath)) {
      try {
        const raw = readFileSync(seedPath, 'utf-8')
        return JSON.parse(raw) as SeedData
      } catch {
        console.error(`Error al leer seed data desde: ${seedPath}`)
      }
    }
  }

  console.warn('No se encontró archivo de seed data (jalato-resources.json)')
  return null
}
