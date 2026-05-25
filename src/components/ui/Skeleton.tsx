import { cn } from '@/lib/utils';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export default function Skeleton({ width, height, borderRadius, className }: SkeletonProps) {
  return (
    <div
      className={cn(styles.skeleton, className)}
      style={{ width, height, borderRadius }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={cn(styles.skeleton, styles.text, styles.textLine)} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <Skeleton width="100%" height={200} borderRadius="var(--radius-lg)" />
      <Skeleton width="70%" height={20} />
      <Skeleton width="40%" height={16} />
      <Skeleton width="30%" height={24} />
    </div>
  );
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return <div className={cn(styles.skeleton, styles.circle)} style={{ width: size, height: size }} />;
}
