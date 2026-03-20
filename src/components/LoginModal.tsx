'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import styles from './LoginModal.module.css';
import { GoogleLogo, Cube } from '@phosphor-icons/react';

export default function LoginModal() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');

  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
      } else {
        toast.success("Welcome back!");
        // The onAuthStateChange hook in page.tsx will pick this up and close the modal
      }
    } else {
      if (!firstName) {
        toast.error('Please enter your first name.');
        setIsLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: firstName,
          }
        }
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created! Check your email to confirm your address.", { duration: 6000 });
      }
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error('Could not authenticate with Google.');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.cube}>
            <Cube weight="fill" className={styles.cubeIcon} />
          </div>
          Divid-o
        </div>
        
        <div className={styles.tabs}>
          <button 
            type="button" 
            className={`${styles.tab} ${isLogin ? styles.activeTab : ''}`} 
            onClick={() => setIsLogin(true)}
            disabled={isLoading}
          >
            Log In
          </button>
          <button 
            type="button" 
            className={`${styles.tab} ${!isLogin ? styles.activeTab : ''}`} 
            onClick={() => setIsLogin(false)}
            disabled={isLoading}
          >
            Sign Up
          </button>
        </div>

        <form className={styles.form} onSubmit={handleAuth}>
          {!isLogin && (
            <div className={styles.inputGroup}>
              <label>First Name</label>
              <input 
                type="text" 
                placeholder="Enter your first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={styles.input}
              />
            </div>
          )}

          <div className={styles.inputGroup}>
            <label>Email address</label>
            <input 
              type="email" 
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Password</label>
            <input 
              type="password" 
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
            />
          </div>

          <button type="submit" className={styles.primaryBtn} disabled={isLoading}>
            {isLoading ? 'Connecting...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        <button onClick={handleGoogleLogin} type="button" className={styles.googleBtn} disabled={isLoading}>
          <GoogleLogo weight="bold" className={styles.icon} />
          Continue with Google
        </button>
      </div>
    </div>
  );
}
