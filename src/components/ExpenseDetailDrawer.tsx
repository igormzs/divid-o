'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './ExpenseForm.module.css';
import { toDollars } from '@/lib/mathEngine';
import { 
  X,
  Trash,
  PencilSimple,
  User,
  CalendarBlank
} from '@phosphor-icons/react';
import { createTypedClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

interface ExpenseDetailDrawerProps {
  expenseId: string;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDeleteSuccess: () => void;
}

export default function ExpenseDetailDrawer({ 
  expenseId, 
  onClose, 
  onEdit, 
  onDeleteSuccess 
}: ExpenseDetailDrawerProps) {
  const db = createTypedClient();
  const [expense, setExpense] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: exp } = await db.from('expenses').select('*, expense_splits(*)').eq('id', expenseId).single();
      if (exp) {
        setExpense(exp);
        const { data: groupMembers } = await db.from('group_members').select('users(*)').eq('group_id', exp.group_id);
        setMembers((groupMembers ?? []).map(m => (m as any).users));
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, [expenseId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    setIsDeleting(true);
    try {
      await db.from('expenses').delete().eq('id', expenseId);
      toast.success('Expense deleted');
      onDeleteSuccess();
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setIsDeleting(false); }
  };

  if (isLoading || !expense) return (
    <div className={`${styles.overlay} ${styles.overlayDrawer}`}>
      <div className={styles.drawer}>
        <p style={{ opacity: 0.6 }}>Carregando detalhes...</p>
      </div>
    </div>
  );

  const payer = members.find(m => m.id === expense.paid_by);
  const formattedDate = new Date(expense.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className={`${styles.overlay} ${styles.overlayDrawer}`} onClick={(e) => e.target === e.currentTarget && onClose()} role="presentation">
      <div 
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Expense Details"
      >
        <header className={styles.header}>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close expense details"><X size={20} weight="bold" aria-hidden="true" /></button>
        </header>

        <div className={styles.detailHeader}>
          <span className={styles.detailDescription}>{expense.description}</span>
          <div className={styles.detailAmount}>
            {expense.currency || '$'} {toDollars(expense.amount).toFixed(2)}
          </div>
        </div>

        <div className={styles.detailSection}>
          <div className={styles.detailRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} color="var(--outline)" aria-hidden="true" />
              <span className={styles.detailLabel}>Pago por</span>
            </div>
            <span className={styles.detailValue}>{payer?.first_name || 'Alguém'}</span>
          </div>

          <div className={styles.detailRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarBlank size={18} color="var(--outline)" aria-hidden="true" />
              <span className={styles.detailLabel}>Data</span>
            </div>
            <span className={styles.detailValue}>{formattedDate}</span>
          </div>
        </div>

        <div style={{ marginTop: '24px' }}>
          <h3 className={styles.sectionTitle}>Divisão</h3>
          <div className={styles.detailSection} style={{ marginTop: '16px' }}>
            {expense.expense_splits.map((split: any) => {
              const member = members.find(m => m.id === split.user_id);
              return (
                <div key={split.user_id} className={styles.detailRow}>
                  <span className={styles.detailValue}>{member?.first_name || 'Membro'}</span>
                  <span className={styles.detailValue}>
                    {expense.currency || '$'} {toDollars(split.amount_owed).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.drawerActions}>
          <button className={styles.deleteBtn} onClick={handleDelete} disabled={isDeleting} aria-label="Delete expense">
            <Trash size={20} weight="bold" aria-hidden="true" />
          </button>
          <button className={styles.editBtn} onClick={() => onEdit(expenseId)}>
            Editar despesa
          </button>
        </div>
      </div>
    </div>
  );
}
