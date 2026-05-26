export default function CheckoutLoading() {
  return (
    <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ height: 32, width: '20%', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-8)', animation: 'pulse 2s ease-in-out infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 'var(--space-8)' }}>
        <div>
          <div style={{ height: 24, width: '40%', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', animation: 'pulse 2s ease-in-out infinite' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            {[1, 2].map((i) => (
              <div key={i} style={{ height: 120, background: 'var(--color-gray-100)', borderRadius: 'var(--radius-xl)', animation: 'pulse 2s ease-in-out infinite' }} />
            ))}
          </div>
        </div>
        <div style={{ height: 300, background: 'var(--color-gray-100)', borderRadius: 'var(--radius-xl)', animation: 'pulse 2s ease-in-out infinite' }} />
      </div>
    </div>
  );
}
