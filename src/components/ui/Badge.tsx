import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import styles from './Badge.module.css';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';
  size?: 'sm' | 'md';
  children: ReactNode;
  className?: string;
}

export default function Badge({ variant = 'neutral', size = 'sm', children, className }: BadgeProps) {
  return (
    <span className={cn(styles.badge, styles[variant], styles[size], className)}>
      {children}
    </span>
  );
}
