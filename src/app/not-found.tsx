import Link from 'next/link';

export default function NotFound() {
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
      <span style={{ fontSize: '6rem', marginBottom: 'var(--space-4)' }}>🍪</span>
      <h1
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--text-6xl)',
          fontWeight: 800,
          color: 'var(--maroon)',
          marginBottom: 'var(--space-4)',
          lineHeight: 1,
        }}
      >
        404
      </h1>
      <h2
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 600,
          color: 'var(--maroon)',
          marginBottom: 'var(--space-3)',
        }}
      >
        Oops! This snack got eaten
      </h2>
      <p
        style={{
          fontSize: 'var(--text-lg)',
          color: 'var(--color-gray-500)',
          marginBottom: 'var(--space-8)',
          maxWidth: '400px',
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-3) var(--space-8)',
          fontFamily: 'var(--font-heading)',
          fontWeight: 600,
          fontSize: 'var(--text-base)',
          color: 'white',
          background: 'linear-gradient(135deg, var(--maroon), var(--maroon-dark))',
          borderRadius: 'var(--radius-full)',
          transition: 'all 200ms ease',
        }}
      >
        ← Go Home
      </Link>
    </div>
  );
}
