export default function CartLoading() {
  return (
    <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ height: 32, width: '20%', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-8)', animation: 'pulse 2s ease-in-out infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-8)' }}>
        <div>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-4) 0', borderBottom: '1px solid var(--color-gray-100)' }}>
              <div style={{ width: 80, height: 80, background: 'var(--color-gray-100)', borderRadius: 'var(--radius-lg)', animation: 'pulse 2s ease-in-out infinite' }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 16, width: '60%', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-2)', animation: 'pulse 2s ease-in-out infinite' }} />
                <div style={{ height: 14, width: '30%', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-sm)', animation: 'pulse 2s ease-in-out infinite' }} />
              </div>
              <div style={{ height: 20, width: 60, background: 'var(--color-gray-100)', borderRadius: 'var(--radius-sm)', animation: 'pulse 2s ease-in-out infinite' }} />
            </div>
          ))}
        </div>
        <div style={{ height: 200, background: 'var(--color-gray-100)', borderRadius: 'var(--radius-xl)', animation: 'pulse 2s ease-in-out infinite' }} />
      </div>
    </div>
  );
}
