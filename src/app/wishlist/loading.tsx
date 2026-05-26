export default function WishlistLoading() {
  return (
    <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ height: 32, width: '25%', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-8)', animation: 'pulse 2s ease-in-out infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-6)' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--color-gray-200)' }}>
            <div style={{ aspectRatio: '1', background: 'var(--color-gray-100)', animation: 'pulse 2s ease-in-out infinite' }} />
            <div style={{ padding: 'var(--space-4)' }}>
              <div style={{ height: 18, width: '70%', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-2)', animation: 'pulse 2s ease-in-out infinite' }} />
              <div style={{ height: 22, width: '35%', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-sm)', animation: 'pulse 2s ease-in-out infinite' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
