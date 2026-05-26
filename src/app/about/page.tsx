import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about DasaDinusulu — our mission to make healthy snacking accessible, delicious, and sustainable.',
};

const values = [
  { emoji: '🌾', title: 'Millet First', desc: 'Every product starts with nutrient-rich millets — the ancient grain that fuels modern wellness.' },
  { emoji: '🏺', title: 'Clay Pot Roasted', desc: 'We use traditional clay pot roasting to preserve nutrition and bring out deep, earthy flavors.' },
  { emoji: '🚫', title: 'No Maida, No Refined Sugar', desc: 'We never use refined flour or white sugar. Only jaggery, honey, and natural sweeteners.' },
  { emoji: '🌿', title: 'Clean Ingredients', desc: 'Minimal processing, no preservatives, no artificial colors. Just real food, made right.' },
  { emoji: '🤝', title: 'Farmer Partnerships', desc: 'We work directly with local farmers to source the freshest millets and superfoods.' },
  { emoji: '♻️', title: 'Sustainable Packaging', desc: 'Our packaging is designed to minimize waste and our carbon footprint.' },
];

const milestones = [
  { year: '2023', event: 'Founded with a mission to reimagine Indian snacking' },
  { year: '2024', event: 'Launched our first 6 products — Seeds, Biscuits, and Snacks' },
  { year: '2025', event: 'Expanded to 30+ products across 6 categories' },
  { year: '2026', event: 'Serving customers across India with free delivery' },
];

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: 'var(--space-12) var(--space-4)' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-16)' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-primary-600)', background: 'var(--color-primary-50)', padding: '4px 16px', borderRadius: 'var(--radius-full)' }}>Our Story</span>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, color: 'var(--color-gray-900)', marginTop: 'var(--space-4)', lineHeight: 1.1 }}>
          Healthy Snacking,<br />
          <span style={{ color: 'var(--color-primary-500)' }}>Made with Love.</span>
        </h1>
        <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-gray-500)', maxWidth: 600, margin: 'var(--space-4) auto 0', lineHeight: 'var(--leading-relaxed)' }}>
          DasaDinusulu was born from a simple belief — that snacking should nourish you, not just fill you.
          We blend ancient Indian grains with modern recipes to create snacks that are as delicious as they are healthy.
        </p>
      </div>

      {/* Values Grid */}
      <div style={{ marginBottom: 'var(--space-16)' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700, textAlign: 'center', marginBottom: 'var(--space-8)' }}>What We Stand For</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
          {values.map((v) => (
            <div key={v.title} style={{ padding: 'var(--space-6)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-xl)', transition: 'transform 0.2s ease' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>{v.emoji}</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-gray-900)', marginBottom: 'var(--space-2)' }}>{v.title}</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', lineHeight: 'var(--leading-relaxed)' }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ marginBottom: 'var(--space-16)' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700, textAlign: 'center', marginBottom: 'var(--space-8)' }}>Our Journey</h2>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {milestones.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
              <div style={{ width: 60, flexShrink: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'var(--text-lg)', color: 'var(--color-primary-500)' }}>{m.year}</div>
              <div style={{ flex: 1, padding: 'var(--space-4)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)', color: 'var(--color-gray-700)', borderLeft: '3px solid var(--color-primary-200)' }}>
                {m.event}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', padding: 'var(--space-12)', background: 'linear-gradient(135deg, var(--color-primary-50), var(--color-primary-100))', borderRadius: 'var(--radius-xl)' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Ready to try?</h2>
        <p style={{ color: 'var(--color-gray-600)', marginBottom: 'var(--space-6)' }}>Explore our collection and taste the difference.</p>
        <Link href="/products" style={{ display: 'inline-block', padding: 'var(--space-3) var(--space-8)', fontWeight: 600, color: 'white', background: 'var(--color-primary-500)', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-base)' }}>
          Shop Now →
        </Link>
      </div>
    </div>
  );
}
