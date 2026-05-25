import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import styles from './Card.module.css';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export default function Card({ children, className, hover = false, padding = 'md' }: CardProps) {
  return (
    <div className={cn(styles.card, styles[padding], hover && styles.hover, className)}>
      {children}
    </div>
  );
}
