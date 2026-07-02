'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: 'var(--space-16) var(--space-4)', textAlign: 'center' }}>
      <div style={{ fontSize: '5rem', marginBottom: 'var(--space-4)' }}>😵</div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--red)', marginBottom: 'var(--space-2)' }}>
        Something went wrong
      </h1>
      <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-6)', maxWidth: 400, margin: '0 auto var(--space-6)' }}>
        {error.message || "We're having trouble loading this page. Please try again."}
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
        <button onClick={reset} style={{ padding: 'var(--space-3) var(--space-8)', fontWeight: 600, color: 'white', background: 'var(--red)', borderRadius: 'var(--radius-full)', cursor: 'pointer' }}>
          Try Again
        </button>
        <a href="/" style={{ padding: 'var(--space-3) var(--space-8)', fontWeight: 500, color: 'var(--color-gray-600)', border: '1px solid var(--color-gray-300)', borderRadius: 'var(--radius-full)' }}>
          Go Home
        </a>
      </div>
    </div>
  );
}
