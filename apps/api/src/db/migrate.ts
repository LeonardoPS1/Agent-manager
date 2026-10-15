import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { pool } from './index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  const sqlPath = join(__dirname, 'migrations', '0000_init.sql')
  const sql = await readFile(sqlPath, 'utf8')
  console.log('Running migrations from', sqlPath)
  await pool.query(sql)
  console.log('Migrations applied successfully.')
  await pool.end()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
