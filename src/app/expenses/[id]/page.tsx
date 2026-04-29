'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  CaretLeft, 
  PencilSimple, 
  Trash, 
  CalendarBlank, 
  Wallet,
  Users,
  Tag,
  Receipt
} from '@phosphor-icons/react';
import styles from './page.module.css';
import { createTypedClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/types/database';
import ExpenseForm from '@/components/ExpenseForm';
import { toDollars } from '@/lib/mathEngine';

type ExpenseRow = Tables<'expenses'>;
type UserRow = Tables<'users'>;
type SplitRow = Tables<'expense_splits'>;

export default function ExpenseDetailPage() {
  const params = useParams();
  const expenseId = params.id as string;
  const router = useRouter();
  const db = createTypedClient();

  const [expense, setExpense] = useState<ExpenseRow | null>(null);
  const [payer, setPayer] = useState<UserRow | null>(null);
  const [splits, setSplits] = useState<(SplitRow & { user: UserRow | null })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadExpense = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await db.auth.getUser();
      if (!user) return;

      const { data: expData } = await db.from('expenses').select('*').eq('id', expenseId).single();
      if (!expData) throw new Error('Expense not found');
      setExpense(expData);

      const { data: payerData } = await db.from('users').select('*').eq('id', expData.paid_by).single();
      setPayer(payerData);

      const { data: splitData } = await db.from('expense_splits').select('*, users(*)').eq('expense_id', expenseId);
      const formattedSplits = (splitData ?? []).map(s => ({ ...s, user: (s as any).users as UserRow }));
      setSplits(formattedSplits);
    } catch (err: any) { toast.error(err.message); }
    finally { setIsLoading(false); }
  }, [expenseId]);

  useEffect(() => { loadExpense(); }, [loadExpense]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    setIsDeleting(true);
    try {
      await db.from('expenses').delete().eq('id', expenseId);
      toast.success('Expense deleted');
      router.back();
    } catch (err: any) {
      toast.error(err.message);
      setIsDeleting(false);
    }
  };

  if (isLoading) return <div style={{ padding: '24px', opacity: 0.6 }}>Loading expense details…</div>;
  if (!expense) return null;

  return (
    <div className={styles.container}>
      {showEdit && (
        <ExpenseForm 
          onClose={() => setShowEdit(false)} 
          onSuccess={loadExpense}
          editingExpenseId={expenseId}
        />
      )}

      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn}><CaretLeft /></button>
        <h1>Expense</h1>
        <div className={styles.actions}>
          <button onClick={() => setShowEdit(true)} className={styles.editBtn}><PencilSimple /></button>
          <button onClick={handleDelete} className={styles.deleteBtn} disabled={isDeleting}><Trash /></button>
        </div>
      </header>

      <div className={styles.card}>
        <div className={styles.mainInfo}>
          <div className={styles.iconCircle}><Receipt size={32} /></div>
          <div className={styles.textInfo}>
            <h2>{expense.description}</h2>
            <p className={styles.totalAmount}>${toDollars(expense.amount).toFixed(2)}</p>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.gridItem}>
            <CalendarBlank className={styles.gridIcon} />
            <div className={styles.gridText}>
              <label>Date</label>
              <span>{new Date(expense.created_at || '').toLocaleDateString()}</span>
            </div>
          </div>
          <div className={styles.gridItem}>
            <Wallet className={styles.gridIcon} />
            <div className={styles.gridText}>
              <label>Paid by</label>
              <span>{payer?.first_name || 'Someone'}</span>
            </div>
          </div>
          <div className={styles.gridItem}>
            <Tag className={styles.gridIcon} />
            <div className={styles.gridText}>
              <label>Category</label>
              <span>{expense.currency || 'General'}</span>
            </div>
          </div>
        </div>

        <div className={styles.splitsSection}>
          <div className={styles.splitHeader}>
            <Users size={18} />
            <h3>Splits</h3>
          </div>
          <div className={styles.splitList}>
            {splits.map(split => (
              <div key={split.user_id} className={styles.splitItem}>
                <div className={styles.userAvatar}>{(split.user?.first_name?.[0] || '?').toUpperCase()}</div>
                <span className={styles.userName}>{split.user?.first_name || 'Someone'}</span>
                <span className={styles.splitAmount}>${toDollars(split.amount_owed).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
