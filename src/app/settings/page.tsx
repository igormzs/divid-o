'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import LoginModal from "@/components/LoginModal";
import { createTypedClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Camera, SpinnerGap } from '@phosphor-icons/react';

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authUser, setAuthUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const db = createTypedClient();

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await db.auth.getUser();
      if (!user) {
        setAuthUser(null);
        setIsInitializing(false);
        setIsLoading(false);
        return;
      }
      setAuthUser(user);
      setIsInitializing(false);
      setUserId(user.id);
      setEmail(user.email ?? '');

      const { data: profile } = await db
        .from('users')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setFirstName(profile.first_name ?? '');
        setLastName(profile.last_name ?? '');
        setAvatarUrl(profile.avatar_url ?? '');
      }
      setIsLoading(false);
    }
    loadProfile();
  }, [db]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setIsSaving(true);

    try {
      // 1. Update Profile in public.users
      const { error: profileErr } = await db
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
          avatar_url: avatarUrl || null,
        })
        .eq('id', userId);

      if (profileErr) throw profileErr;

      // 2. Update Auth (Email and Password if changed)
      const updates: { email?: string; password?: string; data: { full_name: string; first_name: string } } = {
        data: {
          full_name: `${firstName} ${lastName}`.trim(),
          first_name: firstName,
        }
      };
      
      let updatingAuth = false;
      if (email && email !== (await db.auth.getUser()).data.user?.email) {
        updates.email = email;
        updatingAuth = true;
      }
      if (password) {
        updates.password = password;
        updatingAuth = true;
      }

      if (updatingAuth || updates.data) {
        const { error: authErr } = await db.auth.updateUser(updates);
        if (authErr && authErr.message.includes('email')) {
          toast.error("Error updating email. (It may require confirmation).");
        } else if (authErr) {
          throw authErr;
        }
      }

      setPassword(''); // Clear password field after successful update
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      console.error('Save settings error:', err);
      toast.error('Failed to save settings: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = () => {
    return ((firstName?.[0] || '?') + (lastName?.[0] || '')).toUpperCase();
  };

  if (isLoading) {
    return <div style={{ padding: '2rem' }}>Loading settings...</div>;
  }

  return (
    <>
    {(!authUser && !isInitializing) && <LoginModal />}
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Update your personal profile and preferences</p>
      </header>

      <div className={styles.card}>
        {isLoading && (
          <div className={styles.loadingOverlay}>
            <SpinnerGap className={styles.spinner} weight="bold" />
            <p>Loading your profile...</p>
          </div>
        )}
        <form onSubmit={handleSave} style={{ opacity: isLoading ? 0.5 : 1, pointerEvents: isLoading ? 'none' : 'auto' }}>
          <div className={styles.avatarSection}>
            <div className={styles.avatar}>
              {avatarUrl && <img src={avatarUrl} alt="Avatar" />}
              <span className={styles.avatarInitials}>{getInitials()}</span>
            </div>
            <div className={styles.avatarActions}>
              <label className={styles.changeAvatarBtn} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera weight="bold" size={20} />
                <span>Upload Photo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="user"
                  style={{ display: 'none' }} 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setAvatarUrl(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>First Name</label>
              <input 
                type="text" 
                className={styles.input} 
                value={firstName} 
                onChange={e => setFirstName(e.target.value)} 
                required 
              />
            </div>
            <div className={styles.formGroup}>
              <label>Last Name</label>
              <input 
                type="text" 
                className={styles.input} 
                value={lastName} 
                onChange={e => setLastName(e.target.value)} 
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Email Address</label>
            <input 
              type="email" 
              className={styles.input} 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className={styles.divider} />

          <div className={styles.formGroup}>
            <label>New Password (Optional)</label>
            <input 
              type="password" 
              className={styles.input} 
              placeholder="Leave blank to keep current password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
          </div>

          <button type="submit" className={styles.saveBtn} disabled={isSaving}>
            {isSaving ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
    </>
  );
}
