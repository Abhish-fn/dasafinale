'use client';

import { useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import styles from './MobileMenu.module.css';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuLinks = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/products', label: 'Products', icon: '🛍️' },
  { href: '/cart', label: 'Cart', icon: '🛒' },
  { href: '/wishlist', label: 'Wishlist', icon: '❤️' },
  { href: '/orders', label: 'My Orders', icon: '📦' },
  { href: '/account', label: 'My Account', icon: '👤' },
];

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.brand}>
            <span className={styles.brandMonogram}>DD</span> Dasa Dinusulu
          </span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className={styles.links}>
          {menuLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(styles.link, pathname === link.href && styles.linkActive)}
              onClick={onClose}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.footer}>
          {session?.user ? (
            <>
              <div className={styles.userInfo}>
                {session.user.image ? (
                  <Image src={session.user.image} alt="" width={40} height={40} className={styles.userAvatar} />
                ) : (
                  <span className={styles.userAvatarPlaceholder}>
                    {session.user.name?.charAt(0) || 'U'}
                  </span>
                )}
                <div className={styles.userDetails}>
                  <span className={styles.userNameText}>{session.user.name}</span>
                  <span className={styles.userEmail}>{session.user.email}</span>
                </div>
              </div>
              <button className={styles.signOutBtn} onClick={() => { signOut(); onClose(); }}>
                Sign Out
              </button>
            </>
          ) : (
            <Link href="/login" className={styles.signInBtnMobile} onClick={onClose}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
