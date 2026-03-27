'use client';

import { useState, useEffect, useCallback } from 'react';
import { MagnifyingGlass, EnvelopeSimple, Plus, X, Users } from '@phosphor-icons/react';
import styles from './page.module.css';
import LoginModal from "@/components/LoginModal";
import { createTypedClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/types/database';
import { toCents, toDollars } from '@/lib/centMath';

type UserRow = Tables<'users'>;
type GroupMemberRow = Tables<'group_members'>;
type ExpenseRow = Tables<'expenses'>;
type SettlementRow = Tables<'settlements'>;

interface FriendWithBalance {
  id: string;
  name: string;
  email: string;
  initials: string;
  balance: number;
}

function getInitials(first: string | null, last: string | null): string {
  const f = first?.[0] ?? '?';
  const l = last?.[0] ?? '';
  return (f + l).toUpperCase();
}

const db = createTypedClient();

export default function FriendsPage() {
  const [friends, setFriends] = useState<FriendWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Friend Modal State
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const loadFriends = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await db.auth.getUser();
      if (!user) {
        setAuthUser(null);
        setIsInitializing(false);
        setIsLoading(false);
        return;
      }
      setAuthUser(user);
      setIsInitializing(false);

      // 1. Get all groups the current user belongs to
      const { data: myMemberships } = await db
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      const groupIds = ((myMemberships ?? []) as GroupMemberRow[]).map(r => r.group_id);
      if (groupIds.length === 0) { setFriends([]); return; }

      // 2. Find all co-members (unique users in those groups, excluding self)
      const { data: coMembers } = await db
        .from('group_members')
        .select('user_id')
        .in('group_id', groupIds)
        .neq('user_id', user.id);

      const coMemberIds = [...new Set(((coMembers ?? []) as GroupMemberRow[]).map(r => r.user_id))];
      if (coMemberIds.length === 0) { setFriends([]); return; }

      // 3. Fetch their profiles
      const { data: profiles } = await db
        .from('users')
        .select('id, first_name, last_name, email, avatar_url, created_at')
        .in('id', coMemberIds);

      // 4. Fetch all expenses in shared groups
      const { data: rawExpenses } = await db
        .from('expenses')
        .select('id, group_id, paid_by, amount, expense_splits(user_id, amount_owed)')
        .in('group_id', groupIds);

      const expenses = (rawExpenses ?? []) as (ExpenseRow & { expense_splits: { user_id: string; amount_owed: number }[] | null })[];

      // 5. Fetch completed settlements
      const { data: rawSettlements } = await db
        .from('settlements')
        .select('id, group_id, paid_by, paid_to, amount, status, created_at')
        .in('group_id', groupIds)
        .eq('status', 'completed');

      const settlements = (rawSettlements ?? []) as SettlementRow[];

      // 6. Compute net balance per friend
      const friendsWithBalance: FriendWithBalance[] = ((profiles ?? []) as UserRow[]).map(profile => {
        let owedToMe = 0;
        let iOwe = 0;

        for (const expense of expenses) {
          const splits = expense.expense_splits ?? [];

          if (expense.paid_by === user.id) {
            const theirSplit = splits.find(s => s.user_id === profile.id);
            if (theirSplit) owedToMe += Number(theirSplit.amount_owed);
          } else if (expense.paid_by === profile.id) {
            const mySplit = splits.find(s => s.user_id === user.id);
            if (mySplit) iOwe += Number(mySplit.amount_owed);
          }
        }

        for (const s of settlements) {
          if (s.paid_by === user.id && s.paid_to === profile.id) iOwe -= Number(s.amount);
          if (s.paid_by === profile.id && s.paid_to === user.id) owedToMe -= Number(s.amount);
        }

        const balance = toDollars(toCents(owedToMe) - toCents(iOwe));

        return {
          id: profile.id,
          name: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || profile.email,
          email: profile.email,
          initials: getInitials(profile.first_name, profile.last_name),
          balance,
        };
      });

      friendsWithBalance.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
      setFriends(friendsWithBalance);
    } catch (err) {
      console.error('Friends load error:', err);
      toast.error('Friends Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadFriends(); }, [loadFriends]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReminder = (friend: FriendWithBalance) => {
    toast.success(`Reminder sent to ${friend.name}!`);
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendName.trim()) return;
    setIsAdding(true);

    try {
      const { data: { user } } = await db.auth.getUser();
      if (!user) return;

      const newUserId = crypto.randomUUID();
      const newEmail = newFriendEmail.trim() || `${newUserId}@ghost.divid-o.com`;

      // 1. Create Ghost User
      const { error: userErr } = await db.from('users').insert({
        id: newUserId,
        email: newEmail,
        first_name: newFriendName.trim(),
      });

      if (userErr) {
        toast.error('Failed to create user. Ensure you dropped users_id_fkey!');
        console.error(userErr);
        setIsAdding(false);
        return;
      }

      // 2. Create a generic "Friend" group to link them
      const { data: group, error: groupErr } = await db.from('groups').insert({
        name: `Expenses with ${newFriendName.trim()}`,
        description: '1-on-1 expenses',
        created_by: user.id,
      }).select().single();

      if (groupErr || !group) {
        toast.error('User created, but failed to create linking group.');
        setIsAdding(false);
        return;
      }

      // 3. Add both to group
      await db.from('group_members').insert([
        { group_id: group.id, user_id: user.id },
        { group_id: group.id, user_id: newUserId }
      ]);

      toast.success(`${newFriendName} added to your friends list!`);
      setShowAddFriend(false);
      setNewFriendName('');
      setNewFriendEmail('');
      await loadFriends();
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('users_id_fkey')) {
        toast.error('Database configuration error: Please run the SQL fix script to support adding friends without accounts.');
      } else {
        toast.error(err.message || 'Error adding friend');
      }
    } finally {
      setIsAdding(false);
    }
  };


  const filtered = friends.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
    {(!authUser && !isInitializing) && <LoginModal />}
    
    {showAddFriend && (
      <div className={styles.modalOverlay}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <h2>Add Friend</h2>
            <button onClick={() => setShowAddFriend(false)} className={styles.closeBtn}><X weight="bold" /></button>
          </div>
          <form onSubmit={handleAddFriend} className={styles.modalForm}>
            <div className={styles.modalField}>
              <label>Name or Username *</label>
              <input
                type="text"
                className={styles.modalInput}
                placeholder="e.g. John Doe"
                value={newFriendName}
                onChange={e => setNewFriendName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className={styles.modalField}>
              <label>Email (optional)</label>
              <input
                type="email"
                className={styles.modalInput}
                placeholder="john@example.com"
                value={newFriendEmail}
                onChange={e => setNewFriendEmail(e.target.value)}
              />
            </div>
            <button type="submit" className={styles.createBtn} disabled={isAdding || !newFriendName.trim()}>
              {isAdding ? 'Adding…' : 'Add Friend'}
            </button>
          </form>
        </div>
      </div>
    )}

    <div className={styles.container}>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Friends</h1>
          <p className={styles.subtitle}>People you share expenses with</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.searchBar}>
            <span className={styles.searchIcon}><MagnifyingGlass weight="bold" /></span>
            <input
              type="text"
              placeholder="Search friends"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button className={styles.addFriendBtn} onClick={() => setShowAddFriend(true)}>
            <Plus weight="bold" /> Add Friend
          </button>
        </div>
      </header>

      <div className={styles.friendsList}>
        {isLoading && <p style={{ opacity: 0.6 }}>Loading…</p>}
        {!isLoading && filtered.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Users weight="thin" size={80} />
            </div>
            <h2>No friends found</h2>
            <p>{searchQuery ? 'No friends match your search.' : "Your friends list is empty. Add people you share expenses with to get started!"}</p>
            {!searchQuery && (
              <button className={styles.emptyActionBtn} onClick={() => setShowAddFriend(true)}>
                <Plus weight="bold" /> Add Your First Friend
              </button>
            )}
          </div>
        )}
        {filtered.map((friend) => (
          <div key={friend.id} className={styles.friendCard}>
            <div className={styles.friendInfo}>
              <div className={styles.avatar}>
                {friend.initials}
              </div>
              <div className={styles.details}>
                <h3 className={styles.name}>{friend.name}</h3>
                <p className={styles.email}>{friend.email}</p>
              </div>
            </div>

            <div className={styles.friendStats}>
              <div className={styles.balanceCol}>
                <span className={styles.label}>Settlement Balance</span>
                <span className={`${styles.amount} ${friend.balance > 0 ? styles.positive : friend.balance < 0 ? styles.negative : styles.neutral}`}>
                  {friend.balance > 0
                    ? `Owes you $${friend.balance.toFixed(2)}`
                    : friend.balance < 0
                    ? `You owe $${Math.abs(friend.balance).toFixed(2)}`
                    : 'Settled up'}
                </span>
              </div>
              
              {friend.balance !== 0 && (
                <button
                  className={styles.messageBtn}
                  title="Send Reminder"
                  onClick={() => handleReminder(friend)}
                >
                  <EnvelopeSimple weight="fill" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
