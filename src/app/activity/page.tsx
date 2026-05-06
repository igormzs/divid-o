'use client';

import { useState, useEffect, useCallback } from 'react';
import { Receipt, Handshake, Bell } from '@phosphor-icons/react';
import styles from './page.module.css';
import { createTypedClient } from '@/utils/supabase/client';
import type { Tables } from '@/types/database';
import { toDollars } from '@/lib/mathEngine';
import { formatDistanceToNow } from 'date-fns';

type Expense = Tables<'expenses'> & { profiles: any };
type Settlement = Tables<'settlements'> & { payer: any, payee: any };

const db = createTypedClient();

import { useAuth } from '@/context/AuthContext';

export default function ActivityPage() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadActivity = useCallback(async () => {
    if (!authUser) return;
    setIsLoading(true);
    try {
      const { data: myMemberships } = await db.from('group_members').select('group_id').eq('user_id', authUser.id);
      const groupIds = (myMemberships ?? []).map(r => r.group_id);
      if (groupIds.length === 0) { setActivities([]); return; }

      // Fetch expenses and settlements in parallel
      const [expensesRes, settlementsRes] = await Promise.all([
        db.from('expenses')
          .select('*, profiles:users!expenses_paid_by_fkey(first_name, last_name)')
          .in('group_id', groupIds)
          .order('created_at', { ascending: false }),
        db.from('settlements')
          .select('*, payer:users!settlements_paid_by_fkey(first_name, last_name), payee:users!settlements_paid_to_fkey(first_name, last_name)')
          .in('group_id', groupIds)
          .order('created_at', { ascending: false })
      ]);

      const expenses = expensesRes.data ?? [];
      const settlements = settlementsRes.data ?? [];

      const activityItems = [
        ...(expenses ?? []).map(e => ({
          id: e.id,
          type: 'expense',
          date: new Date(e.created_at || new Date().toISOString()),
          user: (e as any).profiles?.first_name || 'Someone',
          description: e.description,
          amount: toDollars(e.amount),
        })),
        ...(settlements ?? []).map(s => ({
          id: s.id,
          type: 'settlement',
          date: new Date(s.created_at || new Date().toISOString()),
          from: (s as any).payer?.first_name || 'Someone',
          to: (s as any).payee?.first_name || 'Someone',
          amount: toDollars(s.amount),
        }))
      ].sort((a, b) => b.date.getTime() - a.date.getTime());

      setActivities(activityItems);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadActivity(); }, [loadActivity]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Activity</h1>
      </header>

      <div className={styles.activityList}>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.activityItem}>
              <div className={`${styles.iconBox} skeleton`} />
              <div className={styles.content} style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: '16px', width: '80%', marginBottom: '8px' }} />
                <div className="skeleton" style={{ height: '14px', width: '40%', marginBottom: '8px' }} />
                <div className="skeleton" style={{ height: '12px', width: '20%' }} />
              </div>
            </div>
          ))
        ) : activities.length === 0 ? (
          <div className={styles.emptyState}>
            <Bell size={64} weight="thin" style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p>You have no activity yet.</p>
          </div>
        ) : (
          activities.map((item) => (
            <div key={`${item.type}-${item.id}`} className={styles.activityItem}>
              <div className={styles.iconBox}>
                {item.type === 'expense' ? <Receipt className={styles.expenseIcon} /> : <Handshake className={styles.settlementIcon} />}
              </div>
              <div className={styles.content}>
                <p className={styles.description}>
                  {item.type === 'expense' ? (
                    <><b>{item.user}</b> added "<b>{item.description}</b>"</>
                  ) : (
                    <><b>{item.from}</b> paid <b>{item.to}</b></>
                  )}
                </p>
                <p className={`${styles.details} ${item.type === 'expense' ? 'text-negative' : 'text-positive'}`}>
                  {item.type === 'expense' ? `you owe $${item.amount.toFixed(2)}` : `you received $${item.amount.toFixed(2)}`}
                </p>
                <p className={styles.date}>{formatDistanceToNow(item.date)} ago</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
