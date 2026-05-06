'use client';

import React, { useState } from 'react';
import { createTypedClient } from '@/utils/supabase/client';
import { MagnifyingGlass, UserPlus, X, CheckCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import styles from './MemberSearch.module.css';

interface MemberSearchProps {
  groupId: string;
  onMemberAdded: () => void;
  existingMemberIds: string[];
}

export default function MemberSearch({ groupId, onMemberAdded, existingMemberIds }: MemberSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const db = createTypedClient();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.length < 3) return;

    setIsSearching(true);
    try {
      const { data, error } = await db
        .from('users')
        .select('id, email, first_name, last_name, avatar_url')
        .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(5);

      if (error) throw error;
      setResults(data || []);
    } catch (err: any) {
      toast.error('Search error: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const addMember = async (userId: string) => {
    try {
      const { error } = await db
        .from('group_members')
        .insert({ group_id: groupId, user_id: userId });

      if (error) throw error;

      toast.success('Member added!');
      setQuery('');
      setResults([]);
      onMemberAdded();
    } catch (err: any) {
      toast.error('Could not add member: ' + err.message);
    }
  };

  const createGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const guestId = crypto.randomUUID();
      // 1. Create the guest user
      const { error: userError } = await db
        .from('users')
        .insert({
          id: guestId,
          first_name: query.trim(),
          is_guest: true,
          email: null
        });

      if (userError) throw userError;

      // 2. Add to group
      const { error: memberError } = await db
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: guestId
        });

      if (memberError) throw memberError;

      toast.success(`${query} added as guest!`);
      setQuery('');
      setResults([]);
      onMemberAdded();
    } catch (err: any) {
      toast.error('Could not create guest: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSearch} className={styles.searchForm}>
        <div className={styles.inputWrapper}>
          <MagnifyingGlass className={styles.searchIcon} aria-hidden="true" />
          <input 
            type="text" 
            placeholder="Search by email or name..." 
            aria-label="Search by email or name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.input}
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); setResults([]); }} className={styles.clearBtn} aria-label="Clear search">
              <X aria-hidden="true" />
            </button>
          )}
        </div>
        <div className={styles.buttonGroup}>
          <button type="submit" className={styles.searchBtn} disabled={isSearching || query.length < 3}>
            {isSearching && results.length === 0 ? '...' : 'Search'}
          </button>
        </div>
      </form>

      {query.length > 0 && results.length === 0 && !isSearching && (
        <div className={styles.noResults}>
          <p>No users found matching "{query}"</p>
          <button onClick={createGuest} className={styles.guestBtn}>
            <UserPlus weight="bold" /> Add "{query}" as guest
          </button>
        </div>
      )}

      {results.length > 0 && (
        <>
          <ul className={styles.resultsList}>
            {results.map((user) => {
              const isAlreadyIn = existingMemberIds.includes(user.id);
              return (
                <li key={user.id} className={styles.resultItem}>
                  <div className={styles.userInfo}>
                    <div className={styles.avatar}>
                      {user.avatar_url ? <img src={user.avatar_url} alt="" /> : <div className={styles.avatarPlaceholder}>{user.first_name?.[0] || '?'}</div>}
                    </div>
                    <div className={styles.details}>
                      <span className={styles.name}>{user.first_name} {user.last_name}</span>
                      <span className={styles.email}>{user.email}</span>
                    </div>
                  </div>
                  {isAlreadyIn ? (
                    <span className={styles.alreadyIn}><CheckCircle weight="fill" /></span>
                  ) : (
                    <button onClick={() => addMember(user.id)} className={styles.addBtn} aria-label={`Add ${user.first_name}`}>
                      <UserPlus weight="bold" aria-hidden="true" /> Add
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <div className={styles.guestFooter}>
            <span>Can't find them?</span>
            <button onClick={createGuest} className={styles.guestLink}>Add "{query}" as guest instead</button>
          </div>
        </>
      )}
    </div>
  );
}
