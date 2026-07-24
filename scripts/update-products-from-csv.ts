/**
 * Mass Product Update Script v2 — DasaDinusulu
 * ─────────────────────────────────────────────
 * Works with the NEW embedded-variants product format where each product
 * is a single document with a `variants[]` array.
 *
 * What it does:
 *  ✅  Updates variant prices for each matching product + size
 *  ✅  Adds new size variants to existing products
 *  ✅  Updates category, isMustTry, isSpecialItem from CSV tags
 *  ✅  Keeps existing titles, images, descriptions, nutrition, stock, salesCount
 *  ✅  Merges duplicate DB documents (same product, different sizes) into one
 *  ✅  Adds entirely new products with all sizes as variants
 *  ⚠️  Skips flagged / incomplete rows and reports them
 *  📁  Always saves a timestamped backup before writing
 *
 * Usage:
 *   npx tsx scripts/update-products-from-csv.ts <products-json> <csv-file>
 *   npx tsx scripts/update-products-from-csv.ts <products-json> <csv-file> --apply
 *
 * Example:
 *   npx tsx scripts/update-products-from-csv.ts \
 *     /media/abhish/System1/Solitaire/DasaDinusulu/backup/products.json \
 *     db-backup/price-update-jul2026.csv
 *
 * First run WITHOUT --apply to preview all changes.
 * Once happy, re-run WITH --apply to save.
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Paths ────────────────────────────────────────────────────────────────────

const ROOT = path.join(__dirname, '..');

// ─── Tuning ───────────────────────────────────────────────────────────────────

/** Minimum similarity score (0–1) to count as a match */
const MATCH_THRESHOLD = 0.65;

// ─── Category → ProductId prefix ──────────────────────────────────────────────

const CATEGORY_PREFIX: Record<string, string> = {
  'Roasted Seeds':    'CPS',
  'Jaggery Biscuits': 'PJB',
  'Millet Snacks':    'TMS',
  'Protein Snacks':   'PES',
  'Home Made Snacks': 'HMS',
  'Healthy Sweets':   'PHS',
  'Golden Honey':     'GNH',
  'Trending Jellys':  'TRJ',
  'Healthy Chips':    'HCC',
};

// ─── CSV column → size/weight mapping ─────────────────────────────────────────

const SIZE_COLS = [
  { col: 'price_100g', size: '100g',  weight: 100  },
  { col: 'price_200g', size: '200g',  weight: 200  },
  { col: 'price_250g', size: '250g',  weight: 250  },
  { col: 'price_500g', size: '500g',  weight: 500  },
  { col: 'price_1kg',  size: '1kg',   weight: 1000 },
];

// ─── Manual overrides for tricky matches ──────────────────────────────────────
// Maps normalised(csvName) → DB productId (the LOWEST productId for that product).
// Use '__NEW__' to force a brand-new product (no matching).

const KNOWN_MATCHES: Record<string, string> = {
  // Dasadinusulu signature — matches CPS001 (200g) + CPS009 (500g, 1kg)
  'dasadinusulu దశ దినుసులు tin': 'CPS001',
  // "Thati Bellam Sunnudalu" = "Kadapa Sunnundalu"
  'thati bellam sunnudalu organic': 'PHS008',
  // "అవిసెగింజల" (avise/flax) ≡ "అలసింగింజ" (alasinginja)
  'తాటిబెల్లం అవిసెగింజల బిస్కెట్': 'PJB014',
  // CSV "తాటిబెల్లం నట్స్" matches DB "Palm Jaggery Nuts Biscuit" (PJB009)
  'తాటిబెల్లం నట్స్': 'PJB009',
  // HONEY DRY FRUITS is a distinct product from Dry Fruit Musly
  'honey dry fruits': '__NEW__',
  // ROASTED SPROUTS BOONDI is distinct from Sprouts Boondi
  'roasted sprouts boondi': '__NEW__',
  // Beetroot Mint Podina Chips appears in CSV under "Millet Snacks" category
  // but also maps to HCC003. The CSV row "BEET ROOT MINT PODINA CHIPS"
  // should match the existing product.
  'beet root mint podina chips': 'HCC003',
  // CSV "BEET ROOT PODINA CHIPS" → DB "Beetroot Podina Chips" (HCC004)
  'beet root podina chips': 'HCC004',
  // CSV "CURRYLEAF MINT PODINA CHIPS" → DB "Curry Leaf Mint Podina Chips" (HCC005)
  'curryleaf mint podina chips': 'HCC005',
  // CSV "GINGER CHIPS" → DB "Ginger Chips" (HCC006)  
  'ginger chips': 'HCC006',
  // CSV "JALAPENO MASALA CHIPS" → DB "Jalapeno Masala Chips" (HCC007)
  'jalapeno masala chips': 'HCC007',
};

// ─── Merge map: group DB docs that represent the same physical product ───────
// Maps secondary productId → primary productId.
// The script will merge all variants into the primary document.

const MERGE_PRODUCTS: Record<string, string> = {
  // CPS009 (500g, 1kg Dasadinusulu) merges into CPS001 (200g)
  'CPS009': 'CPS001',
  // TMS014 (500g Jonna Murukulu) merges into TMS005 (250g)
  'TMS014': 'TMS005',
  // TMS013 (1kg Sweetcorn Boondi) merges into TMS008 if it exists, else keep
  // NOTE: TMS008 doesn't exist in the current export. We'll keep TMS013 as-is.
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface MongoOid { $oid: string }
interface MongoDate { $date: string }

interface Variant {
  packagingSize: string;
  weight: number;
  price: number;
  compareAtPrice?: number;
  stock: number;
  salesCount: number;
  _id?: MongoOid;
}

interface Product {
  _id: MongoOid;
  productId: string;
  title: string;
  slug: string;
  description: string;
  images: string[];
  category: string;
  foodType?: string | null;
  tags: string[];
  variants: Variant[];
  isActive: boolean;
  isMustTry: boolean;
  isSpecialItem: boolean;
  isBestSeller: boolean;
  hsnCode?: string;
  nutritionInfo?: Record<string, string> | null;
  createdAt: MongoDate;
  updatedAt?: MongoDate;
  // Legacy fields that might exist
  stock?: number;
  salesCount?: number;
  [key: string]: unknown;
}

interface CsvRow {
  name: string;
  category: string;
  tags: string;
  [key: string]: string;
}

interface SizeEntry { col: string; size: string; weight: number; price: number }

// ─── String normalisation ─────────────────────────────────────────────────────

function norm(str: string): string {
  return str
    .toLowerCase()
    .replace(/–/g, ' ')                          // en-dash
    .replace(/-/g, ' ')                           // hyphens
    .replace(/[^a-z0-9\u0c00-\u0c7f\s]/g, '')   // keep ASCII alnum + Telugu + spaces
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Normalise packagingSize to always have "g" or "kg" suffix ────────────────

function normSize(s: string): string {
  const t = s.trim().toLowerCase();
  if (t.endsWith('kg') || t.endsWith('g')) return t;
  const n = parseInt(t, 10);
  if (!isNaN(n)) return n >= 1000 ? `${n / 1000}kg` : `${n}g`;
  return t;
}

// ─── Fuzzy similarity (0–1) ───────────────────────────────────────────────────

function similarity(csvName: string, dbTitle: string): number {
  const na = norm(csvName);
  const nb = norm(dbTitle);

  if (na === nb) return 1.0;
  if (nb.includes(na) || na.includes(nb)) return 0.9;

  const wa = na.split(' ').filter(w => w.length > 2);
  const wb = nb.split(' ').filter(w => w.length > 2);
  if (wa.length === 0) return 0;

  let hits = 0;
  for (const w of wa) {
    if (wb.some(bw => bw.includes(w) || w.includes(bw))) hits++;
  }
  return hits / Math.max(wa.length, wb.length);
}

// ─── Match lookup ─────────────────────────────────────────────────────────────

function bestMatch(csvName: string, products: Product[]): { product: Product; score: number } | null {
  const override = KNOWN_MATCHES[norm(csvName)];
  if (override === '__NEW__') return null;
  if (override) {
    const p = products.find(x => x.productId === override);
    if (p) return { product: p, score: 1.0 };
  }

  let best: { product: Product; score: number } | null = null;
  for (const p of products) {
    const s = similarity(csvName, p.title);
    if (!best || s > best.score) best = { product: p, score: s };
  }
  return best && best.score >= MATCH_THRESHOLD ? best : null;
}

// ─── ID / slug generation ─────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function nextProductId(prefix: string, allProducts: Product[]): string {
  const nums = allProducts
    .filter(p => p.productId?.startsWith(prefix))
    .map(p => parseInt(p.productId.replace(prefix, ''), 10))
    .filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

function generateMongoOid(): MongoOid {
  const ts   = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const rand = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  ).join('');
  return { $oid: ts + rand };
}

function mongoDateNow(): MongoDate {
  return { $date: new Date().toISOString() };
}

// ─── Price conversion ─────────────────────────────────────────────────────────

function rupeeToP(val: string): number | null {
  const cleaned = val.trim().replace(/[^\d.]/g, '');
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : Math.round(n * 100);
}

// ─── Tag → flag helpers ───────────────────────────────────────────────────────

function parseFlags(tags: string): { isMustTry: boolean; isSpecialItem: boolean } {
  const t = (tags || '').toUpperCase();
  return {
    isMustTry:     t.includes('MUST TRY'),
    isSpecialItem: t.includes('SPECIAL ITEM'),
  };
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      out.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function parseCSV(text: string): CsvRow[] {
  const lines   = text.split('\n').map(l => l.trimEnd());
  const headers = parseCsvLine(lines[0]).map(h => h.trim());
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = (vals[j] ?? '').trim(); });
    if (!row['name']) continue;
    rows.push(row as CsvRow);
  }
  return rows;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const jsonPath  = process.argv[2];
  const csvPath   = process.argv[3];
  const applyMode = process.argv.includes('--apply');

  if (!jsonPath || !csvPath) {
    console.error('Usage: npx tsx scripts/update-products-from-csv.ts <products-json> <csv-file> [--apply]');
    process.exit(1);
  }
  if (!fs.existsSync(jsonPath)) { console.error(`❌  JSON not found: ${jsonPath}`); process.exit(1); }
  if (!fs.existsSync(csvPath))  { console.error(`❌  CSV not found: ${csvPath}`);   process.exit(1); }

  // ── Load existing products ───────────────────────────────────────────────────
  console.log('\n📂  Loading products JSON …');
  const originalJson = fs.readFileSync(jsonPath, 'utf-8');
  const original: Product[] = JSON.parse(originalJson);
  console.log(`    ${original.length} existing product documents.\n`);

  // Deep-clone for working copy
  const db: Product[] = JSON.parse(originalJson);

  // ── Phase 1: Merge duplicate DB documents ────────────────────────────────────
  // Some products exist as separate docs for different sizes (e.g. CPS001=200g,
  // CPS009=500g+1kg). Merge their variants into the primary document.
  const mergeReport: string[] = [];
  for (const [secondaryId, primaryId] of Object.entries(MERGE_PRODUCTS)) {
    const primaryIdx   = db.findIndex(p => p.productId === primaryId);
    const secondaryIdx = db.findIndex(p => p.productId === secondaryId);
    if (primaryIdx === -1 || secondaryIdx === -1) continue;

    const primary   = db[primaryIdx];
    const secondary = db[secondaryIdx];

    // Merge variants from secondary into primary (avoid duplicates by size)
    for (const sv of secondary.variants) {
      const sSize = normSize(sv.packagingSize);
      const exists = primary.variants.some(pv => normSize(pv.packagingSize) === sSize);
      if (!exists) {
        primary.variants.push({ ...sv, packagingSize: sSize });
        mergeReport.push(`  Merged ${secondaryId} variant [${sSize}] into ${primaryId} ("${primary.title}")`);
      }
    }

    // Merge images from secondary
    for (const img of secondary.images) {
      if (!primary.images.includes(img)) primary.images.push(img);
    }

    // Remove secondary document
    db.splice(secondaryIdx, 1);
    mergeReport.push(`  Removed duplicate document ${secondaryId}`);
  }

  // ── Normalise all existing packagingSize values ──────────────────────────────
  for (const p of db) {
    for (const v of p.variants) {
      v.packagingSize = normSize(v.packagingSize);
    }
  }

  // ── Parse CSV ────────────────────────────────────────────────────────────────
  console.log(`📄  Parsing CSV: ${csvPath}`);
  const csvRows = parseCSV(fs.readFileSync(csvPath, 'utf-8'));
  console.log(`    ${csvRows.length} rows found.\n`);

  // ── Report buckets ───────────────────────────────────────────────────────────
  const rep = {
    priceUpdates:    [] as string[],
    newVariants:     [] as string[],
    removedVariants: [] as string[],
    newProducts:     [] as string[],
    flagged:         [] as string[],
    skipped:         [] as string[],
    borderline:      [] as string[],
    categoryUpdates: [] as string[],
    flagUpdates:     [] as string[],
  };

  // Collect flagged rows
  csvRows
    .filter(r => (r['flagged'] ?? '').toUpperCase() === 'YES')
    .forEach(r => {
      const reason = r['flag_reason'] || `see column: ${r['flag_field']}`;
      rep.flagged.push(`${r.name}  —  ${reason}`);
    });

  // Accumulates brand-new product docs
  const added: Product[] = [];
  const allProducts = (): Product[] => [...db, ...added];

  // ── Process active (non-flagged) rows ────────────────────────────────────────
  const activeRows = csvRows.filter(r => (r['flagged'] ?? '').toUpperCase() !== 'YES');

  // De-duplicate CSV rows by name (some rows appear twice, once with data once flagged)
  const seen = new Set<string>();

  for (const row of activeRows) {
    // Collect sizes with valid prices
    const sizes: SizeEntry[] = SIZE_COLS
      .map(sc => ({ ...sc, price: rupeeToP(row[sc.col] ?? '') }))
      .filter((sc): sc is SizeEntry => sc.price !== null);

    if (sizes.length === 0) {
      rep.skipped.push(`${row.name}  —  no valid prices`);
      continue;
    }

    // De-dup by normalised name (skip duplicate active rows)
    const normName = norm(row.name);
    if (seen.has(normName)) continue;
    seen.add(normName);

    const { isMustTry, isSpecialItem } = parseFlags(row.tags);
    const category = (row.category ?? '').trim() || 'Uncategorized';
    const prefix   = CATEGORY_PREFIX[category] ?? 'NEW';

    const match = bestMatch(row.name, db);

    // Flag borderline matches
    if (match && match.score < 0.80 && !KNOWN_MATCHES[normName]) {
      rep.borderline.push(
        `"${row.name}"  →  "${match.product.title}"  (score: ${match.score.toFixed(2)})`
      );
    }

    if (match) {
      // ── EXISTING PRODUCT ────────────────────────────────────────────────────
      const product = match.product;

      // Update category
      if (product.category !== category) {
        rep.categoryUpdates.push(`"${product.title}" : "${product.category}" → "${category}"`);
        product.category = category;
      }

      // Update flags
      if (product.isMustTry !== isMustTry || product.isSpecialItem !== isSpecialItem) {
        const changes: string[] = [];
        if (product.isMustTry !== isMustTry) changes.push(`isMustTry: ${product.isMustTry} → ${isMustTry}`);
        if (product.isSpecialItem !== isSpecialItem) changes.push(`isSpecialItem: ${product.isSpecialItem} → ${isSpecialItem}`);
        rep.flagUpdates.push(`"${product.title}" : ${changes.join(', ')}`);
        product.isMustTry = isMustTry;
        product.isSpecialItem = isSpecialItem;
      }

      // Rebuild variants: only keep sizes from CSV
      const oldVariants = [...product.variants];
      const newVariants: Variant[] = [];

      for (const s of sizes) {
        const old = oldVariants.find(v => normSize(v.packagingSize) === s.size);
        if (old) {
          // Size exists — update price, preserve stock/salesCount/_id
          if (old.price !== s.price) {
            rep.priceUpdates.push(
              `"${product.title}" [${s.size}]  ₹${old.price / 100} → ₹${s.price / 100}`
            );
          }
          newVariants.push({ ...old, packagingSize: s.size, price: s.price });
        } else {
          // New size from CSV
          newVariants.push({
            packagingSize: s.size,
            weight: s.weight,
            price: s.price,
            stock: 0,
            salesCount: 0,
            _id: generateMongoOid(),
          });
          rep.newVariants.push(`"${product.title}" [${s.size}] @ ₹${s.price / 100}`);
        }
      }

      // Report dropped old variants
      for (const old of oldVariants) {
        const kept = sizes.some(s => s.size === normSize(old.packagingSize));
        if (!kept) {
          rep.removedVariants.push(
            `"${product.title}" [${normSize(old.packagingSize)}] @ ₹${old.price / 100}  (dropped)`
          );
        }
      }

      // Replace variants and sort by weight
      product.variants = newVariants.sort((a, b) => a.weight - b.weight);

      // Update timestamp
      product.updatedAt = mongoDateNow();

    } else {
      // ── BRAND-NEW PRODUCT ───────────────────────────────────────────────────
      const sizeList = sizes.map(s => s.size).join(', ');
      rep.newProducts.push(`"${row.name}"  →  ${category}  (${sizeList})`);

      const newId   = nextProductId(prefix, allProducts());
      const slug    = slugify(row.name);

      const variants: Variant[] = sizes.map(s => ({
        packagingSize: s.size,
        weight:        s.weight,
        price:         s.price,
        stock:         0,
        salesCount:    0,
        _id:           generateMongoOid(),
      }));

      const newProduct: Product = {
        _id:           generateMongoOid(),
        productId:     newId,
        title:         row.name.trim(),
        slug,
        description:   '',
        images:        [],
        category,
        tags:          [],
        variants,
        isActive:      true,
        isMustTry,
        isSpecialItem,
        isBestSeller:  false,
        nutritionInfo: { calories: '', protein: '', carbs: '', fat: '', fiber: '' },
        createdAt:     mongoDateNow(),
        updatedAt:     mongoDateNow(),
      };
      added.push(newProduct);
    }
  }

  // ── Print report ─────────────────────────────────────────────────────────────
  const HR   = '═'.repeat(76);
  const mode = applyMode ? 'APPLY MODE — WILL WRITE CHANGES' : 'DRY RUN — pass --apply to save';
  console.log(`\n${HR}`);
  console.log(`📊  REPORT   [${mode}]`);
  console.log(HR);

  if (mergeReport.length) {
    console.log(`\n🔗  MERGED DUPLICATE DOCUMENTS (${mergeReport.length}):`);
    mergeReport.forEach(l => console.log(`     ${l}`));
  }

  if (rep.flagged.length) {
    console.log(`\n⚠️   FLAGGED — skipped, needs manual review (${rep.flagged.length}):`);
    rep.flagged.forEach(l => console.log(`     • ${l}`));
  }

  if (rep.skipped.length) {
    console.log(`\n⏭️   NO PRICES — skipped (${rep.skipped.length}):`);
    rep.skipped.forEach(l => console.log(`     • ${l}`));
  }

  if (rep.borderline.length) {
    console.log(`\n🔍  BORDERLINE MATCHES — please verify (${rep.borderline.length}):`);
    rep.borderline.forEach(l => console.log(`     ⚡ ${l}`));
  }

  if (rep.removedVariants.length) {
    console.log(`\n🗑️   OLD VARIANTS REMOVED (${rep.removedVariants.length}):`);
    rep.removedVariants.forEach(l => console.log(`     - ${l}`));
  }

  if (rep.categoryUpdates.length) {
    console.log(`\n📁  CATEGORY UPDATES (${rep.categoryUpdates.length}):`);
    rep.categoryUpdates.forEach(l => console.log(`     ${l}`));
  }

  if (rep.flagUpdates.length) {
    console.log(`\n🏷️   FLAG UPDATES (${rep.flagUpdates.length}):`);
    rep.flagUpdates.forEach(l => console.log(`     ${l}`));
  }

  if (rep.priceUpdates.length) {
    console.log(`\n💰  PRICE UPDATES (${rep.priceUpdates.length}):`);
    rep.priceUpdates.forEach(l => console.log(`     ${l}`));
  }

  if (rep.newVariants.length) {
    console.log(`\n📦  NEW SIZE VARIANTS ADDED (${rep.newVariants.length}):`);
    rep.newVariants.forEach(l => console.log(`     + ${l}`));
  }

  if (rep.newProducts.length) {
    console.log(`\n🆕  BRAND-NEW PRODUCTS (${rep.newProducts.length}):`);
    rep.newProducts.forEach(l => console.log(`     + ${l}`));
  }

  const totalAfter = db.length + added.length;
  console.log(`\n${HR}`);
  console.log('SUMMARY');
  console.log(`  Documents merged          : ${Object.keys(MERGE_PRODUCTS).filter(k => db.findIndex(p => p.productId === k) === -1).length}`);
  console.log(`  Price updates             : ${rep.priceUpdates.length}`);
  console.log(`  New variants added        : ${rep.newVariants.length}`);
  console.log(`  Old variants removed      : ${rep.removedVariants.length}`);
  console.log(`  Category updates          : ${rep.categoryUpdates.length}`);
  console.log(`  Flag updates              : ${rep.flagUpdates.length}`);
  console.log(`  Brand-new products added  : ${rep.newProducts.length}`);
  console.log(`  Flagged rows (skipped)    : ${rep.flagged.length}`);
  console.log(`  No-price rows (skipped)   : ${rep.skipped.length}`);
  console.log(`  Total products before     : ${original.length}`);
  console.log(`  Total products after      : ${totalAfter}`);
  console.log(HR);

  // ── Apply ────────────────────────────────────────────────────────────────────
  if (applyMode) {
    const outputPath = path.join(ROOT, 'db-backup', 'products-updated.json');

    // Backup original
    const ts         = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = jsonPath.replace('.json', `.backup-${ts}.json`);
    fs.copyFileSync(jsonPath, backupPath);
    console.log(`\n📁  Backup saved → ${backupPath}`);

    const final = [...db, ...added];
    fs.writeFileSync(outputPath, JSON.stringify(final, null, 2));
    console.log(`✅  Saved ${final.length} products → ${outputPath}`);
    console.log('\nNext steps:');
    console.log('  1. Review the output file');
    console.log('  2. Import into MongoDB (use mongoimport or your migrate script)');
    console.log('  3. Update the category enum in src/models/Product.ts if needed');
  } else {
    console.log('\n💡  Happy with the changes? Re-run with --apply to write them:');
    console.log(`    npx tsx scripts/update-products-from-csv.ts ${jsonPath} ${csvPath} --apply`);
  }
}

main();
