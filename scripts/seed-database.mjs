import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env.local file not found.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...values] = trimmed.split('=');
    envVars[key.trim()] = values.join('=').trim();
  }
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey || supabaseUrl.includes('[paste') || serviceKey.includes('[paste')) {
  console.log('\n======================================================');
  console.log('NOTICE: Supabase credentials are not yet configured in .env.local.');
  console.log('To set up your Supabase database:');
  console.log('1. Open your Supabase Dashboard -> SQL Editor');
  console.log('2. Open and copy the contents of: supabase/full_setup.sql');
  console.log('3. Paste into the SQL Editor and click RUN.');
  console.log('4. Copy your Project URL & Keys into .env.local.');
  console.log('======================================================\n');
  process.exit(0);
}

console.log(`Connecting to Supabase at: ${supabaseUrl}`);
const supabase = createClient(supabaseUrl, serviceKey);

async function testAndSeed() {
  try {
    const { data: categories, error: catError } = await supabase.from('categories').select('id, name');
    if (catError) {
      console.error('Error querying categories:', catError.message);
      console.log('Have you executed supabase/full_setup.sql in your Supabase SQL Editor?');
      return;
    }

    console.log(`Successfully verified Supabase connection! Found ${categories.length} categories.`);
    const { count, error: artError } = await supabase.from('articles').select('*', { count: 'exact', head: true });
    if (!artError) {
      console.log(`Total articles in database: ${count}`);
    }
  } catch (err) {
    console.error('Seed script encountered error:', err);
  }
}

testAndSeed();
