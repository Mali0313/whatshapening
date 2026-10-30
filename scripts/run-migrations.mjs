import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

// We use explicit connection parameters to avoid URI parsing issues with special characters in password
const passwordsToTry = ['03139505103@#$', '[03139505103@#$]'];

async function connectAndRun() {
  let client = null;
  let connected = false;

  for (const password of passwordsToTry) {
    try {
      console.log(`Attempting connection with password variation...`);
      client = new Client({
        host: 'db.camesukdbjyqzwhngvoa.supabase.co',
        port: 5432,
        user: 'postgres',
        password: password,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
      });
      await client.connect();
      console.log('Successfully connected to Supabase PostgreSQL database!');
      connected = true;
      break;
    } catch (err) {
      console.log(`Failed: ${err.message}`);
      if (client) {
        try { await client.end(); } catch {}
      }
    }
  }

  if (!connected) {
    console.error('Could not connect directly via PostgreSQL. Migration SQL can be run in Supabase SQL Editor.');
    process.exit(1);
  }

  try {
    const fullSetupSql = fs.readFileSync(path.join(__dirname, '../supabase/full_setup.sql'), 'utf-8');
    console.log('Running supabase/full_setup.sql...');
    await client.query(fullSetupSql);
    console.log('Successfully executed full_setup.sql!');

    const notifSql = fs.readFileSync(path.join(__dirname, '../supabase/notifications.sql'), 'utf-8');
    console.log('Running supabase/notifications.sql...');
    await client.query(notifSql);
    console.log('Successfully executed notifications.sql!');

    console.log('ALL MIGRATIONS APPLIED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error applying migration:', err);
  } finally {
    await client.end();
  }
}

connectAndRun();
