import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'stream_analyzer',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrate() {
  const sqlDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(sqlDir).filter(f => f.endsWith('.sql')).sort();

  // Create migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name VARCHAR(200) PRIMARY KEY,
      run_at TIMESTAMP DEFAULT NOW()
    )
  `);

  for (const file of files) {
    const [existing] = await pool.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
    if (existing.rows.length > 0) {
      console.log(`  SKIP ${file} — already applied`);
      continue;
    }
    const sql = fs.readFileSync(path.join(sqlDir, file), 'utf8');
    console.log(`  RUN  ${file}...`);
    await pool.query(sql);
    await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
    console.log(`  DONE ${file}`);
  }

  await pool.end();
  console.log('Migration complete.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
