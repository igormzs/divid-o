'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SquaresFour, Users, ChartPieSlice, UserPlus, GearSix } from '@phosphor-icons/react';
import styles from './Navigation.module.css';

export default function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const links = [
    { href: '/', icon: <SquaresFour weight="fill" /> },
    { href: '/groups', icon: <Users weight="fill" /> },
    { href: '/activity', icon: <ChartPieSlice weight="fill" /> },
    { href: '/friends', icon: <UserPlus weight="fill" /> },
    { href: '/settings', icon: <GearSix weight="fill" /> },
  ];

  if (!mounted) return null;

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
      </div>
    </nav>
  );
}
