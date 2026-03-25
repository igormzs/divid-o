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
        <div className={styles.logoIcon}>
          <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor">
            <path d="M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,120,47.65,76,128,32l80.35,44Zm8,99.64V133.83l80-43.78v85.76Z" />
          </svg>
        </div>
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
