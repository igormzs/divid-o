'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Plus, 
  CaretLeft, 
  DotsThreeVertical, 
  Users, 
  Handshake,
  ArrowRight
} from '@phosphor-icons/react';
import styles from './page.module.css';
import { createTypedClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/types/database';
import { toCents, toDollars, simplifyDebts } from '@/lib/mathEngine';
import MemberSearch from '@/components/MemberSearch';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseDetailDrawer from '@/components/ExpenseDetailDrawer';
import Skeleton from '@/components/Skeleton';

type GroupRow = Tables<'groups'>;
type UserRow = Tables<'users'>;
type ExpenseRow = Tables<'expenses'> & { expense_splits: { user_id: string; amount_owed: number }[] };
type SettlementRow = Tables<'settlements'>;

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.id as string;
  const router = useRouter();
  const db = createTypedClient();

  const [group, setGroup] = useState<GroupRow | null>(null);
  const [members, setMembers] = useState<UserRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<any>(null);
  
  const [viewingExpenseId, setViewingExpenseId] = useState<string | undefined>(undefined);
  const [editingExpenseId, setEditingExpenseId] = useState<string | undefined>(undefined);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await db.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      setAuthUser(user);

      // Run all primary data fetches in parallel for better performance
      const [groupRes, membersRes, expensesRes, settlementsRes] = await Promise.all([
        db.from('groups').select('*').eq('id', groupId).single(),
        db.from('group_members').select('users(*)').eq('group_id', groupId),
        db.from('expenses').select('*, expense_splits(*)').eq('group_id', groupId).order('created_at', { ascending: false }),
        db.from('settlements').select('*').eq('group_id', groupId).eq('status', 'completed')
      ]);

      if (groupRes.error) throw groupRes.error;
      setGroup(groupRes.data);

      const profiles = (membersRes.data ?? []).map(m => (m as any).users as UserRow).filter(Boolean);
      setMembers(profiles);

      setExpenses((expensesRes.data ?? []) as ExpenseRow[]);
      setSettlements((settlementsRes.data ?? []) as SettlementRow[]);
    } catch (err: any) { 
      console.error('Error loading group data:', err);
      toast.error(err.message); 
    } finally { 
      setIsLoading(false); 
    }
  }, [groupId, db]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const { simplifiedTransfers } = useMemo(() => {
    if (!members.length) return { simplifiedTransfers: [] };
    const balances: Record<string, number> = {};
    members.forEach(m => balances[m.id] = 0);
    expenses.forEach(exp => {
      exp.expense_splits.forEach(split => {
        if (balances[split.user_id] !== undefined) balances[split.user_id] -= Number(split.amount_owed);
        if (balances[exp.paid_by] !== undefined) balances[exp.paid_by] += Number(split.amount_owed);
      });
    });
    settlements.forEach(s => {
      if (balances[s.paid_by] !== undefined) balances[s.paid_by] += Number(s.amount);
      if (balances[s.paid_to] !== undefined) balances[s.paid_to] -= Number(s.amount);
    });
    return { simplifiedTransfers: simplifyDebts(Object.fromEntries(Object.entries(balances).map(([k, v]) => [k, Math.round(v)]))) };
  }, [members, expenses, settlements]);

  const openAddExpense = () => {
    setViewingExpenseId(undefined);
    setEditingExpenseId(undefined);
    // Use timeout to ensure any other modal is closed first if needed
    setTimeout(() => setEditingExpenseId('NEW'), 10);
  };

  const handleEditFromDrawer = (id: string) => {
    setViewingExpenseId(undefined);
    setEditingExpenseId(id);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div style={{ width: '24px' }} />
          <div className={styles.headerInfo}>
            <Skeleton width="120px" height="24px" />
            <Skeleton width="60px" height="14px" style={{ marginTop: '4px' }} />
          </div>
        </header>
        <div className={styles.dashboard}>
          <section>
            <div className={styles.cardHeader}>
              <Skeleton width="100px" height="16px" />
            </div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'hidden' }}>
              {[1, 2, 3, 4].map(i => <Skeleton key={i} circle width="48px" height="48px" />)}
            </div>
          </section>
          
          <section style={{ marginTop: '32px' }}>
            <div className={styles.cardHeader}>
              <Skeleton width="140px" height="16px" />
            </div>
            <Skeleton width="100%" height="100px" borderRadius="16px" />
          </section>

          <section style={{ marginTop: '32px' }}>
            <div className={styles.cardHeader}>
              <Skeleton width="100px" height="16px" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} width="100%" height="72px" borderRadius="16px" />
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn}><CaretLeft /></button>
        <div className={styles.headerInfo}>
          <h1>{group.name}</h1>
          <p>{members.length} members</p>
        </div>
        <button className={styles.menuBtn} onClick={openAddExpense}><Plus weight="bold" /></button>
      </header>

      <div className={styles.dashboard}>
        <section>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox}><Users size={18} /></div>
            <h2>Members</h2>
          </div>
          <MemberSearch groupId={groupId} onMemberAdded={loadAll} existingMemberIds={members.map(m => m.id)} />
        </section>

        <section>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox}><Handshake size={18} /></div>
            <h2>Simplified Plan</h2>
          </div>
          <div className={styles.transfers}>
            {simplifiedTransfers.length === 0 ? (
              <p className={styles.emptyState}>All settled up!</p>
            ) : (
              simplifiedTransfers.map((t, idx) => {
                const from = members.find(m => m.id === t.from);
                const to = members.find(m => m.id === t.to);
                return (
                  <div key={idx} className={styles.transferItem}>
                    <span className={styles.personName}>{from?.id === authUser?.id ? 'You' : (from?.first_name || 'Someone')}</span>
                    <span className={styles.actionText}>pay</span>
                    <span className={styles.personName}>{to?.id === authUser?.id ? 'you' : (to?.first_name || 'Someone')}</span>
                    <span className={styles.amount}>${toDollars(t.amount).toFixed(2)}</span>
                    <ArrowRight className={styles.arrow} />
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section style={{ marginTop: '32px' }}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox}><Plus size={18} /></div>
            <h2>Expenses</h2>
          </div>
          <div className={styles.expenseList}>
            {expenses.length === 0 ? (
              <p className={styles.emptyState}>No expenses yet.</p>
            ) : (
              expenses.map(exp => {
                const isPayer = exp.paid_by === authUser?.id;
                const payer = members.find(m => m.id === exp.paid_by);
                const mySplit = exp.expense_splits.find(s => s.user_id === authUser?.id);
                return (
                  <div key={exp.id} className={styles.expenseItem} onClick={() => setViewingExpenseId(exp.id)}>
                    <div className={styles.expenseDate}>
                      <span className={styles.month}>{new Date(exp.created_at || '').toLocaleString('default', { month: 'short' })}</span>
                      <span className={styles.day}>{new Date(exp.created_at || '').getDate()}</span>
                    </div>
                    <div className={styles.expenseInfo}>
                      <h3>{exp.description}</h3>
                      <p>{isPayer ? 'You paid' : (payer?.first_name || 'Someone paid')} ${toDollars(exp.amount).toFixed(2)}</p>
                    </div>
                    <div className={styles.expenseDetail}>
                      <span className={isPayer ? styles.owedToYou : styles.youOwe}>
                        {isPayer ? 'you lent' : 'you borrowed'}
                      </span>
                      <span className={isPayer ? styles.owedAmount : styles.borrowedAmount}>
                        ${isPayer 
                          ? toDollars(exp.amount - (mySplit?.amount_owed || 0)).toFixed(2)
                          : toDollars(mySplit?.amount_owed || 0).toFixed(2)
                        }
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {viewingExpenseId && (
        <ExpenseDetailDrawer 
          expenseId={viewingExpenseId}
          onClose={() => setViewingExpenseId(undefined)}
          onEdit={handleEditFromDrawer}
          onDeleteSuccess={loadAll}
        />
      )}

      {editingExpenseId && (
        <ExpenseForm 
          preSelectedGroupId={groupId}
          editingExpenseId={editingExpenseId === 'NEW' ? undefined : editingExpenseId}
          onClose={() => setEditingExpenseId(undefined)}
          onSuccess={loadAll}
        />
      )}
    </div>
  );
}
