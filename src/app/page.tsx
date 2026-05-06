'use client';

import { useState, useEffect, useCallback } from 'react';
import { MagnifyingGlass, UserPlus, X, FunnelSimple, ArrowsLeftRight } from '@phosphor-icons/react';
import styles from './page.module.css';
import { createTypedClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/types/database';
import { toCents, toDollars } from '@/lib/mathEngine';
import MemberSearch from '@/components/MemberSearch';

type UserRow = Tables<'users'>;
type GroupMemberRow = Tables<'group_members'>;
type ExpenseRow = Tables<'expenses'>;
type SettlementRow = Tables<'settlements'>;

interface FriendWithBalance {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatar_url: string | null;
  balance: number;
}

function getInitials(first: string | null, last: string | null): string {
  const f = first?.[0] ?? '?';
  const l = last?.[0] ?? '';
  return (f + l).toUpperCase();
}

const db = createTypedClient();

import { useAuth } from '@/context/AuthContext';

export default function FriendsPage() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [friends, setFriends] = useState<FriendWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);

  const loadFriends = useCallback(async () => {
    if (!authUser) return;
    setIsLoading(true);
    try {

      const { data: myMemberships } = await db.from('group_members').select('group_id').eq('user_id', authUser.id);
      const groupIds = ((myMemberships ?? []) as GroupMemberRow[]).map(r => r.group_id);
      if (groupIds.length === 0) { setFriends([]); return; }

      // Parallelize data fetching to eliminate waterfalls
      const [coMembersRes, expensesRes, settlementsRes] = await Promise.all([
        db.from('group_members')
          .select('user_id, users(*)')
          .in('group_id', groupIds)
          .neq('user_id', authUser.id),
        db.from('expenses')
          .select('*, expense_splits(*)')
          .in('group_id', groupIds),
        db.from('settlements')
          .select('*')
          .in('group_id', groupIds)
          .eq('status', 'completed')
      ]);

      const coMembers = coMembersRes.data ?? [];
      const expenses = (expensesRes.data ?? []) as (ExpenseRow & { expense_splits: any[] })[];
      const settlements = (settlementsRes.data ?? []) as SettlementRow[];

      // Unique profiles from co-members
      const profilesMap = new Map<string, UserRow>();
      coMembers.forEach((m: any) => {
        if (m.users) profilesMap.set(m.user_id, m.users as UserRow);
      });
      const profiles = Array.from(profilesMap.values());

      const friendsWithBalance: FriendWithBalance[] = ((profiles ?? []) as UserRow[]).map(profile => {
        let owedToMe = 0;
        let iOwe = 0;

        for (const expense of expenses) {
          const splits = expense.expense_splits ?? [];
          if (expense.paid_by === authUser.id) {
            const theirSplit = splits.find(s => s.user_id === profile.id);
            if (theirSplit) owedToMe += Number(theirSplit.amount_owed);
          } else if (expense.paid_by === profile.id) {
            const mySplit = splits.find(s => s.user_id === authUser.id);
            if (mySplit) iOwe += Number(mySplit.amount_owed);
          }
        }

        for (const s of (settlements ?? []) as SettlementRow[]) {
          if (s.paid_by === authUser.id && s.paid_to === profile.id) iOwe -= Number(s.amount);
          if (s.paid_by === profile.id && s.paid_to === authUser.id) owedToMe -= Number(s.amount);
        }

        const balance = toDollars(owedToMe - iOwe);

        return {
          id: profile.id,
          name: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || profile.email || 'Guest',
          email: profile.email,
          initials: getInitials(profile.first_name, profile.last_name),
          avatar_url: profile.avatar_url,
          balance,
        };
      });

      setFriends(friendsWithBalance);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  const totalBalance = friends.reduce((acc, f) => acc + f.balance, 0);

  const filtered = friends.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1>Friends</h1>
          <button className={styles.addFriendBtn} onClick={() => setShowAddFriend(true)}>
            <UserPlus size={18} />
            <span>Add Friend</span>
          </button>
        </div>
        <div className={styles.searchBar}>
          <MagnifyingGlass className={styles.searchIcon} aria-hidden="true" />
          <input 
            placeholder="Search friends..." 
            aria-label="Search friends"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <div className={styles.balanceSummary}>
        <div className={styles.summaryInfo}>
          <span className={styles.summaryLabel}>Overall balance</span>
          <h2 className={`${styles.summaryAmount} ${totalBalance > 0 ? 'text-positive' : totalBalance < 0 ? 'text-negative' : ''}`}>
            {totalBalance > 0 ? '+' : totalBalance < 0 ? '-' : ''}${Math.abs(totalBalance).toFixed(2)}
          </h2>
        </div>
        <button className={styles.filterBtn} aria-label="Filter friends"><FunnelSimple weight="bold" aria-hidden="true" /></button>
      </div>

      <div className={styles.friendsList}>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.friendItem}>
              <div className={`${styles.friendAvatar} skeleton`} />
              <div className={styles.friendDetails} style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: '18px', width: '60%', marginBottom: '8px' }} />
                <div className="skeleton" style={{ height: '14px', width: '40%' }} />
              </div>
            </div>
          ))
        ) : 
         filtered.length === 0 ? (
           <div className={styles.emptyState}>
             <p>No friends found.</p>
           </div>
         ) :
         filtered.map((friend) => (
           <div key={friend.id} className={styles.friendItem}>
             <div className={styles.friendAvatar}>
               {friend.avatar_url ? <img src={friend.avatar_url} alt="" /> : friend.initials}
             </div>
             <div className={styles.friendDetails}>
               <h3 className={styles.friendName}>{friend.name}</h3>
               <p className={styles.friendStatus}>
                 {friend.balance > 0 ? 'owes you' : friend.balance < 0 ? 'you owe' : 'settled up'}
                 {friend.balance !== 0 && <span className={friend.balance > 0 ? 'text-positive' : 'text-negative'}> ${Math.abs(friend.balance).toFixed(2)}</span>}
               </p>
             </div>
             <div className={styles.friendActions}>
               {friend.balance !== 0 && (
                 <button className={styles.settleBtn} onClick={() => toast.info('Settle Up coming soon!')}>
                   <ArrowsLeftRight weight="bold" />
                   Settle
                 </button>
               )}
             </div>
           </div>
         ))
        }
      </div>

      {showAddFriend && (
        <div className={styles.modalOverlay}>
          <div 
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-friend-title"
          >
            <div className={styles.modalHeader}>
              <h2 id="add-friend-title">Add Friend</h2>
              <button onClick={() => setShowAddFriend(false)} className={styles.closeBtn} aria-label="Close"><X size={20} aria-hidden="true" /></button>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Friends are people you share groups with. Add them to a group to start splitting!
            </p>
            {/* Note: In a real app, this might create a 1:1 group */}
            <button className={styles.primaryBtn} onClick={() => { setShowAddFriend(false); window.location.href='/groups'; }}>
              Go to Groups
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
