/**
 * MongoDB Backup & Migration Script — DasaDinusulu
 *
 * Exports all collections from the source MongoDB to JSON files,
 * then can import them into a target MongoDB (e.g., Atlas).
 *
 * Usage:
 *   Export:  npx tsx scripts/migrate-db.ts export
 *   Import:  MONGODB_TARGET_URI=<atlas-uri> npx tsx scripts/migrate-db.ts import
 */
import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const BACKUP_DIR = path.join(__dirname, '..', 'db-backup');
const SOURCE_URI = process.env.MONGODB_URI;
const TARGET_URI = process.env.MONGODB_TARGET_URI;

const action = process.argv[2]; // 'export' or 'import'

if (!action || !['export', 'import'].includes(action)) {
  console.log('Usage:');
  console.log('  npx tsx scripts/migrate-db.ts export                          — Backup Railway DB to JSON files');
  console.log('  MONGODB_TARGET_URI=<uri> npx tsx scripts/migrate-db.ts import — Import JSON files into target DB');
  process.exit(1);
}

async function exportDB() {
  if (!SOURCE_URI) {
    console.error('❌ MONGODB_URI not set in .env');
    process.exit(1);
  }

  console.log('📦 Connecting to source MongoDB...');
  const conn = await mongoose.connect(SOURCE_URI);
  const db = conn.connection.db!;

  // Create backup directory
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Get all collection names
  const collections = await db.listCollections().toArray();
  console.log(`📋 Found ${collections.length} collections: ${collections.map(c => c.name).join(', ')}`);

  for (const collInfo of collections) {
    const name = collInfo.name;
    const docs = await db.collection(name).find({}).toArray();
    const filePath = path.join(BACKUP_DIR, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));
    console.log(`  ✅ ${name}: ${docs.length} documents → ${filePath}`);
  }

  await mongoose.disconnect();
  console.log(`\n🎉 Backup complete! Files saved to: ${BACKUP_DIR}`);
  console.log('\nNext steps:');
  console.log('  1. Create a free MongoDB Atlas cluster at https://cloud.mongodb.com');
  console.log('  2. Get your Atlas connection string');
  console.log('  3. Run: MONGODB_TARGET_URI=<atlas-uri> npx tsx scripts/migrate-db.ts import');
}

async function importDB() {
  if (!TARGET_URI) {
    console.error('❌ MONGODB_TARGET_URI not set.');
    console.error('   Run: MONGODB_TARGET_URI=<atlas-uri> npx tsx scripts/migrate-db.ts import');
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    console.error(`❌ Backup directory not found: ${BACKUP_DIR}`);
    console.error('   Run export first: npx tsx scripts/migrate-db.ts export');
    process.exit(1);
  }

  console.log('📦 Connecting to target MongoDB...');
  const conn = await mongoose.connect(TARGET_URI);
  const db = conn.connection.db!;

  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
  console.log(`📋 Found ${files.length} backup files`);

  for (const file of files) {
    const collName = path.basename(file, '.json');
    const filePath = path.join(BACKUP_DIR, file);
    const docs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    if (docs.length === 0) {
      console.log(`  ⏭️  ${collName}: 0 documents (skipped)`);
      continue;
    }

    // Drop existing collection if it exists
    const existing = await db.listCollections({ name: collName }).toArray();
    if (existing.length > 0) {
      await db.collection(collName).drop();
      console.log(`  🗑️  Dropped existing "${collName}" collection`);
    }

    await db.collection(collName).insertMany(docs);
    console.log(`  ✅ ${collName}: ${docs.length} documents imported`);
  }

  await mongoose.disconnect();
  console.log('\n🎉 Import complete!');
  console.log('\nNext steps:');
  console.log('  1. Update MONGODB_URI in your .env to the Atlas connection string');
  console.log('  2. Update MONGODB_URI in your Railway deployment environment variables');
  console.log('  3. Restart your app');
}

(action === 'export' ? exportDB() : importDB()).catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
