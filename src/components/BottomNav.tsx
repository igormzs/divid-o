'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Users, User, Bell, GearSix, Plus, ChartPie } from '@phosphor-icons/react';
import styles from './Navigation.module.css';

export default function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const links = [
    { label: 'Friends', href: '/', icon: <User weight={pathname === '/' ? 'fill' : 'regular'} /> },
    { label: 'Groups', href: '/groups', icon: <Users weight={pathname.startsWith('/groups') ? 'fill' : 'regular'} /> },
    { label: 'Activity', href: '/activity', icon: <Bell weight={pathname === '/activity' ? 'fill' : 'regular'} /> },
    { label: 'Account', href: '/account', icon: <GearSix weight={pathname === '/account' ? 'fill' : 'regular'} /> },
  ];

  if (!mounted) return null;

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <div className={styles.fabContainer}>
        <button 
          className={styles.fab} 
          onClick={() => window.dispatchEvent(new CustomEvent('open-expense-modal'))}
          title="Add expense"
        >
          <Plus weight="bold" />
        </button>
      </div>

      <nav className={styles.bottomNav}>
        <div className={styles.bottomNavInner}>
          {links.map(link => {
            const isActive = pathname === link.href || (link.href === '/groups' && pathname.startsWith('/groups'));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.bottomNavItem} ${isActive ? styles.activeBottom : ''}`}
                title={link.label}
              >
                {link.icon}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
