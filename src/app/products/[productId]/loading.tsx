export default function ProductDetailLoading() {
  return (
    <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
        <div style={{ aspectRatio: '1', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-xl)', animation: 'pulse 2s ease-in-out infinite' }} />
        <div style={{ padding: 'var(--space-4)' }}>
          <div style={{ height: 16, width: '30%', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-3)', animation: 'pulse 2s ease-in-out infinite' }} />
          <div style={{ height: 32, width: '80%', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', animation: 'pulse 2s ease-in-out infinite' }} />
          <div style={{ height: 28, width: '25%', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-6)', animation: 'pulse 2s ease-in-out infinite' }} />
          <div style={{ height: 14, width: '100%', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-2)', animation: 'pulse 2s ease-in-out infinite' }} />
          <div style={{ height: 14, width: '90%', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-2)', animation: 'pulse 2s ease-in-out infinite' }} />
          <div style={{ height: 14, width: '60%', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-8)', animation: 'pulse 2s ease-in-out infinite' }} />
          <div style={{ height: 48, width: '100%', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-lg)', animation: 'pulse 2s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  );
}
