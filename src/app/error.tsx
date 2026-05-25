'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100dvh - 64px)',
        padding: 'var(--space-8)',
        textAlign: 'center',
      }}
    >
      <span style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>⚠️</span>
      <h2
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 600,
          color: 'var(--color-gray-900)',
          marginBottom: 'var(--space-3)',
        }}
      >
        Something went wrong
      </h2>
      <p
        style={{
          fontSize: 'var(--text-base)',
          color: 'var(--color-gray-500)',
          marginBottom: 'var(--space-2)',
          maxWidth: '400px',
        }}
      >
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      {error.digest && (
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-gray-400)',
            marginBottom: 'var(--space-6)',
          }}
        >
          Error ID: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-3) var(--space-8)',
          fontFamily: 'var(--font-heading)',
          fontWeight: 600,
          fontSize: 'var(--text-base)',
          color: 'white',
          background: 'linear-gradient(135deg, var(--color-accent-500), var(--color-accent-600))',
          borderRadius: 'var(--radius-full)',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 200ms ease',
        }}
      >
        Try Again
      </button>
    </div>
  );
}
