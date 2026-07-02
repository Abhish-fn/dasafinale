import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about www.DasaDinusulu.com — rooted in the rich culinary traditions of Andhra Pradesh, bringing you ten treasured snacks crafted with love and purity.',
};

const values = [
  { emoji: '🌿', title: '100% Natural', desc: 'No artificial colors, preservatives, or chemicals. Pure goodness in every bite.' },
  { emoji: '🏠', title: 'Homemade Style', desc: 'Traditional recipes passed down through generations of Andhra heritage.' },
  { emoji: '✅', title: 'Quality Tested', desc: 'Every batch tested for purity, freshness, and exceptional taste.' },
  { emoji: '🚚', title: 'Fast Delivery', desc: 'Fresh products delivered to your doorstep quickly and carefully.' },
  { emoji: '🤝', title: 'Heritage Recipes', desc: 'We preserve the culinary wisdom of Andhra Pradesh in every product we make.' },
  { emoji: '♻️', title: 'Sustainable Packaging', desc: 'Our packaging is designed to minimize waste and our carbon footprint.' },
];

const milestones = [
  { year: '2023', event: 'Founded with a mission to bring Andhra\'s finest snacks to every home' },
  { year: '2024', event: 'Launched our first range of dry fruit laddus and roasted snacks' },
  { year: '2025', event: 'Expanded to 30+ products across multiple categories' },
  { year: '2026', event: 'Serving customers across India with free delivery' },
];

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: 'var(--space-12) var(--space-4)' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-16)' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--red)', background: 'rgba(198, 40, 40,0.08)', padding: '4px 16px', borderRadius: 'var(--radius-full)' }}>Our Story</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: 'var(--red)', marginTop: 'var(--space-4)', lineHeight: 1.1 }}>
          <span className="brand-subtle">www.</span>DasaDinusulu<span className="brand-subtle">.com</span><br />
          <span style={{ color: 'var(--gold)' }}>Ten Traditional Treasures.</span>
        </h1>
        <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-gray-500)', maxWidth: 600, margin: 'var(--space-4) auto 0', lineHeight: 'var(--leading-relaxed)' }}>
          Rooted in the rich culinary traditions of Andhra Pradesh, <span className="brand-subtle">www.</span>DasaDinusulu<span className="brand-subtle">.com</span> brings you ten treasured snacks
          crafted with love, purity, and the finest natural ingredients. From wholesome dry fruit laddus to
          crunchy roasted seeds, each product is a celebration of health and heritage.
        </p>
      </div>

      {/* Values Grid */}
      <div style={{ marginBottom: 'var(--space-16)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 900, textAlign: 'center', marginBottom: 'var(--space-8)', color: 'var(--red)' }}>What We Stand For</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
          {values.map((v) => (
            <div key={v.title} style={{ padding: 'var(--space-6)', background: 'var(--cream-dark)', borderRadius: 'var(--radius-xl)', transition: 'transform 0.2s ease', border: '1px solid rgba(198, 40, 40,0.06)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>{v.emoji}</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--red)', marginBottom: 'var(--space-2)' }}>{v.title}</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', lineHeight: 'var(--leading-relaxed)' }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ marginBottom: 'var(--space-16)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 900, textAlign: 'center', marginBottom: 'var(--space-8)', color: 'var(--red)' }}>Our Journey</h2>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {milestones.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
              <div style={{ width: 60, flexShrink: 0, fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'var(--text-lg)', color: 'var(--red)' }}>{m.year}</div>
              <div style={{ flex: 1, padding: 'var(--space-4)', background: 'var(--cream-dark)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)', color: 'var(--color-gray-700)', borderLeft: '3px solid var(--gold)' }}>
                {m.event}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', padding: 'var(--space-12)', background: 'linear-gradient(135deg, rgba(198, 40, 40,0.05), rgba(255, 179, 0,0.08))', borderRadius: 'var(--radius-xl)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 900, marginBottom: 'var(--space-3)', color: 'var(--red)' }}>Ready to taste tradition?</h2>
        <p style={{ color: 'var(--color-gray-600)', marginBottom: 'var(--space-6)' }}>Explore our collection and taste the difference.</p>
        <Link href="/products" style={{ display: 'inline-block', padding: 'var(--space-3) var(--space-8)', fontWeight: 700, color: 'var(--red-dark)', background: 'linear-gradient(135deg, var(--gold-light), var(--gold))', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-base)' }}>
          Shop Now →
        </Link>
      </div>
    </div>
  );
}
