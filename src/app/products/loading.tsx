import styles from './products.module.css';

export default function ProductsLoading() {
  return (
    <>
      <section className={styles.pageHeader}>
        <div className={styles.headerContainer}>
          <div style={{ height: '2rem', width: '200px', background: 'var(--color-gray-200)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-2)' }} />
          <div style={{ height: '1.2rem', width: '400px', background: 'var(--color-gray-200)', borderRadius: 'var(--radius-md)' }} />
        </div>
      </section>
      <div className={styles.content}>
        <aside style={{ height: '400px', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-xl)', animation: 'pulse 2s ease-in-out infinite' }} />
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ height: '320px', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-xl)', animation: 'pulse 2s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    </>
  );
}
