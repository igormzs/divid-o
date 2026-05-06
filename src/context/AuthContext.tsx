'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { Tables } from '@/types/database';

type Profile = Tables<'users'>;

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  refresh: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: prof } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        setProfile(prof);
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Refresh profile if user changed
        if (session.user.id !== user?.id) {
          loadData();
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, refresh: loadData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
