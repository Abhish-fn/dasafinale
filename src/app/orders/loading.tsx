export default function OrdersLoading() {
  return (
    <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ height: 32, width: '25%', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-8)', animation: 'pulse 2s ease-in-out infinite' }} />
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ height: 120, background: 'var(--color-gray-100)', borderRadius: 'var(--radius-xl)', marginBottom: 'var(--space-4)', animation: 'pulse 2s ease-in-out infinite' }} />
      ))}
    </div>
  );
}
