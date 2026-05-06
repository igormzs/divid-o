'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Users, 
  User,
  Bell, 
  GearSix, 
  SignOut, 
  Plus,
  ChartPie
} from '@phosphor-icons/react';
import styles from './Navigation.module.css';
import Logo from './Logo';

import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();

  const links = [
    { href: '/', label: 'Friends', icon: <User weight={pathname === '/' ? 'fill' : 'regular'} /> },
    { href: '/groups', label: 'Groups', icon: <Users weight={pathname.startsWith('/groups') ? 'fill' : 'regular'} /> },
    { href: '/activity', label: 'Activity', icon: <Bell weight={pathname === '/activity' ? 'fill' : 'regular'} /> },
    { href: '/account', label: 'Account', icon: <GearSix weight={pathname === '/account' ? 'fill' : 'regular'} /> },
  ];

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        <div className={styles.navLinks}>
          {links.map(link => {
            const isActive = pathname === link.href || (link.href === '/groups' && pathname.startsWith('/groups'));
            return (
              <Link 
                key={link.href} 
                href={link.href} 
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              >
                <span className={styles.icon}>{link.icon}</span>
                <span className={styles.label}>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
