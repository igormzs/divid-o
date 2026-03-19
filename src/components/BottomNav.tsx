'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { SquaresFour, Users, FileText, User } from '@phosphor-icons/react';
import styles from './Navigation.module.css';

export default function BottomNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const links = [
    { href: '/', icon: <SquaresFour weight="fill" /> },
    { href: '/groups', icon: <Users weight="fill" /> },
    { href: '/activity', icon: <FileText weight="fill" /> },
  ];

  return (
    <nav className={styles.bottomNav}>
      <div className={styles.bottomNavInner}>
        {links.map(link => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.bottomNavItem} ${isActive ? styles.activeBottom : ''}`}
            >
              {link.icon}
            </Link>
          );
        })}
        {mounted && (
          <button
            className={styles.bottomNavItem}
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <User weight="bold" />
          </button>
        )}
      </div>
    </nav>
  );
}
