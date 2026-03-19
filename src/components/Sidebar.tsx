'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  SquaresFour, 
  Users, 
  ChartPieSlice, 
  UserPlus, 
  GearSix, 
  SignOut, 
  Moon, 
  Sun,
  Cube
} from '@phosphor-icons/react';
import styles from './Navigation.module.css';

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const links = [
    { href: '/', label: 'Dashboard', icon: <SquaresFour weight="fill" /> },
    { href: '/groups', label: 'Groups', icon: <Users weight="fill" /> },
    { href: '/activity', label: 'Activity', icon: <ChartPieSlice weight="fill" /> },
    { href: '/friends', label: 'Friends', icon: <UserPlus weight="fill" /> },
    { href: '/settings', label: 'Settings', icon: <GearSix weight="fill" /> },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.logoIcon}><Cube weight="fill" /></div>
        <h2>Divid-o</h2>
      </div>

      <div className={styles.profile}>
        <div className={styles.avatar}>IM</div>
        <div className={styles.profileInfo}>
          <p>Welcome Back,</p>
          <h3>Igor Menezes</h3>
        </div>
      </div>

      <nav className={styles.nav}>
        {links.map(link => {
          const isActive = pathname === link.href;
          return (
            <Link 
              key={link.href} 
              href={link.href} 
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.icon}>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.logout}>
        {mounted && (
          <button className={styles.logoutBtn} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <span className={styles.icon}>{theme === 'dark' ? <Sun weight="fill" /> : <Moon weight="fill" />}</span>
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        )}
        <button className={styles.logoutBtn} onClick={async () => {
          const supabase = createClient();
          await supabase.auth.signOut();
          window.location.href = '/login';
        }}>
          <span className={styles.icon}><SignOut weight="bold" /></span>
          Log out
        </button>
      </div>
    </aside>
  );
}
