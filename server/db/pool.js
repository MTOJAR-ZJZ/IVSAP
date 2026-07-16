import pg from 'pg';
import { config } from '../config.js';

export const pool = new pg.Pool(config.db);

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 500) {
    console.warn(`Slow query (${duration}ms):`, text.slice(0, 100));
  }
  return result;
}
