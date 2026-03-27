'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from "./page.module.css";
import ExpenseForm from "@/components/ExpenseForm";
import LoginModal from "@/components/LoginModal";
import { toast } from 'sonner';
import { createClient, createTypedClient } from '@/utils/supabase/client';
import type { Tables } from '@/types/database';
import { toCents, toDollars } from '@/lib/centMath';

import { MagnifyingGlass, Users } from '@phosphor-icons/react';
import Link from 'next/link';

type Group = Tables<'groups'>;
type Expense = Tables<'expenses'> & {
  users: { first_name: string | null; last_name: string | null } | null;
};

type GroupWithBalance = Group & {
  memberCount: number;
  balance: number; // positive = owed to you, negative = you owe
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

function getInitials(firstName: string | null, lastName: string | null): string {
  const f = firstName?.[0] ?? '?';
  const l = lastName?.[0] ?? '';
  return (f + l).toUpperCase();
}

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState<Tables<'users'> | null>(null);
  const [authUser, setAuthUser] = useState<{ id: string } | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [groups, setGroups] = useState<GroupWithBalance[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();       // SSR auth client
  const db = createTypedClient();        // typed DB client

  // Derived global balances from groups
  const totalOwedToYou = groups.filter(g => g.balance > 0).reduce((s, g) => s + g.balance, 0);
  const totalYouOwe = groups.filter(g => g.balance < 0).reduce((s, g) => s + Math.abs(g.balance), 0);
  const netBalance = totalOwedToYou - totalYouOwe;

  const loadDashboard = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      // 1. Fetch the user's groups (via group_members)
      const { data: memberRows, error: memberErr } = await db
        .from('group_members')
        .select('group_id, groups(*)')
        .eq('user_id', userId);

      if (memberErr) throw memberErr;

      const userGroups: Group[] = (memberRows ?? [])
        .map(r => r.groups as Group | null)
        .filter(Boolean) as Group[];

      if (userGroups.length === 0) {
        setGroups([]);
        setRecentExpenses([]);
        setIsLoading(false);
        return;
      }

      const groupIds = userGroups.map(g => g.id);

      // 2. Fetch all group_members counts
      const { data: allMembers } = await db
        .from('group_members')
        .select('group_id, user_id')
        .in('group_id', groupIds);

      // 3. Fetch all expenses in these groups (with splits and payer info)
      const { data: expenses } = await db
        .from('expenses')
        .select('*, expense_splits(*), users(first_name, last_name)')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false });

      // 4. Fetch completed settlements
      const { data: settlements } = await db
        .from('settlements')
        .select('*')
        .in('group_id', groupIds)
        .eq('status', 'completed');

      // 5. Compute per-group balance
      const groupsWithBalance: GroupWithBalance[] = userGroups.map(group => {
        const groupExpenses = (expenses ?? []).filter(e => e.group_id === group.id);
        const groupSettlements = (settlements ?? []).filter(s => s.group_id === group.id);

        let owedToMe = 0; // others owe me (I paid, they have splits)
        let iOwe = 0;     // I owe others (they paid, I have splits)

        for (const expense of groupExpenses) {
          const splits: { user_id: string; amount_owed: number }[] =
            (expense as { expense_splits?: { user_id: string; amount_owed: number }[] }).expense_splits ?? [];

          if (expense.paid_by === userId) {
            // I paid — everyone else's split is owed to me
            for (const split of splits) {
              if (split.user_id !== userId) {
                owedToMe += Number(split.amount_owed);
              }
            }
          } else {
            // Someone else paid — my split is what I owe
            const mySplit = splits.find(s => s.user_id === userId);
            if (mySplit) iOwe += Number(mySplit.amount_owed);
          }
        }

        // Adjust for completed settlements
        for (const s of groupSettlements) {
          if (s.paid_by === userId) iOwe -= Number(s.amount);
          if (s.paid_to === userId) owedToMe -= Number(s.amount);
        }

        const memberCount = (allMembers ?? []).filter(m => m.group_id === group.id).length;
        const latestExpense = groupExpenses[0];

        return {
          ...group,
          memberCount,
          balance: toDollars(toCents(owedToMe) - toCents(iOwe)),
          lastActive: latestExpense ? formatRelativeTime(latestExpense.created_at) : formatRelativeTime(group.created_at),
        };
      });

      setGroups(groupsWithBalance);

      // 6. Recent expenses (top 5)
      const recent = ((expenses ?? []) as Expense[]).slice(0, 5);
      setRecentExpenses(recent);
    } catch (err: any) {
      console.error('Dashboard load error:', err);
      const errMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      toast.error('Dashboard Error: ' + errMsg);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  // Ensures a public `users` row exists for the authenticated user.
  // This handles Google OAuth where no trigger creates the row automatically.
  const ensureUserProfile = useCallback(async (authU: { id: string; email?: string; user_metadata?: Record<string, string> }) => {
    const meta = authU.user_metadata ?? {};
    const fullName: string = meta['full_name'] ?? meta['name'] ?? '';
    const parts = fullName.trim().split(' ');
    const firstName = parts[0] ?? null;
    const lastName = parts.slice(1).join(' ') || null;

    const { data, error } = await db
      .from('users')
      .upsert({
        id: authU.id,
        email: authU.email ?? '',
        first_name: firstName,
        last_name: lastName,
        avatar_url: meta['avatar_url'] ?? meta['picture'] ?? null,
      }, { onConflict: 'id', ignoreDuplicates: true })
      .select()
      .single();

    if (error && error.code !== 'PGRST116') {
      // If upsert failed (e.g. existing row), fall back to select
      const { data: existing } = await db
        .from('users')
        .select('*')
        .eq('id', authU.id)
        .single();
      return existing;
    }
    return data;
  }, [db]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Use getUser() (validates against server) instead of getSession() (trusts local cache)
    supabase.auth.getUser().then(async ({ data: { user: authU } }) => {
      if (authU) {
        setAuthUser(authU);
        const profile = await ensureUserProfile(authU);
        setUser(profile ?? null);
        await loadDashboard(authU.id);
      }
      setIsInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setAuthUser(session.user);
        const profile = await ensureUserProfile(session.user);
        setUser(profile ?? null);
        await loadDashboard(session.user.id);
      } else {
        setAuthUser(null);
        setUser(null);
        setGroups([]);
        setRecentExpenses([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExpenseSave = async (data: {
    description: string;
    amount: number;
    payerId: string;
    groupId: string;
    splits: { userId: string; amountOwed: number }[];
    ghostUsers?: { id: string; name: string }[];
  }) => {
    if (!authUser) return;

    if (data.ghostUsers && data.ghostUsers.length > 0) {
      const newUsers = data.ghostUsers.map(u => ({
        id: u.id,
        email: `${u.id}@ghost.divid-o.com`,
        first_name: u.name,
      }));
      const { error: usersErr } = await db.from('users').insert(newUsers);
      if (usersErr) {
        toast.error('Failed to create new users. Note: make sure to run the SQL script to drop users_id_fkey!');
        console.error(usersErr);
        return;
      }

      const newMembers = data.ghostUsers.map(u => ({
        group_id: data.groupId,
        user_id: u.id,
      }));
      const { error: membersErr } = await db.from('group_members').insert(newMembers);
      if (membersErr) {
        console.error('Failed to add ghost users to group:', membersErr);
      }
    }

    // Insert expense
    const { data: expense, error: expErr } = await db
      .from('expenses')
      .insert({
        group_id: data.groupId,
        paid_by: data.payerId,
        description: data.description,
        amount: data.amount,
        currency: 'USD',
      })
      .select()
      .single();

    if (expErr || !expense) {
      toast.error('Failed to save expense.');
      return;
    }

    // 2. Insert splits
    const splitRows = data.splits.map(s => ({
      expense_id: expense.id,
      user_id: s.userId,
      amount_owed: s.amountOwed,
    }));

    const { error: splitErr } = await db
      .from('expense_splits')
      .insert(splitRows);

    if (splitErr) {
      toast.error('Expense saved but splits failed. Please check.');
      console.error(splitErr);
    } else {
      toast.success(`Added: ${data.description}`);
      setShowForm(false);
      await loadDashboard(authUser.id);
    }
  };

  // Members for the expense form: everyone in any of the user's groups
  const [groupMembers, setGroupMembers] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (!authUser || groups.length === 0) return;
    const groupIds = groups.map(g => g.id);
    db
      .from('group_members')
      .select('user_id, users(id, first_name, last_name)')
      .in('group_id', groupIds)
      .then(({ data }) => {
        const seen = new Set<string>();
        const members: { id: string; name: string }[] = [];
        for (const row of data ?? []) {
          const u = row.users as { id: string; first_name: string | null; last_name: string | null } | null;
          if (u && !seen.has(u.id)) {
            seen.add(u.id);
            members.push({ id: u.id, name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.id });
          }
        }
        setGroupMembers(members);
      });
  }, [groups, authUser]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
    {(!authUser && !isInitializing) && <LoginModal />}
    
    {showForm && (
      <ExpenseForm
        groupMembers={groupMembers.length > 0 ? groupMembers : [{ id: authUser?.id ?? '', name: user?.first_name ?? 'Me' }]}
        groups={groups.map(g => ({ id: g.id, name: g.name }))}
        onSave={handleExpenseSave}
        onCancel={() => setShowForm(false)}
      />
    )}

    <div className={styles.dashboardContainer}>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {user ? `Hey, ${user.first_name ?? 'there'} 👋` : 'Dashboard'}
          </h1>
          <p className={styles.subtitle}>Balances Updates</p>
        </div>
        <div className={styles.searchBar}>
          <span className={styles.searchIcon}><MagnifyingGlass weight="bold" /></span>
          <input type="text" placeholder="Search" />
        </div>
      </header>

      <section className={styles.cardsRow}>
        <div className={`${styles.card} ${styles.cardGreen}`}>
          <div className={styles.cardTop}>
            <span className={styles.cardLabel}>Net Balance</span>
            <span className={styles.pillGreen}>{netBalance >= 0 ? '+' : '-'}${Math.abs(netBalance).toFixed(2)}</span>
          </div>
          <h2 className={styles.cardAmount}>
            {isLoading ? '...' : `$${Math.abs(netBalance).toFixed(2)}`}
          </h2>
          <div className={styles.cardChartPlaceholder}>
            <svg viewBox="0 0 100 20" className={styles.miniChart}>
              <path d="M0,15 L10,12 L20,18 L30,5 L40,10 L50,8 L60,16 L70,4 L80,10 L90,2 L100,12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className={`${styles.card} ${styles.cardYellow}`}>
          <div className={styles.cardTop}>
            <span className={styles.cardLabel}>Owed to You</span>
            <span className={styles.pillYellow}>+${totalOwedToYou.toFixed(2)}</span>
          </div>
          <h2 className={styles.cardAmount}>
            {isLoading ? '...' : `$${totalOwedToYou.toFixed(2)}`}
          </h2>
          <div className={styles.cardChartPlaceholder}>
            <svg viewBox="0 0 100 20" className={styles.miniChart}>
              <path d="M0,18 L10,14 L20,16 L30,5 L40,12 L50,6 L60,14 L70,8 L80,12 L90,2 L100,6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className={`${styles.card} ${styles.cardPurple}`}>
          <div className={styles.cardTop}>
            <span className={styles.cardLabelPurple}>You Owe</span>
          </div>
          <p className={styles.cardSub}>
            {isLoading ? '...' : totalYouOwe > 0 ? `$${totalYouOwe.toFixed(2)} across your groups` : 'All settled up!'}
          </p>
          <button className={styles.proButton} onClick={() => setShowForm(true)}>+ Expense</button>
        </div>
      </section>

      <div className={styles.bottomSection}>
        <section className={styles.mainChartSection}>
          <div className={styles.chartHeader}>
            <div>
              <h3>Balance In The Last Week</h3>
              <h2 className={styles.chartTitleTrend}>+ 3.2%</h2>
            </div>
            <a href="#" className={styles.seeStatsLink}>See statistics for all time</a>
          </div>
          
          <div className={styles.barChartPlaceholder}>
            <div className={styles.barColumn}><div className={styles.barFill} style={{height: '30%'}}></div><span>Mon</span></div>
            <div className={styles.barColumn}><div className={styles.barFill} style={{height: '80%'}}></div><span>Tue</span></div>
            <div className={styles.barColumn}><div className={styles.barFill} style={{height: '95%'}}></div><span>Wed</span></div>
            <div className={styles.barColumn}><div className={styles.barFill} style={{height: '40%'}}></div><span>Thu</span></div>
            <div className={styles.barColumn}><div className={styles.barFill} style={{height: '25%'}}></div><span>Fri</span></div>
            <div className={styles.barColumn}><div className={styles.barFill} style={{height: '70%'}}></div><span>Sat</span></div>
            <div className={styles.barColumn}><div className={styles.barFill} style={{height: '60%'}}></div><span>Sun</span></div>
          </div>
        </section>

        <section className={styles.listSection}>
          <div className={styles.listHeader}>
            <h3>Recent Expenses</h3>
            <Link href="/activity" className={styles.seeStatsLink}>See All</Link>
          </div>

          <div className={styles.listContainer}>
            {isLoading && <p style={{ padding: '1rem', opacity: 0.6 }}>Loading…</p>}
            {!isLoading && recentExpenses.length === 0 && (
              <p style={{ padding: '1rem', opacity: 0.6 }}>No expenses yet. Add one!</p>
            )}
            {recentExpenses.map((expense) => {
              const payer = expense.users;
              const initials = getInitials(payer?.first_name ?? null, payer?.last_name ?? null);
              const name = payer
                ? `${payer.first_name ?? ''} ${payer.last_name ?? ''}`.trim() || 'Unknown'
                : 'Unknown';
              return (
                <div key={expense.id} className={styles.listItem}>
                  <div className={styles.listAvatar}>{initials}</div>
                  <div className={styles.listInfo}>
                    <h4>{expense.description}</h4>
                    <p>Paid by {name} · {formatRelativeTime(expense.created_at)}</p>
                  </div>
                  <div className={styles.listAmount}>+ ${Number(expense.amount).toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className={styles.groupsSection}>
        <div className={styles.listHeader}>
          <h3>Your Groups</h3>
          <Link href="/groups" className={styles.seeStatsLink}>See All</Link>
        </div>
        
        <div className={styles.groupsGrid}>
          {isLoading && <p style={{ opacity: 0.6 }}>Loading…</p>}
          {!isLoading && groups.length === 0 && (
            <p style={{ opacity: 0.6 }}>No groups yet. <Link href="/groups" style={{ color: 'var(--accent)' }}>Create one →</Link></p>
          )}
          {groups.map((group) => (
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
    </div>
    </>
  );
}
