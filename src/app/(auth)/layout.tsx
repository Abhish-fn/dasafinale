export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: 'calc(100dvh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--beige) 0%, var(--beige-dark) 50%, var(--color-gray-50) 100%)',
        padding: 'var(--space-4)',
      }}
    >
      {children}
    </div>
  );
}
