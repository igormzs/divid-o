'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, X, MagnifyingGlass, FunnelSimple, CaretRight } from '@phosphor-icons/react';
import styles from './page.module.css';
import Link from 'next/link';
import { createTypedClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/types/database';
import { toCents, toDollars } from '@/lib/mathEngine';

type Group = Tables<'groups'>;
type GroupMemberRow = Tables<'group_members'>;
type ExpenseRow = Tables<'expenses'>;
type SettlementRow = Tables<'settlements'>;

type GroupWithBalance = Group & {
  memberCount: number;
  balance: number;
};

const db = createTypedClient();

import { useAuth } from '@/context/AuthContext';

export default function GroupsPage() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [groups, setGroups] = useState<GroupWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!authUser) return;
    setIsLoading(true);
    try {
      const { data: myMemberships } = await db.from('group_members').select('group_id').eq('user_id', authUser.id);
      const groupIds = ((myMemberships ?? []) as GroupMemberRow[]).map(r => r.group_id);
      if (groupIds.length === 0) { setGroups([]); return; }

      // Parallelize data fetching
      const [allGroupsRes, allMembersRes, allExpensesRes, allSettlementsRes] = await Promise.all([
        db.from('groups').select('*').in('id', groupIds),
        db.from('group_members').select('group_id').in('group_id', groupIds),
        db.from('expenses').select('*, expense_splits(*)').in('group_id', groupIds),
        db.from('settlements').select('*').in('group_id', groupIds).eq('status', 'completed')
      ]);

      const allGroups = allGroupsRes.data ?? [];
      const allMembers = allMembersRes.data ?? [];
      const allExpenses = allExpensesRes.data ?? [];
      const allSettlements = allSettlementsRes.data ?? [];

      const enriched: GroupWithBalance[] = ((allGroups ?? []) as Group[]).map(group => {
        const memberCount = (allMembers ?? []).filter(m => m.group_id === group.id).length;
        const expenses = (allExpenses ?? []).filter(e => e.group_id === group.id) as (ExpenseRow & { expense_splits: any[] })[];
        const settlements = (allSettlements ?? []).filter(s => s.group_id === group.id) as SettlementRow[];

        let balance = 0;
        for (const exp of expenses) {
          if (exp.paid_by === authUser.id) {
            const totalOwedToMe = exp.expense_splits?.reduce((acc, s) => s.user_id !== authUser.id ? acc + Number(s.amount_owed) : acc, 0) ?? 0;
            balance += totalOwedToMe;
          } else {
            const mySplit = exp.expense_splits?.find(s => s.user_id === authUser.id);
            if (mySplit) balance -= Number(mySplit.amount_owed);
          }
        }

        for (const s of settlements) {
          if (s.paid_by === authUser.id) balance -= Number(s.amount);
          if (s.paid_to === authUser.id) balance += Number(s.amount);
        }

        return {
          ...group,
          memberCount,
          balance: toDollars(balance),
        };
      });

      setGroups(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !authUser) return;
    setIsCreating(true);
    try {
      const user = authUser;

      const { data: group, error: groupErr } = await db.from('groups').insert({
        name: newGroupName.trim(),
        created_by: user.id
      }).select().single();

      if (groupErr) throw groupErr;

      const { error: memberErr } = await db.from('group_members').insert({
        group_id: group.id,
        user_id: user.id
      });

      if (memberErr) throw memberErr;
      
      // Add Guest if name provided
      if (guestName.trim()) {
        const guestId = crypto.randomUUID();
        // Create Guest User
        const { error: guestUserErr } = await db.from('users').insert({
          id: guestId,
          first_name: guestName.trim(),
          is_guest: true
        } as any); // cast to any because TS types might not be updated yet
        
        if (guestUserErr) throw guestUserErr;
        
        // Add Guest to Group
        const { error: guestMemberErr } = await db.from('group_members').insert({
          group_id: group.id,
          user_id: guestId
        });
        
        if (guestMemberErr) throw guestMemberErr;
      }

      toast.success('Group created!');
      setShowNewGroup(false);
      setNewGroupName('');
      setGuestName('');
      loadGroups();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const totalBalance = groups.reduce((acc, g) => acc + g.balance, 0);

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1>Groups</h1>
          <button className={styles.addGroupBtn} onClick={() => setShowNewGroup(true)}>
            <Plus size={18} weight="bold" />
            <span>New Group</span>
          </button>
        </div>
        <div className={styles.searchBar}>
          <MagnifyingGlass className={styles.searchIcon} />
          <input 
            placeholder="Search groups..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <div className={styles.balanceSummary}>
        <div className={styles.summaryInfo}>
          <span className={styles.summaryLabel}>Total net balance</span>
          <h2 className={`${styles.summaryAmount} ${totalBalance > 0 ? 'text-positive' : totalBalance < 0 ? 'text-negative' : ''}`}>
            {totalBalance > 0 ? '+' : totalBalance < 0 ? '-' : ''}${Math.abs(totalBalance).toFixed(2)}
          </h2>
        </div>
        <button className={styles.filterBtn}><FunnelSimple weight="bold" /></button>
      </div>

      <div className={styles.groupsList}>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.groupItem}>
              <div className={`${styles.groupIcon} skeleton`} />
              <div className={styles.groupInfo} style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: '18px', width: '60%', marginBottom: '8px' }} />
                <div className="skeleton" style={{ height: '14px', width: '30%' }} />
              </div>
            </div>
          ))
        ) : 
         filtered.length === 0 ? (
           <div className={styles.emptyState}>
             <div className={styles.emptyIcon}><Users /></div>
             <p>No groups found.</p>
             <button className={styles.emptyActionBtn} onClick={() => setShowNewGroup(true)}>
               Create your first group
             </button>
           </div>
         ) :
         filtered.map((group) => (
           <Link href={`/groups/${group.id}`} key={group.id} className={styles.groupItem}>
             <div className={styles.groupIcon}>
               <Users weight="duotone" />
             </div>
             <div className={styles.groupInfo}>
               <h3 className={styles.groupName}>{group.name}</h3>
               <p className={styles.balanceInfo}>
                 {group.balance > 0 ? (
                   <span className="text-positive">You are owed ${group.balance.toFixed(2)}</span>
                 ) : group.balance < 0 ? (
                   <span className="text-negative">You owe ${Math.abs(group.balance).toFixed(2)}</span>
                 ) : (
                   <span style={{ color: 'var(--text-muted)' }}>No pending balances</span>
                 )}
               </p>
             </div>
             <div className={styles.groupActions}>
               <CaretRight size={20} weight="bold" style={{ color: 'var(--text-muted)' }} />
             </div>
           </Link>
         ))
        }
      </div>

      {showNewGroup && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Start a new group</h2>
              <button onClick={() => setShowNewGroup(false)} className={styles.closeBtn}><X size={24} /></button>
            </div>
            <form onSubmit={handleCreateGroup}>
              <div className={styles.modalField}>
                <label>Group name</label>
                <input 
                  className={styles.modalInput} 
                  value={newGroupName} 
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="e.g. Vacation Trip"
                  required
                  autoFocus
                />
              </div>
              <div className={styles.modalField}>
                <label>Guest name (Optional)</label>
                <input 
                  className={styles.modalInput} 
                  value={guestName} 
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="e.g. John Doe"
                />
                <p className={styles.inputHint}>We'll add this person to the group automatically.</p>
              </div>
              <button type="submit" className={styles.createBtn} disabled={isCreating}>
                {isCreating ? 'Creating…' : 'Create Group'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
