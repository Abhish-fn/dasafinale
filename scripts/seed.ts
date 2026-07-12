/**
 * Database Seeder — DasaDinusulu
 *
 * Usage: npx tsx scripts/seed.ts
 *        npx tsx scripts/seed.ts --force   (drops existing products first)
 * Requires: SEED_ENABLED=true and MONGODB_URI in .env
 */
import mongoose from 'mongoose';
import 'dotenv/config';

// Guard: Only run when explicitly enabled
if (process.env.SEED_ENABLED !== 'true') {
  console.error('❌ SEED_ENABLED is not set to "true". Aborting.');
  console.log('   Set SEED_ENABLED=true in .env to run the seed script.');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set. Aborting.');
  process.exit(1);
}

const forceMode = process.argv.includes('--force');

async function seed() {
  console.log('🌱 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI!);

  // Import models after connection
  const User = (await import('../src/models/User')).default;
  const Product = (await import('../src/models/Product')).default;

  // --- Seed Admin User ---
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@dasadinusulu.com';
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      name: 'Admin',
      email: adminEmail,
      provider: 'google',
      role: 'admin',
    });
    console.log(`✅ Admin user created: ${adminEmail}`);
  } else {
    if (existingAdmin.role !== 'admin') {
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log(`✅ Updated ${adminEmail} to admin role`);
    } else {
      console.log(`ℹ️  Admin already exists: ${adminEmail}`);
    }
  }

  // --- Seed Products ---
  const existingCount = await Product.countDocuments();

  if (existingCount > 0 && !forceMode) {
    console.log(`ℹ️  ${existingCount} products already exist. Skipping product seed.`);
    console.log('   Use --force flag to drop existing products and re-seed.');
  } else {
    if (forceMode && existingCount > 0) {
      await Product.deleteMany({});
      console.log(`🗑️  Dropped ${existingCount} existing products (--force mode).`);
    }

    const products = [
      // ═══════════════════════════════════════════════════════════════
      // Category 1: Clay Pot Roasted Seeds & Superfoods (8 items)
      // ═══════════════════════════════════════════════════════════════
      {
        productId: 'CPS001',
        title: 'Clay Pot Roasted Dasadinusulu (దాసదినుసులు) Tin',
        slug: 'clay-pot-roasted-dasadinusulu-tin',
        description: 'Our signature blend — DasaDinusulu! A premium mix of 10 nutrient-rich seeds, slow-roasted in traditional clay pots for unmatched flavor and crunch. The crown jewel of our collection.',
        images: [],
        category: 'Roasted Foods',
        foodType: 'Superfood',
        tags: ['Roasted Superfood Mixes', 'Signature', 'High Protein'],
        variants: [
          { packagingSize: '100g', weight: 100, price: 14900, stock: 50, salesCount: 0 },
          { packagingSize: '200g', weight: 200, price: 24900, stock: 50, salesCount: 0 },
          { packagingSize: '400g', weight: 400, price: 44900, stock: 30, salesCount: 0 },
        ],
        isActive: true,
        isMustTry: true,
        isBestSeller: true,
      },
      {
        productId: 'CPS002',
        title: 'Clay Pot Roasted Triple Seeds Tin',
        slug: 'clay-pot-roasted-triple-seeds-tin',
        description: 'A powerful trio of seeds — pumpkin, sunflower, and watermelon — slow-roasted in clay pots. Packed with protein, omega-3, and essential minerals.',
        images: [],
        category: 'Clay Pot Roasted Seeds & Superfoods',
        foodType: 'Seeds',
        tags: ['Roasted Seeds', 'High Protein', 'Omega-3'],
        variants: [
          { packagingSize: '150g', weight: 150, price: 22900, stock: 40, salesCount: 0 },
          { packagingSize: '250g', weight: 250, price: 34900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
        isMustTry: true,
      },
      {
        productId: 'CPS003',
        title: 'Clay Pot Roasted Sunflower Seeds Tin',
        slug: 'clay-pot-roasted-sunflower-seeds-tin',
        description: 'Crunchy sunflower seeds roasted to perfection in clay pots. Rich in vitamin E, selenium, and healthy fats for heart health.',
        images: [],
        category: 'Clay Pot Roasted Seeds & Superfoods',
        foodType: 'Seeds',
        tags: ['Roasted Seeds', 'Heart Healthy', 'Vitamin E'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 19900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'CPS004',
        title: 'Clay Pot Roasted Pumpkin Seeds Tin',
        slug: 'clay-pot-roasted-pumpkin-seeds-tin',
        description: 'Premium pumpkin seeds slow-roasted in traditional clay pots. Rich in zinc, magnesium, and healthy fats for overall wellness.',
        images: [],
        category: 'Clay Pot Roasted Seeds & Superfoods',
        foodType: 'Seeds',
        tags: ['Roasted Seeds', 'High Zinc', 'Magnesium Rich'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'CPS005',
        title: 'Clay Pot Roasted Watermelon Seeds Tin',
        slug: 'clay-pot-roasted-watermelon-seeds-tin',
        description: 'Light, crunchy watermelon seeds roasted in clay pots. A protein-packed snack loaded with iron and healthy fats.',
        images: [],
        category: 'Clay Pot Roasted Seeds & Superfoods',
        foodType: 'Seeds',
        tags: ['Roasted Seeds', 'Iron Rich', 'High Protein'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 34900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'CPS006',
        title: 'Clay Pot Roasted Avisa Seeds Tin',
        slug: 'clay-pot-roasted-avisa-seeds-tin',
        description: 'Traditional Avisa (flax) seeds, slow-roasted in clay pots to release their nutty flavor. Excellent source of omega-3 fatty acids and dietary fiber.',
        images: [],
        category: 'Clay Pot Roasted Seeds & Superfoods',
        foodType: 'Seeds',
        tags: ['Roasted Seeds', 'Omega-3', 'Fiber Rich'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 14900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'CPS007',
        title: 'Clay Pot Roasted Protein Seeds Tin',
        slug: 'clay-pot-roasted-protein-seeds-tin',
        description: 'A handpicked blend of high-protein seeds, roasted in clay pots for maximum nutrition and taste. Ideal for fitness enthusiasts and health-conscious snackers.',
        images: [],
        category: 'Clay Pot Roasted Seeds & Superfoods',
        foodType: 'Superfood',
        tags: ['Roasted Superfood Mixes', 'High Protein', 'Fitness'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 34900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
        isMustTry: true,
      },
      {
        productId: 'CPS008',
        title: 'Roasted Quinoa Crisps',
        slug: 'roasted-quinoa-crisps',
        description: 'Light and crispy quinoa puffs roasted to golden perfection. A complete protein source with all 9 essential amino acids. The perfect guilt-free munch.',
        images: [],
        category: 'Clay Pot Roasted Seeds & Superfoods',
        foodType: 'Superfood',
        tags: ['Roasted Superfood Mixes', 'Complete Protein', 'Gluten Free'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 29900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
        isMustTry: true,
      },

      // ═══════════════════════════════════════════════════════════════
      // Category 2: Protein & Energy Snacks (5 items)
      // ═══════════════════════════════════════════════════════════════
      {
        productId: 'PES001',
        title: 'Protein Beans',
        slug: 'protein-beans',
        description: 'Crunchy roasted beans loaded with plant protein. A wholesome, high-fiber snack perfect for gym-goers, dieters, and anyone who craves healthy munching.',
        images: [],
        category: 'Protein & Energy Snacks',
        foodType: 'Protein',
        tags: ['High Protein', 'Plant Based', 'Fiber Rich'],
        variants: [
          { packagingSize: '100g', weight: 100, price: 14900, stock: 60, salesCount: 0 },
          { packagingSize: '200g', weight: 200, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
        isMustTry: true,
        isSpecialItem: true,
      },
      {
        productId: 'PES002',
        title: 'Protein Mixture',
        slug: 'protein-mixture',
        description: 'A crunchy medley of roasted lentils, seeds, and nuts seasoned with aromatic spices. High in protein, low in guilt — your perfect tea-time companion.',
        images: [],
        category: 'Protein & Energy Snacks',
        foodType: 'Protein',
        tags: ['High Protein', 'Traditional', 'Spiced'],
        variants: [
          { packagingSize: '200g', weight: 200, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
        isMustTry: true,
      },
      {
        productId: 'PES003',
        title: 'Protein Booster',
        slug: 'protein-booster',
        description: 'A power-packed mix of roasted seeds and pulses designed to boost your daily protein intake. Ideal as a pre/post workout snack or an energizing midday bite.',
        images: [],
        category: 'Protein & Energy Snacks',
        foodType: 'Protein',
        tags: ['High Protein', 'Energy', 'Fitness'],
        variants: [
          { packagingSize: '200g', weight: 200, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'PES004',
        title: 'Kaju Peanut Bytes',
        slug: 'kaju-peanut-bytes',
        description: 'Irresistible bite-sized clusters of roasted cashews and peanuts with a hint of spice. Crunchy, protein-rich, and utterly addictive.',
        images: [],
        category: 'Protein & Energy Snacks',
        foodType: 'Protein',
        tags: ['Nuts', 'High Protein', 'Crunchy'],
        variants: [
          { packagingSize: '200g', weight: 200, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
        isMustTry: true,
      },
      {
        productId: 'PES005',
        title: 'Dry Fruit Musly',
        slug: 'dry-fruit-musly',
        description: 'A wholesome blend of oats, roasted dry fruits, seeds, and honey clusters. Rich in fiber and energy — the perfect breakfast or snack on-the-go.',
        images: [],
        category: 'Protein & Energy Snacks',
        foodType: 'Protein',
        tags: ['Dry Fruits', 'Fiber Rich', 'Breakfast'],
        variants: [
          { packagingSize: '200g', weight: 200, price: 24900, stock: 50, salesCount: 0 },
          { packagingSize: '400g', weight: 400, price: 44900, stock: 25, salesCount: 0 },
        ],
        isActive: true,
      },

      // ═══════════════════════════════════════════════════════════════
      // Category 3: Palm Jaggery Millet Biscuits (16 items)
      // No Sugar • No Maida • No Oil • No Dalda
      // ═══════════════════════════════════════════════════════════════

      // --- Millet Biscuits ---
      {
        productId: 'PJB001',
        title: 'తాటిబెల్లం రాగి బిస్కెట్ – Palm Jaggery Finger Millet Biscuit',
        slug: 'palm-jaggery-finger-millet-biscuit',
        description: 'Wholesome biscuits made with finger millet (ragi) and palm jaggery. No sugar, no maida, no oil, no dalda — just pure millet goodness in every bite.',
        images: [],
        category: 'Palm Jaggery Millet Biscuits',
        foodType: 'Biscuits',
        tags: ['Millet Biscuits', 'No Sugar', 'No Maida', 'No Oil'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'PJB002',
        title: 'తాటిబెల్లం జొన్న బిస్కెట్ – Palm Jaggery Sorghum Biscuit',
        slug: 'palm-jaggery-sorghum-biscuit',
        description: 'Crispy biscuits crafted from sorghum (jowar) flour and sweetened with natural palm jaggery. A healthy, traditional treat with zero refined ingredients.',
        images: [],
        category: 'Palm Jaggery Millet Biscuits',
        foodType: 'Biscuits',
        tags: ['Millet Biscuits', 'No Sugar', 'No Maida', 'No Oil'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'PJB003',
        title: 'తాటిబెల్లం కొర్ర బిస్కెట్ – Palm Jaggery Korra Biscuit',
        slug: 'palm-jaggery-korra-biscuit',
        description: 'Delightful biscuits made with foxtail millet (korra) and palm jaggery. Rich in dietary fiber and naturally sweetened for guilt-free snacking.',
        images: [],
        category: 'Palm Jaggery Millet Biscuits',
        foodType: 'Biscuits',
        tags: ['Millet Biscuits', 'No Sugar', 'No Maida', 'No Oil'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'PJB004',
        title: 'తాటిబెల్లం ఆర్గండి బిస్కెట్ – Palm Jaggery Organdi Biscuit',
        slug: 'palm-jaggery-organdi-biscuit',
        description: 'A unique biscuit made with organdi millet flour and palm jaggery. Crunchy texture with wholesome millet nutrition in every bite.',
        images: [],
        category: 'Palm Jaggery Millet Biscuits',
        foodType: 'Biscuits',
        tags: ['Millet Biscuits', 'No Sugar', 'No Maida', 'No Oil'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'PJB005',
        title: 'తాటిబెల్లం సజ్జ బిస్కెట్ – Palm Jaggery Sajja Biscuit',
        slug: 'palm-jaggery-sajja-biscuit',
        description: 'Nourishing biscuits made from pearl millet (sajja) and palm jaggery. Naturally gluten-free and loaded with iron and calcium.',
        images: [],
        category: 'Palm Jaggery Millet Biscuits',
        foodType: 'Biscuits',
        tags: ['Millet Biscuits', 'No Sugar', 'No Maida', 'No Oil'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'PJB006',
        title: 'తాటిబెల్లం సామలు బిస్కెట్ – Palm Jaggery Samalu Biscuit',
        slug: 'palm-jaggery-samalu-biscuit',
        description: 'Traditional biscuits made with little millet (samalu) and natural palm jaggery. Light, crunchy, and packed with ancient grain nutrition.',
        images: [],
        category: 'Palm Jaggery Millet Biscuits',
        foodType: 'Biscuits',
        tags: ['Millet Biscuits', 'No Sugar', 'No Maida', 'No Oil'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'PJB007',
        title: 'తాటిబెల్లం ఓట్ గ్రాస్ బిస్కెట్ – Palm Jaggery Oat Grass Biscuit',
        slug: 'palm-jaggery-oat-grass-biscuit',
        description: 'Innovative biscuits blending oat grass flour with palm jaggery. A fiber-rich, naturally sweetened biscuit for the health-conscious.',
        images: [],
        category: 'Palm Jaggery Millet Biscuits',
        foodType: 'Biscuits',
        tags: ['Herbal / Spice Biscuits', 'No Sugar', 'No Maida', 'No Oil'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'PJB008',
        title: 'తాటిబెల్లం మిక్స్ మిల్లెట్ బిస్కెట్ – Palm Jaggery Mix Millet Biscuit',
        slug: 'palm-jaggery-mix-millet-biscuit',
        description: 'The best of all millets in one biscuit! A multi-millet blend with palm jaggery for a balanced, nutrient-dense treat.',
        images: [],
        category: 'Palm Jaggery Millet Biscuits',
        foodType: 'Biscuits',
        tags: ['Millet Biscuits', 'No Sugar', 'No Maida', 'No Oil'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },

      // --- Nut & Seed Biscuits ---
      {
        productId: 'PJB009',
        title: 'తాటిబెల్లం నట్స్ బిస్కెట్ – Palm Jaggery Nuts Biscuit',
        slug: 'palm-jaggery-nuts-biscuit',
        description: 'Crunchy biscuits loaded with mixed nuts and sweetened with palm jaggery. A premium, protein-rich treat for nut lovers.',
        images: [],
        category: 'Palm Jaggery Millet Biscuits',
        foodType: 'Biscuits',
        tags: ['Nut & Seed Biscuits', 'No Sugar', 'No Maida', 'No Oil'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'PJB010',
        title: 'తాటిబెల్లం వాము బిస్కెట్ – Palm Jaggery Vaamu Biscuit',
        slug: 'palm-jaggery-vaamu-biscuit',
        description: 'Aromatic biscuits infused with carom seeds (vaamu/ajwain) and palm jaggery. Great for digestion and irresistibly flavorful.',
        images: [],
        category: 'Palm Jaggery Millet Biscuits',
        foodType: 'Biscuits',
        tags: ['Herbal / Spice Biscuits', 'No Sugar', 'No Maida', 'Digestive'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'PJB011',
        title: 'తాటిబెల్లం జీడిపప్పు బిస్కెట్ – Palm Jaggery Cashew Biscuit',
        slug: 'palm-jaggery-cashew-biscuit',
        description: 'Rich biscuits studded with cashew pieces and sweetened with palm jaggery. A premium indulgence that\'s still 100% healthy.',
        images: [],
        category: 'Palm Jaggery Millet Biscuits',
        foodType: 'Biscuits',
        tags: ['Nut & Seed Biscuits', 'No Sugar', 'No Maida', 'Premium'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'PJB012',
        title: 'తాటిబెల్లం బాదం బిస్కెట్ – Palm Jaggery Badam Biscuit',
        slug: 'palm-jaggery-badam-biscuit',
        description: 'Almond-enriched biscuits with natural palm jaggery sweetness. Packed with vitamin E, healthy fats, and the satisfying crunch of real badaam.',
        images: [],
        category: 'Palm Jaggery Millet Biscuits',
        foodType: 'Biscuits',
        tags: ['Nut & Seed Biscuits', 'No Sugar', 'No Maida', 'Almond'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'PJB013',
        title: 'తాటిబెల్లం నువ్వులు జింజర్ బిస్కెట్ – Palm Jaggery Sesame Ginger Biscuit',
        slug: 'palm-jaggery-sesame-ginger-biscuit',
        description: 'A warming combination of sesame seeds and ginger in a palm jaggery biscuit. Rich in calcium and great for immunity.',
        images: [],
        category: 'Palm Jaggery Millet Biscuits',
        foodType: 'Biscuits',
        tags: ['Nut & Seed Biscuits', 'No Sugar', 'No Maida', 'Ginger'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'PJB014',
        title: 'తాటిబెల్లం అలసింగింజ బిస్కెట్ – Palm Jaggery Alasinginja Biscuit',
        slug: 'palm-jaggery-alasinginja-biscuit',
        description: 'Traditional biscuits made with flaxseed (alasinginja) and palm jaggery. An omega-3 rich treat that supports heart and brain health.',
        images: [],
        category: 'Palm Jaggery Millet Biscuits',
        foodType: 'Biscuits',
        tags: ['Nut & Seed Biscuits', 'No Sugar', 'No Maida', 'Omega-3'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'PJB015',
        title: 'తాటిబెల్లం జీలకర్ర బిస్కెట్ – Palm Jaggery Jeera Biscuit',
        slug: 'palm-jaggery-jeera-biscuit',
        description: 'Savory-sweet biscuits with cumin (jeera) and palm jaggery. The cumin aids digestion while adding a warm, earthy flavor.',
        images: [],
        category: 'Palm Jaggery Millet Biscuits',
        foodType: 'Biscuits',
        tags: ['Herbal / Spice Biscuits', 'No Sugar', 'No Maida', 'Digestive'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'PJB016',
        title: 'తాటిబెల్లం పుచ్చ గింజల బిస్కెట్ – Palm Jaggery Watermelon Seeds Biscuit',
        slug: 'palm-jaggery-watermelon-seeds-biscuit',
        description: 'Unique biscuits enriched with watermelon seeds and palm jaggery. Protein-packed and iron-rich for sustained energy throughout the day.',
        images: [],
        category: 'Palm Jaggery Millet Biscuits',
        foodType: 'Biscuits',
        tags: ['Nut & Seed Biscuits', 'No Sugar', 'No Maida', 'Iron Rich'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 24900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },

      // ═══════════════════════════════════════════════════════════════
      // Category 4: Traditional Millet Savoury Snacks (11 items)
      // No Maida • No Palm Oil • Made with Cold Pressed Groundnut Oil
      // ═══════════════════════════════════════════════════════════════

      // --- Murukulu ---
      {
        productId: 'TMS001',
        title: 'Curry Leaf Murukulu',
        slug: 'curry-leaf-murukulu',
        description: 'Crispy, aromatic murukulu infused with fresh curry leaves and made with cold-pressed groundnut oil. No maida, no palm oil — just pure traditional taste.',
        images: [],
        category: 'Traditional Millet Savoury Snacks',
        foodType: 'Snacks',
        tags: ['Murukulu', 'No Maida', 'Cold Pressed Oil', 'Curry Leaf'],
        variants: [
          { packagingSize: '150g', weight: 150, price: 12000, stock: 40, salesCount: 0 },
          { packagingSize: '250g', weight: 250, price: 20000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
        isMustTry: true,
      },
      {
        productId: 'TMS002',
        title: 'Beetroot Murukulu',
        slug: 'beetroot-murukulu',
        description: 'Vibrant, naturally colored murukulu made with beetroot and millet flour. Crunchy, nutritious, and visually stunning — a feast for the eyes and palate.',
        images: [],
        category: 'Traditional Millet Savoury Snacks',
        foodType: 'Snacks',
        tags: ['Murukulu', 'No Maida', 'Cold Pressed Oil', 'Beetroot'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 20000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
        isMustTry: true,
      },
      {
        productId: 'TMS003',
        title: 'Ragi Finger Millet Murukulu',
        slug: 'ragi-finger-millet-murukulu',
        description: 'Traditional murukulu made with finger millet (ragi) flour and cold-pressed groundnut oil. High in calcium and iron with an authentic homemade taste.',
        images: [],
        category: 'Traditional Millet Savoury Snacks',
        foodType: 'Snacks',
        tags: ['Murukulu', 'No Maida', 'Cold Pressed Oil', 'Ragi'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 20000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'TMS004',
        title: 'Ginger Murukulu',
        slug: 'ginger-murukulu',
        description: 'Spicy and warming murukulu with fresh ginger flavor. Made with millet flour and cold-pressed groundnut oil for a healthier take on the classic snack.',
        images: [],
        category: 'Traditional Millet Savoury Snacks',
        foodType: 'Snacks',
        tags: ['Murukulu', 'No Maida', 'Cold Pressed Oil', 'Ginger'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 20000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
        isMustTry: true,
      },
      {
        productId: 'TMS005',
        title: 'Jonna Sorghum Millet Murukulu',
        slug: 'jonna-sorghum-millet-murukulu',
        description: 'Hearty murukulu made from sorghum (jonna) millet flour. Crispy, fiber-rich, and cooked in cold-pressed groundnut oil for authentic flavor.',
        images: [],
        category: 'Traditional Millet Savoury Snacks',
        foodType: 'Snacks',
        tags: ['Murukulu', 'No Maida', 'Cold Pressed Oil', 'Sorghum'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 20000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
        isMustTry: true,
      },
      {
        productId: 'TMS006',
        title: 'Sajja Pearl Millet Murukulu',
        slug: 'sajja-pearl-millet-murukulu',
        description: 'Authentic murukulu made from pearl millet (sajja) flour and cold-pressed groundnut oil. Rich in iron and fiber with a satisfying crunch.',
        images: [],
        category: 'Traditional Millet Savoury Snacks',
        foodType: 'Snacks',
        tags: ['Murukulu', 'No Maida', 'Cold Pressed Oil', 'Pearl Millet'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 20000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },

      // --- Boondi & Mixtures ---
      {
        productId: 'TMS007',
        title: 'Sprouts Boondi',
        slug: 'sprouts-boondi',
        description: 'Innovative boondi made with sprouted lentils for extra protein and nutrition. Crispy, light, and made with cold-pressed groundnut oil.',
        images: [],
        category: 'Traditional Millet Savoury Snacks',
        foodType: 'Snacks',
        tags: ['Boondi & Mixtures', 'No Maida', 'Cold Pressed Oil', 'Sprouts'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 20000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
        isMustTry: true,
        isSpecialItem: true,
      },
      {
        productId: 'TMS008',
        title: 'Sweetcorn Boondi',
        slug: 'sweetcorn-boondi',
        description: 'A delightful twist on classic boondi with sweet corn flavor. Light, crispy, and made entirely without maida or palm oil.',
        images: [],
        category: 'Traditional Millet Savoury Snacks',
        foodType: 'Snacks',
        tags: ['Boondi & Mixtures', 'No Maida', 'Cold Pressed Oil', 'Sweetcorn'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 20000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
        isMustTry: true,
        isSpecialItem: true,
      },
      {
        productId: 'TMS009',
        title: 'Ragi Boondi Mixture',
        slug: 'ragi-boondi-mixture',
        description: 'A flavorful mixture featuring ragi boondi, roasted peanuts, curry leaves, and aromatic spices. The healthier, millet-based alternative to traditional mixture.',
        images: [],
        category: 'Traditional Millet Savoury Snacks',
        foodType: 'Snacks',
        tags: ['Boondi & Mixtures', 'No Maida', 'Cold Pressed Oil', 'Ragi'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 20000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
        isMustTry: true,
      },
      {
        productId: 'TMS010',
        title: 'Ragi Boondi',
        slug: 'ragi-boondi',
        description: 'Pure ragi boondi made with finger millet flour and cold-pressed groundnut oil. Perfectly crispy, calcium-rich, and utterly snackable.',
        images: [],
        category: 'Traditional Millet Savoury Snacks',
        foodType: 'Snacks',
        tags: ['Boondi & Mixtures', 'No Maida', 'Cold Pressed Oil', 'Ragi'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 20000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },

      // --- Sev ---
      {
        productId: 'TMS011',
        title: 'Millet Sev',
        slug: 'millet-sev',
        description: 'Thin, crispy sev made with millet flour instead of maida. Cooked in cold-pressed groundnut oil for an authentic, healthy namkeen experience.',
        images: [],
        category: 'Traditional Millet Savoury Snacks',
        foodType: 'Snacks',
        tags: ['Sev', 'No Maida', 'Cold Pressed Oil', 'Millet'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 20000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },

      // ═══════════════════════════════════════════════════════════════
      // Category 5: Healthy Chips & Crisps (7 items)
      // ═══════════════════════════════════════════════════════════════

      // --- Vegetable Chips ---
      {
        productId: 'HCC001',
        title: 'Masala Vegetable Chips',
        slug: 'masala-vegetable-chips',
        description: 'A spicy and colorful medley of thinly sliced vegetables, seasoned with aromatic masala and crispy fried to perfection. A premium healthy alternative to regular chips.',
        images: [],
        category: 'Healthy Chips & Crisps',
        foodType: 'Chips',
        tags: ['Vegetable Chips', 'Masala', 'Premium'],
        variants: [
          { packagingSize: '100g', weight: 100, price: 22900, stock: 40, salesCount: 0 },
          { packagingSize: '200g', weight: 200, price: 39900, stock: 50, salesCount: 0 },
          { packagingSize: '500g', weight: 500, price: 89900, stock: 20, salesCount: 0 },
        ],
        isActive: true,
        isMustTry: true,
        isSpecialItem: true,
      },
      {
        productId: 'HCC002',
        title: 'Vegetable Chips',
        slug: 'vegetable-chips',
        description: 'A lightly salted assortment of crunchy vegetable chips. Made from real vegetables, thinly sliced and perfectly crisped for a wholesome snacking experience.',
        images: [],
        category: 'Healthy Chips & Crisps',
        foodType: 'Chips',
        tags: ['Vegetable Chips', 'Lightly Salted'],
        variants: [
          { packagingSize: '200g', weight: 200, price: 39900, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'HCC003',
        title: 'Beetroot Mint Podina Chips',
        slug: 'beetroot-mint-podina-chips',
        description: 'Vibrant beetroot chips with a refreshing mint (podina) twist. Naturally colorful, no artificial dyes — made with cold-pressed groundnut oil.',
        images: [],
        category: 'Healthy Chips & Crisps',
        foodType: 'Chips',
        tags: ['Vegetable Chips', 'No Maida', 'Cold Pressed Oil', 'Beetroot'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 20000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'HCC004',
        title: 'Beetroot Podina Chips',
        slug: 'beetroot-podina-chips',
        description: 'Classic beetroot chips seasoned with podina (mint) spice blend. Crunchy, earthy, and refreshing — made without maida or palm oil.',
        images: [],
        category: 'Healthy Chips & Crisps',
        foodType: 'Chips',
        tags: ['Vegetable Chips', 'No Maida', 'Cold Pressed Oil', 'Mint'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 20000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },

      // --- Herbal / Spicy Chips ---
      {
        productId: 'HCC005',
        title: 'Curry Leaf Mint Podina Chips',
        slug: 'curry-leaf-mint-podina-chips',
        description: 'Aromatic chips infused with fresh curry leaves and cooling mint. Made with cold-pressed groundnut oil for a healthy, flavorful crunch.',
        images: [],
        category: 'Healthy Chips & Crisps',
        foodType: 'Chips',
        tags: ['Herbal / Spicy Chips', 'No Maida', 'Cold Pressed Oil', 'Curry Leaf'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 20000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
        isMustTry: true,
      },
      {
        productId: 'HCC006',
        title: 'Ginger Chips',
        slug: 'ginger-chips',
        description: 'Crispy chips with a warm ginger kick. Made with cold-pressed groundnut oil and zero maida for a healthier snacking alternative.',
        images: [],
        category: 'Healthy Chips & Crisps',
        foodType: 'Chips',
        tags: ['Herbal / Spicy Chips', 'No Maida', 'Cold Pressed Oil', 'Ginger'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 20000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'HCC007',
        title: 'Jalapeno Masala Chips',
        slug: 'jalapeno-masala-chips',
        description: 'Fiery jalapeno-spiced chips with an Indian masala twist. Boldly flavored, made without maida or palm oil, using only cold-pressed groundnut oil.',
        images: [],
        category: 'Healthy Chips & Crisps',
        foodType: 'Chips',
        tags: ['Herbal / Spicy Chips', 'No Maida', 'Cold Pressed Oil', 'Spicy'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 20000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },

      // ═══════════════════════════════════════════════════════════════
      // Category 6: Premium Healthy Sweets (8 items)
      // ═══════════════════════════════════════════════════════════════

      // --- Dry Fruit Sweets ---
      {
        productId: 'PHS001',
        title: 'Dry Fruit Laddu with Honey – No Sugar',
        slug: 'dry-fruit-laddu-honey',
        description: 'Luxurious laddus made with premium dry fruits and natural honey. Zero sugar, zero guilt — a wholesome sweet for festivals, gifting, or everyday indulgence.',
        images: [],
        category: 'Premium Healthy Sweets',
        foodType: 'Sweets',
        tags: ['Dry Fruit Sweets', 'No Sugar', 'Honey', 'Premium'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 25000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'PHS002',
        title: 'Anjeer Dry Fruit Chikki – No Sugar',
        slug: 'anjeer-dry-fruit-chikki',
        description: 'Premium chikki crafted with figs (anjeer) and assorted dry fruits. Naturally sweetened with no added sugar — a crunchy, nutrient-dense delight.',
        images: [],
        category: 'Premium Healthy Sweets',
        foodType: 'Sweets',
        tags: ['Dry Fruit Sweets', 'No Sugar', 'Anjeer', 'Premium'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 40000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'PHS003',
        title: 'Anjeer Triple Seeds Laddus – No Sugar',
        slug: 'anjeer-triple-seeds-laddus',
        description: 'Decadent laddus combining fig (anjeer) sweetness with the crunch of three premium seeds. No sugar added — nature provides all the sweetness you need.',
        images: [],
        category: 'Premium Healthy Sweets',
        foodType: 'Sweets',
        tags: ['Dry Fruit Sweets', 'No Sugar', 'Anjeer', 'Seeds'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 35000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'PHS004',
        title: 'Anjeer Till Seeds Laddus – No Sugar',
        slug: 'anjeer-till-seeds-laddus',
        description: 'A traditional favorite — fig and sesame (till) seed laddus with no added sugar. Rich in calcium, iron, and natural sweetness from anjeer.',
        images: [],
        category: 'Premium Healthy Sweets',
        foodType: 'Sweets',
        tags: ['Dry Fruit Sweets', 'No Sugar', 'Anjeer', 'Sesame'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 30000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },

      // --- Jaggery Laddus ---
      {
        productId: 'PHS005',
        title: 'Ghee Sunnundalu with Jaggery',
        slug: 'ghee-sunnundalu-jaggery',
        description: 'Rich and aromatic sunnundalu (urad dal laddu) made with pure ghee and jaggery. A beloved Andhra sweet, protein-rich and deeply satisfying.',
        images: [],
        category: 'Premium Healthy Sweets',
        foodType: 'Sweets',
        tags: ['Jaggery Laddus', 'Ghee', 'Traditional', 'Protein Rich'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 20000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'PHS006',
        title: 'Ragi Laddu with Jaggery',
        slug: 'ragi-laddu-jaggery',
        description: 'Wholesome laddus made from roasted ragi (finger millet) flour and natural jaggery. Packed with calcium and iron — a healthy sweet for all ages.',
        images: [],
        category: 'Premium Healthy Sweets',
        foodType: 'Sweets',
        tags: ['Jaggery Laddus', 'Ragi', 'Calcium Rich', 'Millet'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 20000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },
      {
        productId: 'PHS007',
        title: 'Multi Grain Laddu with Jaggery',
        slug: 'multi-grain-laddu-jaggery',
        description: 'A powerhouse laddu blending multiple grains with natural jaggery. Balanced nutrition from diverse grains in every delicious bite.',
        images: [],
        category: 'Premium Healthy Sweets',
        foodType: 'Sweets',
        tags: ['Jaggery Laddus', 'Multi Grain', 'Nutritious'],
        variants: [
          { packagingSize: '250g', weight: 250, price: 20000, stock: 50, salesCount: 0 },
        ],
        isActive: true,
      },

      // --- Traditional Sweets ---
      {
        productId: 'PHS008',
        title: 'Kadapa Sunnundalu Organic',
        slug: 'kadapa-sunnundalu-organic',
        description: 'The legendary Kadapa Sunnundalu — made with organic urad dal and traditional recipes passed down through generations. A must-try Rayalaseema delicacy.',
        images: [],
        category: 'Premium Healthy Sweets',
        foodType: 'Sweets',
        tags: ['Traditional Sweets', 'Organic', 'Kadapa', 'Premium'],
        variants: [
          { packagingSize: '300g', weight: 300, price: 30000, stock: 50, salesCount: 0 },
          { packagingSize: '500g', weight: 500, price: 47500, stock: 30, salesCount: 0 },
        ],
        isActive: true,
        isMustTry: true,
      },
    ];

    await Product.insertMany(products);
    console.log(`✅ ${products.length} products seeded successfully`);
  }

  await mongoose.disconnect();
  console.log('🌱 Seed complete! Disconnected from MongoDB.');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
