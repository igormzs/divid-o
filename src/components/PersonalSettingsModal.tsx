'use client';

import React, { useState } from 'react';
import styles from './PersonalSettingsModal.module.css';
import { X, User, Image, IdentificationCard } from '@phosphor-icons/react';
import { createTypedClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

interface PersonalSettingsModalProps {
  profile: any;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PersonalSettingsModal({ profile, onClose, onUpdate }: PersonalSettingsModalProps) {
  const db = createTypedClient();
  const [firstName, setFirstName] = useState(profile.first_name || '');
  const [lastName, setLastName] = useState(profile.last_name || '');
  const [username, setUsername] = useState(profile.username || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await db
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
          username: username,
          avatar_url: avatarUrl,
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <h2>Personal Settings</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} weight="bold" />
          </button>
        </header>

        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <User size={16} weight="bold" />
              First Name
            </label>
            <input
              type="text"
              className={styles.input}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Your first name"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <IdentificationCard size={16} weight="bold" />
              Username
            </label>
            <input
              type="text"
              className={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="choose_a_username"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <IdentificationCard size={16} weight="bold" />
              Last Name
            </label>
            <input
              type="text"
              className={styles.input}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Your last name"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <Image size={16} weight="bold" />
              Photo URL
            </label>
            <input
              type="url"
              className={styles.input}
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
            />
            {avatarUrl && (
              <div className={styles.preview}>
                <img src={avatarUrl} alt="Avatar Preview" onError={(e) => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
