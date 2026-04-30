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

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ first_name: string | null; last_name: string | null } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const fetchUser = async () => {
      const { data: { user: authU } } = await supabase.auth.getUser();
      if (authU) {
        const { data: profile } = await supabase.from('users').select('first_name, last_name').eq('id', authU.id).maybeSingle();
        setUser(profile);
      }
    };
    fetchUser();
  }, []);

  const links = [
    { href: '/', label: 'Friends', icon: <User weight={pathname === '/' ? 'fill' : 'regular'} /> },
    { href: '/groups', label: 'Groups', icon: <Users weight={pathname.startsWith('/groups') ? 'fill' : 'regular'} /> },
    { href: '/activity', label: 'Activity', icon: <Bell weight={pathname === '/activity' ? 'fill' : 'regular'} /> },
    { href: '/account', label: 'Account', icon: <GearSix weight={pathname === '/account' ? 'fill' : 'regular'} /> },
  ];

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
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
        <div className={styles.divider} />
        <button 
          className={styles.logoutBtn} 
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            window.location.href = '/auth/login';
          }}
        >
          <SignOut weight="bold" />
          <span className={styles.label}>Logout</span>
        </button>
      </nav>
    </aside>
  );
}
