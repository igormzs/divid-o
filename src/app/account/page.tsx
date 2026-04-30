'use client';

import { useState, useEffect } from 'react';
import { User, Bell, ShieldCheck, Diamond, SignOut, CaretRight } from '@phosphor-icons/react';
import styles from './page.module.css';
import { createTypedClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import PersonalSettingsModal from '@/components/PersonalSettingsModal';

const db = createTypedClient();

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [showPersonalSettings, setShowPersonalSettings] = useState(false);

  const loadProfile = async () => {
    const { data: { user } } = await db.auth.getUser();
    if (user) {
      const { data: profile } = await db.from('users').select('*').eq('id', user.id).single();
      setProfile({ ...user, ...profile });
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSignOut = async () => {
    await db.auth.signOut();
    router.push('/auth/login');
  };

  if (!profile) return null;

  const initials = ((profile.first_name?.[0] || '') + (profile.last_name?.[0] || '')).toUpperCase() || profile.email?.[0].toUpperCase();

  return (
    <div className={styles.container}>
      <div className={styles.profileHeader}>
        <div className={styles.avatar}>
          {profile.avatar_url ? <img src={profile.avatar_url} alt="Avatar" /> : initials}
        </div>
        <h1 className={styles.name}>{profile.first_name || 'Set your name'} {profile.last_name || ''}</h1>
        <p className={styles.email}>{profile.email}</p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Account Settings</h2>
        <div className={styles.menuList}>
          <div className={styles.menuItem} onClick={() => setShowPersonalSettings(true)} style={{ cursor: 'pointer' }}>
            <User className={styles.menuIcon} />
            <span className={styles.menuLabel}>Personal Settings</span>
            <CaretRight size={16} />
          </div>
          <div className={styles.menuItem}>
            <Bell className={styles.menuIcon} />
            <span className={styles.menuLabel}>Notifications</span>
            <span className={styles.menuValue}>On</span>
          </div>
          <div className={styles.menuItem}>
            <ShieldCheck className={styles.menuIcon} />
            <span className={styles.menuLabel}>Security</span>
            <span className={styles.menuValue}>FaceID</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Divid-o Premium</h2>
        <div className={styles.menuList}>
          <div className={styles.menuItem}>
            <Diamond className={styles.menuIcon} style={{ color: '#fbbf24' }} />
            <span className={styles.menuLabel}>Divid-o Pro</span>
            <span className={styles.proBadge}>Get Pro</span>
          </div>
        </div>
      </div>

      <button className={styles.logoutBtn} onClick={handleSignOut}>
        Log out
      </button>

      {showPersonalSettings && (
        <PersonalSettingsModal 
          profile={profile} 
          onClose={() => setShowPersonalSettings(false)} 
          onUpdate={loadProfile}
        />
      )}
    </div>
  );
}
