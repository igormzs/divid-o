'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Bell, 
  ShieldCheck, 
  SignOut, 
  CaretRight, 
  IdentificationCard, 
  Camera, 
  Upload, 
  Coins, 
  X,
  Image as ImageIcon
} from '@phosphor-icons/react';
import styles from './page.module.css';
import { createTypedClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const db = createTypedClient();

export default function AccountPage() {
  const router = useRouter();
  const { profile, isLoading, refresh } = useAuth();
  
  // State for form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [isSaving, setIsSaving] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form fields when profile is loaded
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setUsername(profile.username || '');
      setAvatarUrl(profile.avatar_url || '');
      setCurrency(profile.preferred_currency || 'USD');
    }
  }, [profile]);

  const handleSignOut = async () => {
    await db.auth.signOut();
    router.push('/auth/login');
  };

  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 300, height: 300, facingMode: 'user' } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      toast.error('Could not access camera');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 300, 300);
        canvasRef.current.toBlob(async (blob) => {
          if (blob) {
            await handleImageUpload(blob);
          }
        }, 'image/jpeg', 0.8);
        stopCamera();
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleImageUpload(file);
    }
  };

  const handleImageUpload = async (fileOrBlob: File | Blob) => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const fileExt = 'jpg';
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const { data, error } = await db.storage
        .from('avatars')
        .upload(fileName, fileOrBlob);

      if (error) throw error;

      const { data: { publicUrl } } = db.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      toast.success('Photo uploaded!');
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    try {
      const { error } = await db
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
          username: username,
          avatar_url: avatarUrl,
          preferred_currency: currency
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Settings saved successfully!');
      await refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <div className={styles.container}>
        <div className={styles.profileHeader}>
          <div className={`${styles.avatar} skeleton`} />
          <div className={styles.profileInfo} style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: '24px', width: '150px', marginBottom: '8px' }} />
            <div className="skeleton" style={{ height: '16px', width: '200px' }} />
          </div>
        </div>
        <div className={styles.form}>
          {[1, 2, 3].map(i => (
            <div key={i} className={styles.section}>
              <div className="skeleton" style={{ height: '14px', width: '120px', marginBottom: '12px' }} />
              <div className={`${styles.formCard} skeleton`} style={{ height: '120px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const initials = ((profile.first_name?.[0] || '') + (profile.last_name?.[0] || '')).toUpperCase() || profile.email?.[0].toUpperCase();

  return (
    <div className={styles.container}>
      <div className={styles.profileHeader}>
        <div className={styles.avatarWrapper}>
          <button 
            type="button" 
            className={`unstyled-btn ${styles.avatarBtn}`}
            onClick={() => { setCameraActive(false); startCamera(); }}
            aria-label="Change profile photo"
          >
            <div className={styles.avatar}>
              {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : initials}
              <div className={styles.avatarOverlay}>
                <Camera size={24} weight="fill" />
              </div>
            </div>
          </button>
          
          <div className={styles.avatarActions}>
            <button type="button" className={styles.miniPhotoBtn} onClick={() => fileInputRef.current?.click()} aria-label="Upload photo">
              <Upload size={16} weight="bold" />
            </button>
          </div>
        </div>

        <div className={styles.profileInfo}>
          <h1 className={styles.name}>{firstName || 'Set your name'} {lastName || ''}</h1>
          <p className={styles.email}>{profile.email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className={styles.form}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Personal Information</h2>
          <div className={styles.formCard}>
            <div className={styles.nameRow}>
              <div className={styles.inputGroup}>
                <label htmlFor="settings-firstname" className={styles.label}>
                  First Name
                </label>
                <input
                  id="settings-firstname"
                  type="text"
                  className={styles.input}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="settings-lastname" className={styles.label}>
                  Last Name
                </label>
                <input
                  id="settings-lastname"
                  type="text"
                  className={styles.input}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div style={{ height: '20px' }} />

            <div className={styles.inputGroup}>
              <label htmlFor="settings-username" className={styles.label}>
                Username
              </label>
              <div className={styles.usernameWrapper}>
                <span className={styles.atSymbol}>@</span>
                <input
                  id="settings-username"
                  type="text"
                  className={styles.inputWithPrefix}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                />
              </div>
            </div>
          </div>
        </div>

        {cameraActive && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Camera</h2>
            <div className={styles.formCard}>
              <div className={styles.cameraContainer}>
                <video ref={videoRef} autoPlay playsInline className={styles.cameraFeed} />
                <button type="button" onClick={capturePhoto} className={styles.captureBtn} aria-label="Capture" />
                <button type="button" onClick={stopCamera} className={styles.closeCameraBtn}>
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Preferences</h2>
          <div className={styles.formCard}>
            <div className={styles.inputGroup}>
              <label htmlFor="settings-currency" className={styles.label}>
                Preferred Currency
              </label>
              <select
                id="settings-currency"
                className={styles.select}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="BRL">BRL (R$)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="CAD">CAD ($)</option>
              </select>
            </div>
          </div>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          style={{ display: 'none' }} 
        />
        <canvas ref={canvasRef} width="300" height="300" style={{ display: 'none' }} />

        <button type="submit" className={styles.saveChangesBtn} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      <button className={styles.logoutBtn} onClick={handleSignOut}>
        <SignOut size={20} weight="bold" />
        Log out
      </button>
    </div>
  );
}
