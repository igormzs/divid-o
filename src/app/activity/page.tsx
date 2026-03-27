'use client';

import { useState, useEffect, useCallback } from 'react';
import { Receipt, Money, Handshake, MagnifyingGlass } from '@phosphor-icons/react';
import styles from './page.module.css';
import LoginModal from "@/components/LoginModal";
import { createTypedClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/types/database';
import { JSX } from 'react';

type ExpenseRow = Tables<'expenses'>;
type SettlementRow = Tables<'settlements'>;
type UserRow = Tables<'users'>;
type GroupMemberRow = Tables<'group_members'>;

interface ActivityItem {
  id: string;
  type: 'expense' | 'payment' | 'settlement';
  text: string;
  amount: string;
  time: string;
  icon: JSX.Element;
  color: string;
  timestamp: number;
}

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

function userName(u: Pick<UserRow, 'first_name' | 'last_name'> | undefined): string {
  if (!u) return 'Someone';
  return `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || 'Someone';
}

const db = createTypedClient();

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadActivity = useCallback(async () => {
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

      // Get user's group IDs
      const { data: memberRows } = await db
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      const groupIds = ((memberRows ?? []) as GroupMemberRow[]).map(r => r.group_id);

      if (groupIds.length === 0) {
        setItems([]);
        return;
      }

      // Fetch expenses with payer info
      const { data: rawExpenses } = await db
        .from('expenses')
        .select('id, group_id, paid_by, description, amount, created_at')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false })
        .limit(30);

      const expenses = (rawExpenses ?? []) as ExpenseRow[];

      // Fetch settlements
      const { data: rawSettlements } = await db
        .from('settlements')
        .select('id, group_id, paid_by, paid_to, amount, status, created_at')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false })
        .limit(20);

      const settlements = (rawSettlements ?? []) as SettlementRow[];

      // Collect all unique user IDs from expenses + settlements
      const allUserIds = new Set<string>();
      expenses.forEach(e => allUserIds.add(e.paid_by));
      settlements.forEach(s => { allUserIds.add(s.paid_by); allUserIds.add(s.paid_to); });

      const { data: rawProfiles } = await db
        .from('users')
        .select('id, first_name, last_name')
        .in('id', [...allUserIds]);

      const profiles = (rawProfiles ?? []) as UserRow[];
      const userMap: Record<string, UserRow> = Object.fromEntries(profiles.map(p => [p.id, p]));

      const activityItems: ActivityItem[] = [];

      // Map expenses
      for (const expense of expenses) {
        const isMe = expense.paid_by === user.id;
        const payerName = isMe ? 'You' : userName(userMap[expense.paid_by]);
        activityItems.push({
          id: `exp-${expense.id}`,
          type: 'expense',
          text: `${payerName} added "${expense.description}"`,
          amount: `$${Number(expense.amount).toFixed(2)}`,
          time: formatRelativeTime(expense.created_at),
          icon: <Receipt weight="fill" />,
          color: 'purple',
          timestamp: expense.created_at ? new Date(expense.created_at).getTime() : 0,
        });
      }

      // Map settlements
      for (const s of settlements) {
        const isPayerMe = s.paid_by === user.id;
        const isPayeeMe = s.paid_to === user.id;
        const payerName = isPayerMe ? 'You' : userName(userMap[s.paid_by]);
        const payeeName = isPayeeMe ? 'you' : userName(userMap[s.paid_to]);
        const icon = s.status === 'completed' ? <Handshake weight="fill" /> : <Money weight="fill" />;
        activityItems.push({
          id: `set-${s.id}`,
          type: s.status === 'completed' ? 'settlement' : 'payment',
          text: `${payerName} paid ${payeeName}`,
          amount: `$${Number(s.amount).toFixed(2)}`,
          time: formatRelativeTime(s.created_at),
          icon,
          color: s.status === 'completed' ? 'yellow' : 'green',
          timestamp: s.created_at ? new Date(s.created_at).getTime() : 0,
        });
      }

      activityItems.sort((a, b) => b.timestamp - a.timestamp);
      setItems(activityItems.slice(0, 30));
    } catch (err) {
      console.error('Activity load error:', err);
      toast.error('Activity Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadActivity(); }, [loadActivity]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = items.filter(item =>
    item.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
    {(!authUser && !isInitializing) && <LoginModal />}
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Recent Activity</h1>
          <p className={styles.subtitle}>Track every expense and payment</p>
        </div>
        <div className={styles.searchBar}>
          <span className={styles.searchIcon}><MagnifyingGlass weight="bold" /></span>
          <input
            type="text"
            placeholder="Search activity"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <div className={styles.timeline}>
        {isLoading && <p style={{ opacity: 0.6 }}>Loading…</p>}
        {!isLoading && filtered.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Receipt weight="thin" size={80} />
            </div>
            <h2>No activity yet</h2>
            <p>{searchQuery ? 'No activity matches your search.' : 'Your expense and payment history will appear here. Add an expense to get started!'}</p>
          </div>
        )}
        {filtered.map((activity, index) => (
          <div key={activity.id} className={styles.timelineItem}>
            <div className={styles.timelineLine} style={{ display: index === filtered.length - 1 ? 'none' : 'block' }}></div>
            
            <div className={`${styles.timelineIcon} ${styles[activity.color]}`}>
              {activity.icon}
            </div>
            
            <div className={styles.timelineContent}>
              <div className={styles.activityHeader}>
                <p className={styles.activityText}>{activity.text}</p>
                <span className={`${styles.amount} ${activity.type !== 'expense' ? styles.positive : ''}`}>
                  {activity.amount}
                </span>
              </div>
              <span className={styles.time}>{activity.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
