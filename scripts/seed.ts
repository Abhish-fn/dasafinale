/**
 * Database Seeder — DasaDinusulu
 *
 * Usage: npx tsx scripts/seed.ts
 * Requires: SEED_ENABLED=true and MONGODB_URI in .env.local
 */
import mongoose from 'mongoose';
import 'dotenv/config';

// Guard: Only run when explicitly enabled
if (process.env.SEED_ENABLED !== 'true') {
  console.error('❌ SEED_ENABLED is not set to "true". Aborting.');
  console.log('   Set SEED_ENABLED=true in .env.local to run the seed script.');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set. Aborting.');
  process.exit(1);
}

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
  if (existingCount > 0) {
    console.log(`ℹ️  ${existingCount} products already exist. Skipping product seed.`);
  } else {
    const products = [
      // Clay Pot Roasted Seeds
      {
        productId: 'CPS001', title: 'Clay Pot Roasted Pumpkin Seeds', slug: 'clay-pot-roasted-pumpkin-seeds',
        description: 'Premium pumpkin seeds slow-roasted in traditional clay pots for maximum flavor and nutrition. Rich in zinc, magnesium, and healthy fats.',
        images: [], price: 29900, compareAtPrice: 34900, category: 'Clay Pot Roasted Seeds & Superfoods', foodType: 'Seeds',
        tags: ['High Protein', 'No Maida', 'Gluten Free'], packagingSize: '250g', stock: 50, weight: 250,
        isActive: true, isMustTry: true, isBestSeller: true, salesCount: 120, variantGroup: 'pumpkin-seeds',
        nutritionInfo: { calories: '559 kcal/100g', protein: '30g', carbs: '10.7g', fat: '49g', fiber: '6g' },
      },
      {
        productId: 'CPS002', title: 'Clay Pot Roasted Pumpkin Seeds - Large', slug: 'clay-pot-roasted-pumpkin-seeds-large',
        description: 'Premium pumpkin seeds slow-roasted in traditional clay pots for maximum flavor and nutrition. Family pack.',
        images: [], price: 54900, compareAtPrice: 64900, category: 'Clay Pot Roasted Seeds & Superfoods', foodType: 'Seeds',
        tags: ['High Protein', 'No Maida', 'Gluten Free', 'Value Pack'], packagingSize: '500g', stock: 30, weight: 500,
        isActive: true, isMustTry: false, isBestSeller: false, salesCount: 45, variantGroup: 'pumpkin-seeds',
        nutritionInfo: { calories: '559 kcal/100g', protein: '30g', carbs: '10.7g', fat: '49g', fiber: '6g' },
      },
      {
        productId: 'CPS003', title: 'Clay Pot Roasted Sunflower Seeds', slug: 'clay-pot-roasted-sunflower-seeds',
        description: 'Crunchy sunflower seeds roasted to perfection in clay pots. Packed with vitamin E and selenium for heart health.',
        images: [], price: 19900, category: 'Clay Pot Roasted Seeds & Superfoods', foodType: 'Seeds',
        tags: ['Heart Healthy', 'No Maida', 'Gluten Free'], packagingSize: '200g', stock: 80, weight: 200,
        isActive: true, isMustTry: false, isBestSeller: false, salesCount: 67,
        nutritionInfo: { calories: '584 kcal/100g', protein: '20.8g', carbs: '20g', fat: '51.5g', fiber: '8.6g' },
      },
      {
        productId: 'CPS004', title: 'Clay Pot Roasted Flax Seeds', slug: 'clay-pot-roasted-flax-seeds',
        description: 'Omega-3 rich flax seeds, slow-roasted to release their nutty flavor. Great for digestion and heart health.',
        images: [], price: 24900, category: 'Clay Pot Roasted Seeds & Superfoods', foodType: 'Seeds',
        tags: ['Omega-3', 'No Maida', 'Fiber Rich'], packagingSize: '250g', stock: 60, weight: 250,
        isActive: true, isMustTry: true, isBestSeller: false, salesCount: 89,
        nutritionInfo: { calories: '534 kcal/100g', protein: '18.3g', carbs: '28.9g', fat: '42.2g', fiber: '27.3g' },
      },

      // Millet Munchies
      {
        productId: 'MLM001', title: 'Ragi Millet Chips', slug: 'ragi-millet-chips',
        description: 'Crispy chips made from finger millet (ragi) with a hint of rock salt. High in calcium and iron — the healthy alternative to potato chips.',
        images: [], price: 14900, category: 'Millet Munchies', foodType: 'Millet',
        tags: ['No Maida', 'High Calcium', 'Baked'], packagingSize: '150g', stock: 100, weight: 150,
        isActive: true, isMustTry: true, isBestSeller: true, salesCount: 210,
        nutritionInfo: { calories: '328 kcal/100g', protein: '7.3g', carbs: '72g', fat: '1.3g', fiber: '3.6g' },
      },
      {
        productId: 'MLM002', title: 'Jowar Puffs - Tangy Tomato', slug: 'jowar-puffs-tangy-tomato',
        description: 'Light and airy puffs made from sorghum (jowar) with a tangy tomato seasoning. Zero oil, 100% baked.',
        images: [], price: 9900, category: 'Millet Munchies', foodType: 'Millet',
        tags: ['No Maida', 'Zero Oil', 'Baked'], packagingSize: '100g', stock: 120, weight: 100,
        isActive: true, isMustTry: false, isBestSeller: false, salesCount: 156,
        nutritionInfo: { calories: '329 kcal/100g', protein: '10.4g', carbs: '72.6g', fat: '1.9g', fiber: '4.3g' },
      },
      {
        productId: 'MLM003', title: 'Bajra Namkeen Mix', slug: 'bajra-namkeen-mix',
        description: 'Traditional namkeen snack mix made with pearl millet (bajra), peanuts, and aromatic spices. Perfect teatime companion.',
        images: [], price: 12900, category: 'Millet Munchies', foodType: 'Millet',
        tags: ['No Maida', 'Traditional', 'Protein Rich'], packagingSize: '200g', stock: 70, weight: 200,
        isActive: true, isMustTry: false, isBestSeller: false, salesCount: 78,
      },

      // Trail Mixes
      {
        productId: 'TRM001', title: 'Super Seeds Trail Mix', slug: 'super-seeds-trail-mix',
        description: 'A powerhouse blend of pumpkin seeds, sunflower seeds, flax seeds, chia seeds, and dried cranberries. Your daily dose of omega-3 and antioxidants.',
        images: [], price: 34900, category: 'Trail Mixes', foodType: 'Mix',
        tags: ['Omega-3', 'Antioxidant', 'No Sugar'], packagingSize: '300g', stock: 45, weight: 300,
        isActive: true, isMustTry: true, isBestSeller: true, salesCount: 175,
        nutritionInfo: { calories: '520 kcal/100g', protein: '22g', carbs: '18g', fat: '40g', fiber: '12g' },
      },
      {
        productId: 'TRM002', title: 'Nutty Energy Trail Mix', slug: 'nutty-energy-trail-mix',
        description: 'Premium almonds, cashews, walnuts, and raisins mixed with dark chocolate nibs. Natural energy for your active lifestyle.',
        images: [], price: 44900, category: 'Trail Mixes', foodType: 'Nuts',
        tags: ['High Energy', 'Dark Chocolate', 'Premium'], packagingSize: '300g', stock: 35, weight: 300,
        isActive: true, isMustTry: false, isBestSeller: false, salesCount: 92, isSpecialItem: true,
      },

      // Healthy Cookies
      {
        productId: 'HCK001', title: 'Ragi Chocolate Cookies', slug: 'ragi-chocolate-cookies',
        description: 'Guilt-free cookies made with ragi flour and cocoa, sweetened with jaggery. Crispy outside, soft inside — just like grandma used to make.',
        images: [], price: 19900, category: 'Healthy Cookies', foodType: 'Cookies',
        tags: ['No Maida', 'Jaggery', 'Chocolate'], packagingSize: '200g', stock: 90, weight: 200,
        isActive: true, isMustTry: true, isBestSeller: true, salesCount: 245,
        nutritionInfo: { calories: '420 kcal/100g', protein: '8g', carbs: '58g', fat: '18g', fiber: '4g' },
      },
      {
        productId: 'HCK002', title: 'Oats & Cranberry Cookies', slug: 'oats-cranberry-cookies',
        description: 'Wholesome cookies loaded with rolled oats, dried cranberries, and honey. A delicious way to get your daily fiber.',
        images: [], price: 22900, category: 'Healthy Cookies', foodType: 'Cookies',
        tags: ['No Maida', 'Honey', 'Fiber Rich'], packagingSize: '200g', stock: 65, weight: 200,
        isActive: true, isMustTry: false, isBestSeller: false, salesCount: 134,
      },

      // Protein Bars
      {
        productId: 'PRB001', title: 'Peanut Butter Protein Bar', slug: 'peanut-butter-protein-bar',
        description: 'Plant-based protein bar with peanut butter, oats, and dates. 15g protein per bar. No whey, no soy — just real food.',
        images: [], price: 9900, category: 'Protein Bars', foodType: 'Bars',
        tags: ['High Protein', 'Plant Based', 'No Sugar'], packagingSize: '60g', stock: 150, weight: 60,
        isActive: true, isMustTry: true, isBestSeller: false, salesCount: 198,
        nutritionInfo: { calories: '220 kcal', protein: '15g', carbs: '22g', fat: '10g', fiber: '3g' },
      },
      {
        productId: 'PRB002', title: 'Almond & Date Protein Bar', slug: 'almond-date-protein-bar',
        description: 'Crunchy almonds and sweet Medjool dates in a chewy protein bar. Natural sweetness, zero added sugar.',
        images: [], price: 12900, category: 'Protein Bars', foodType: 'Bars',
        tags: ['High Protein', 'No Sugar', 'Premium'], packagingSize: '60g', stock: 100, weight: 60,
        isActive: true, isMustTry: false, isBestSeller: false, salesCount: 88, isSpecialItem: true,
      },

      // Granola
      {
        productId: 'GRN001', title: 'Millet Granola — Honey & Almond', slug: 'millet-granola-honey-almond',
        description: 'Crunchy granola made with foxtail millet, rolled oats, honey-roasted almonds, and a touch of cinnamon. Perfect for breakfast bowls.',
        images: [], price: 39900, category: 'Granola', foodType: 'Mix',
        tags: ['No Maida', 'Millet', 'Breakfast'], packagingSize: '400g', stock: 40, weight: 400,
        isActive: true, isMustTry: true, isBestSeller: true, salesCount: 167,
        nutritionInfo: { calories: '410 kcal/100g', protein: '10g', carbs: '62g', fat: '14g', fiber: '7g' },
      },
      {
        productId: 'GRN002', title: 'Dark Chocolate Granola', slug: 'dark-chocolate-granola',
        description: 'Decadent granola clusters with 70% dark chocolate, coconut flakes, and mixed seeds. Your guilty pleasure, guilt-free.',
        images: [], price: 44900, category: 'Granola', foodType: 'Mix',
        tags: ['Dark Chocolate', 'No Sugar', 'Premium'], packagingSize: '400g', stock: 30, weight: 400,
        isActive: true, isMustTry: false, isBestSeller: false, salesCount: 112, isSpecialItem: true,
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
