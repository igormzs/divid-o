'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, MagnifyingGlass, Plus, X } from '@phosphor-icons/react';
import styles from './page.module.css';
import Link from 'next/link';
import LoginModal from "@/components/LoginModal";
import { createTypedClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/types/database';
import { toCents, toDollars } from '@/lib/centMath';

type Group = Tables<'groups'>;
type GroupMemberRow = Tables<'group_members'>;
type ExpenseRow = Tables<'expenses'>;
type SettlementRow = Tables<'settlements'>;

type GroupWithBalance = Group & {
  memberCount: number;
  balance: number;
  lastActive: string;
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Unknown';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString();
}

const db = createTypedClient();

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadGroups = useCallback(async () => {
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

      const { data: memberRows } = await db
        .from('group_members')
        .select('group_id, groups(*)')
        .eq('user_id', user.id);

      const userGroups: Group[] = ((memberRows ?? []) as (GroupMemberRow & { groups: Group | null })[])
        .map(r => r.groups)
        .filter(Boolean) as Group[];

      if (userGroups.length === 0) {
        setGroups([]);
        return;
      }

      const groupIds = userGroups.map(g => g.id);

      const { data: allMembers } = await db
        .from('group_members')
        .select('group_id, user_id')
        .in('group_id', groupIds);

      const { data: expenses } = await db
        .from('expenses')
        .select('id, group_id, paid_by, amount, created_at, expense_splits(user_id, amount_owed)')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false });

      const { data: settlements } = await db
        .from('settlements')
        .select('id, group_id, paid_by, paid_to, amount, created_at')
        .in('group_id', groupIds)
        .eq('status', 'completed');

      const typedExpenses = (expenses ?? []) as (ExpenseRow & { expense_splits: { user_id: string; amount_owed: number }[] | null })[];
      const typedSettlements = (settlements ?? []) as SettlementRow[];

      const groupsWithBalance: GroupWithBalance[] = userGroups.map(group => {
        const groupExpenses = typedExpenses.filter(e => e.group_id === group.id);
        const groupSettlements = typedSettlements.filter(s => s.group_id === group.id);

        let owedToMe = 0;
        let iOwe = 0;

        for (const expense of groupExpenses) {
          const splits = expense.expense_splits ?? [];
          if (expense.paid_by === user.id) {
            for (const split of splits) {
              if (split.user_id !== user.id) owedToMe += Number(split.amount_owed);
            }
          } else {
            const mySplit = splits.find(s => s.user_id === user.id);
            if (mySplit) iOwe += Number(mySplit.amount_owed);
          }
        }

        for (const s of groupSettlements) {
          if (s.paid_by === user.id) iOwe -= Number(s.amount);
          if (s.paid_to === user.id) owedToMe -= Number(s.amount);
        }

        const memberCount = ((allMembers ?? []) as GroupMemberRow[]).filter(m => m.group_id === group.id).length;
        const latestExpense = groupExpenses[0];

        return {
          ...group,
          memberCount,
          balance: toDollars(toCents(owedToMe) - toCents(iOwe)),
          lastActive: latestExpense
            ? formatRelativeTime(latestExpense.created_at)
            : formatRelativeTime(group.created_at),
        };
      });

      setGroups(groupsWithBalance);
    } catch (err) {
      console.error('Groups load error:', err);
      toast.error('Groups Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadGroups(); }, [loadGroups]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setIsCreating(true);

    try {
      const { data: { user } } = await db.auth.getUser();
      if (!user) return;

      const { data: group, error: groupErr } = await db
        .from('groups')
        .insert({ name: newGroupName.trim(), description: newGroupDesc.trim() || null, created_by: user.id })
        .select()
        .single();

      if (groupErr || !group) {
        toast.error('Failed to create group.');
        return;
      }

      const { error: memberErr } = await db
        .from('group_members')
        .insert({ group_id: group.id, user_id: user.id });

      if (memberErr) {
        toast.error('Group created but failed to add you as member.');
      } else {
        toast.success(`Group "${group.name}" created!`);
        setShowNewGroup(false);
        setNewGroupName('');
        setNewGroupDesc('');
        await loadGroups();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error creating group');
    } finally {
      setIsCreating(false);
    }
  };

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
    {(!authUser && !isInitializing) && <LoginModal />}
    <div className={styles.container}>
      {showNewGroup && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>New Group</h2>
              <button onClick={() => setShowNewGroup(false)} className={styles.closeBtn}><X weight="bold" /></button>
            </div>
            <form onSubmit={handleCreateGroup} className={styles.modalForm}>
              <div className={styles.modalField}>
                <label>Group Name *</label>
                <input
                  type="text"
                  className={styles.modalInput}
                  placeholder="e.g. Apartment 4B"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className={styles.modalField}>
                <label>Description (optional)</label>
                <input
                  type="text"
                  className={styles.modalInput}
                  placeholder="What's this group for?"
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                />
              </div>
              <button type="submit" className={styles.createBtn} disabled={isCreating || !newGroupName.trim()}>
                {isCreating ? 'Creating…' : 'Create Group'}
              </button>
            </form>
          </div>
        </div>
      )}

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Your Groups</h1>
          <p className={styles.subtitle}>Manage shared expenses</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.searchBar}>
            <span className={styles.searchIcon}><MagnifyingGlass weight="bold" /></span>
            <input
              type="text"
              placeholder="Search groups"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button className={styles.newGroupBtn} onClick={() => setShowNewGroup(true)}>
            <Plus weight="bold" /> New Group
          </button>
        </div>
      </header>

      <div className={styles.groupsGrid}>
        {isLoading && <p style={{ opacity: 0.6 }}>Loading…</p>}
        {!isLoading && filtered.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Users weight="thin" size={80} />
            </div>
            <h2>No groups found</h2>
            <p>{searchQuery ? 'No groups match your search.' : "You don't have any groups yet. Create one to start sharing expenses!"}</p>
            {!searchQuery && (
              <button className={styles.emptyActionBtn} onClick={() => setShowNewGroup(true)}>
                <Plus weight="bold" /> Create Your First Group
              </button>
            )}
          </div>
        )}
        {filtered.map((group) => (
          <Link href={`/groups/${group.id}`} key={group.id} className={styles.groupCard}>
            <div className={styles.cardHeader}>
              <div className={styles.groupIcon}>
                <Users weight="fill" />
              </div>
              <span className={styles.lastActive}>{group.lastActive}</span>
            </div>
            
            <div className={styles.cardBody}>
              <h3 className={styles.groupName}>{group.name}</h3>
              <p className={styles.memberCount}>{group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</p>
            </div>

            <div className={styles.cardFooter}>
              <div className={styles.balanceInfo}>
                <span className={styles.balanceLabel}>Your Balance</span>
                <span className={`${styles.balanceAmount} ${group.balance > 0 ? styles.positive : group.balance < 0 ? styles.negative : styles.neutral}`}>
                  {group.balance > 0 ? '+' : group.balance < 0 ? '-' : ''}${Math.abs(group.balance).toFixed(2)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
    </>
  );
}
