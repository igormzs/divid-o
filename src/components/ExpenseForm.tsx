'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './ExpenseForm.module.css';
import { 
  toCents, 
  toDollars, 
  splitEqually,
  splitByExact,
  UserBalance
} from '@/lib/mathEngine';
import { 
  X,
  Check
} from '@phosphor-icons/react';
import { createTypedClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

type User = { id: string; name: string; email?: string };
type Group = { id: string; name: string };

const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
  { code: 'CAD', symbol: '$' },
  { code: 'AUD', symbol: '$' },
  { code: 'CHF', symbol: 'Fr' },
  { code: 'CNY', symbol: '¥' },
  { code: 'HKD', symbol: '$' },
  { code: 'NZD', symbol: '$' },
  { code: 'SEK', symbol: 'kr' },
  { code: 'KRW', symbol: '₩' },
  { code: 'SGD', symbol: '$' },
  { code: 'NOK', symbol: 'kr' },
  { code: 'MXN', symbol: '$' },
  { code: 'INR', symbol: '₹' },
  { code: 'RUB', symbol: '₽' },
  { code: 'ZAR', symbol: 'R' },
  { code: 'TRY', symbol: '₺' },
  { code: 'BRL', symbol: 'R$' },
];

interface ExpenseFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  preSelectedGroupId?: string;
  editingExpenseId?: string;
}

import { useAuth } from '@/context/AuthContext';

export default function ExpenseForm({ 
  onClose, 
  onSuccess, 
  preSelectedGroupId, 
  editingExpenseId 
}: ExpenseFormProps) {
  const db = createTypedClient();
  const { user: authUser } = useAuth();
  const currencyPickerRef = useRef<HTMLDivElement>(null);

  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [payerId, setPayerId] = useState('');
  const [groupId, setGroupId] = useState(preSelectedGroupId || '');
  const [splitType, setSplitType] = useState<'EQUALLY' | 'EXACT'>('EQUALLY');
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [allMembers, setAllMembers] = useState<User[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadInitialData = useCallback(async () => {
    if (!authUser) return;
    setIsLoading(true);
    try {
      // Parallelize primary data fetching
      const [groupsRes, editingRes] = await Promise.all([
        db.from('group_members').select('groups(id, name)').eq('user_id', authUser.id),
        editingExpenseId 
          ? db.from('expenses').select('*, expense_splits(*)').eq('id', editingExpenseId).single()
          : Promise.resolve({ data: null, error: null })
      ]);

      const formattedGroups = (groupsRes.data ?? []).map(g => (g as any).groups as Group).filter(Boolean);
      setGroups(formattedGroups);

      const exp = editingRes.data;
      const currentGroupId = exp?.group_id || groupId || formattedGroups[0]?.id;
      
      if (currentGroupId) {
        setGroupId(currentGroupId);
        await fetchMembers(currentGroupId);
      }

      if (exp) {
        setDescription(exp.description);
        setAmountInput((exp.amount / 100).toFixed(2));
        setPayerId(exp.paid_by);
        const curr = CURRENCIES.find(c => c.code === exp.currency) || CURRENCIES[0];
        setCurrency(curr);
        
        const inputs: Record<string, string> = {};
        const selected = new Set<string>();
        exp.expense_splits.forEach((s: any) => { 
          inputs[s.user_id] = (s.amount_owed / 100).toFixed(2); 
          selected.add(s.user_id);
        });
        setCustomInputs(inputs);
        setSelectedMemberIds(selected);
        setSplitType('EQUALLY'); 
        setShowMoreOptions(true);
      } else {
        setPayerId(authUser.id);
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, [editingExpenseId, groupId, authUser, db]);

  const fetchMembers = async (gid: string) => {
    const { data: memData } = await db.from('group_members').select('users(id, email, first_name, last_name)').eq('group_id', gid);
    const users = (memData ?? []).map(m => {
      const u = (m as any).users;
      return { 
        id: u.id, 
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
        email: u.email
      };
    });
    setAllMembers(users);
    if (!editingExpenseId) {
      setSelectedMemberIds(new Set(users.map(u => u.id)));
    }
  };

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  useEffect(() => {
    if (authUser && !editingExpenseId) {
      db.from('users').select('preferred_currency').eq('id', authUser.id).single()
        .then(({ data }) => {
          if (data?.preferred_currency) {
            const curr = CURRENCIES.find(c => c.code === data.preferred_currency);
            if (curr) setCurrency(curr);
          }
        });
    }
  }, [authUser, editingExpenseId, db]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (currencyPickerRef.current && !currencyPickerRef.current.contains(event.target as Node)) {
        setShowCurrencyPicker(false);
      }
    };
    if (showCurrencyPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCurrencyPicker]);

  const toggleMember = (id: string) => {
    const newSet = new Set(selectedMemberIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedMemberIds(newSet);
  };

  const totalCents = toCents(amountInput);
  const activeIds = Array.from(selectedMemberIds);
  let calculatedSplits: UserBalance[] = [];
  let isValid = false;

  if (totalCents > 0 && activeIds.length > 0) {
    if (splitType === 'EQUALLY') {
      calculatedSplits = splitEqually(totalCents, activeIds, payerId);
      isValid = true;
    } else if (splitType === 'EXACT') {
      const exacts: Record<string, number> = {};
      activeIds.forEach(id => exacts[id] = toCents(customInputs[id]) || 0);
      const sumCents = Object.values(exacts).reduce((acc, val) => acc + val, 0);
      if (sumCents === totalCents) {
        calculatedSplits = splitByExact(totalCents, activeIds, exacts);
        isValid = true;
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || totalCents <= 0 || !isValid) return;
    setIsSaving(true);
    try {
      const expenseBody = { 
        description, 
        amount: totalCents, 
        paid_by: payerId, 
        group_id: groupId,
        currency: currency.code
      };
      let currentExpenseId = editingExpenseId;

      if (editingExpenseId) {
        await db.from('expenses').update(expenseBody).eq('id', editingExpenseId);
      } else {
        const { data: newExp, error } = await db.from('expenses').insert(expenseBody).select().single();
        if (error) throw error;
        currentExpenseId = newExp.id;
      }

      if (editingExpenseId) await db.from('expense_splits').delete().eq('expense_id', editingExpenseId);

      const splitRows = calculatedSplits.map((split) => ({
        expense_id: currentExpenseId!,
        user_id: split.userId,
        amount_owed: split.amount,
      }));

      await db.from('expense_splits').insert(splitRows);
      toast.success('Expense saved!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setIsSaving(false); }
  };

  const isOneOnOne = allMembers.length === 2;
  const otherMember = allMembers.find(m => m.id !== authUser?.id);

  const getQuickOption = (opt: number) => {
    const meId = authUser?.id;
    const themId = otherMember?.id;
    if (!meId || !themId) return false;

    if (opt === 1) return payerId === meId && selectedMemberIds.size === 2;
    if (opt === 2) return payerId === meId && selectedMemberIds.size === 1 && selectedMemberIds.has(themId);
    if (opt === 3) return payerId === themId && selectedMemberIds.size === 2;
    if (opt === 4) return payerId === themId && selectedMemberIds.size === 1 && selectedMemberIds.has(meId);
    return false;
  };

  const handleQuickSelect = (opt: number) => {
    const meId = authUser?.id;
    const themId = otherMember?.id;
    if (!meId || !themId) return;

    setSplitType('EQUALLY');
    if (opt === 1) { setPayerId(meId); setSelectedMemberIds(new Set([meId, themId])); }
    if (opt === 2) { setPayerId(meId); setSelectedMemberIds(new Set([themId])); }
    if (opt === 3) { setPayerId(themId); setSelectedMemberIds(new Set([meId, themId])); }
    if (opt === 4) { setPayerId(themId); setSelectedMemberIds(new Set([meId])); }
  };

  if (isLoading) return null;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()} role="presentation">
      <div 
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={editingExpenseId ? "Edit Expense" : "Add Expense"}
      >
        
        <header className={styles.header}>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close expense form"><X size={20} weight="bold" aria-hidden="true" /></button>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 1. Description Card (TOP) */}
          <div className={styles.card}>
            <div className={styles.inputGroup}>
              <label htmlFor="expense-desc" className={styles.label}>Description</label>
              <input 
                id="expense-desc"
                className={styles.inputField}
                placeholder="What was it for?" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                autoFocus
              />
            </div>
          </div>

          {/* 2. Amount Card (MIDDLE) */}
          <div className={styles.card}>
            <div className={styles.inputGroup}>
              <label htmlFor="expense-amount" className={styles.label}>Amount</label>
              <div className={styles.amountWrapper}>
                <button 
                  type="button"
                  className={`${styles.currency} unstyled-btn`} 
                  onClick={(e) => { e.stopPropagation(); setShowCurrencyPicker(!showCurrencyPicker); }}
                  aria-expanded={showCurrencyPicker}
                  aria-label="Select currency"
                  style={{ width: 'auto' }}
                >
                  {currency.symbol}
                  {showCurrencyPicker && (
                    <div className={styles.currencyPicker} ref={currencyPickerRef} role="listbox">
                      {CURRENCIES.map(c => (
                        <button 
                          key={c.code} 
                          type="button"
                          className={`unstyled-btn ${styles.currencyItem} ${currency.code === c.code ? styles.active : ''}`} 
                          onClick={(e) => { e.stopPropagation(); setCurrency(c); setShowCurrencyPicker(false); }}
                          role="option"
                          aria-selected={currency.code === c.code}
                        >
                          <span className={styles.currencySym} aria-hidden="true">{c.symbol}</span>
                          <span className={styles.currencyCode}>{c.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </button>
                <input 
                  id="expense-amount"
                  className={styles.amountInput}
                  type="number" step="0.01" 
                  placeholder="0.00" 
                  value={amountInput} 
                  onChange={e => setAmountInput(e.target.value)} 
                />
              </div>
            </div>
          </div>

          {/* 3. Split Options (BOTTOM) */}
          {!showMoreOptions && isOneOnOne ? (
            <div>
              <h3 className={styles.sectionTitle}>Como essa despesa foi dividida?</h3>
              <div className={styles.quickSplitList} style={{ marginTop: '12px' }}>
                <button type="button" className={`unstyled-btn ${styles.quickOption} ${getQuickOption(1) ? styles.active : ''}`} onClick={() => handleQuickSelect(1)} aria-pressed={getQuickOption(1)}>
                  <div className={styles.quickAvatars} aria-hidden="true">
                    <div className={`${styles.quickAvatar} ${styles.primary}`}>ME</div>
                    <div className={styles.quickAvatar}>{otherMember?.name.substring(0,2).toUpperCase()}</div>
                  </div>
                  <div className={styles.quickDetails}>
                    <span className={styles.quickTitle}>Você pagou, dividir igualmente.</span>
                    <span className={`${styles.quickSub} ${styles.positive}`}>
                      {otherMember?.name} deve a você {currency.symbol} {amountInput ? (parseFloat(amountInput)/2).toFixed(2) : '0.00'}
                    </span>
                  </div>
                  {getQuickOption(1) && <Check size={20} weight="bold" className={styles.checkIcon} aria-hidden="true" />}
                </button>

                <button type="button" className={`unstyled-btn ${styles.quickOption} ${getQuickOption(2) ? styles.active : ''}`} onClick={() => handleQuickSelect(2)} aria-pressed={getQuickOption(2)}>
                  <div className={styles.quickAvatars} aria-hidden="true">
                    <div className={`${styles.quickAvatar} ${styles.primary}`}>ME</div>
                    <div className={styles.quickAvatar}>{otherMember?.name.substring(0,2).toUpperCase()}</div>
                  </div>
                  <div className={styles.quickDetails}>
                    <span className={styles.quickTitle}>Você tem o valor total a receber.</span>
                    <span className={`${styles.quickSub} ${styles.positive}`}>
                      {otherMember?.name} deve a você {currency.symbol} {amountInput ? parseFloat(amountInput).toFixed(2) : '0.00'}
                    </span>
                  </div>
                  {getQuickOption(2) && <Check size={20} weight="bold" className={styles.checkIcon} aria-hidden="true" />}
                </button>

                <button type="button" className={`unstyled-btn ${styles.quickOption} ${getQuickOption(3) ? styles.active : ''}`} onClick={() => handleQuickSelect(3)} aria-pressed={getQuickOption(3)}>
                  <div className={styles.quickAvatars} aria-hidden="true">
                    <div className={styles.quickAvatar}>{otherMember?.name.substring(0,2).toUpperCase()}</div>
                    <div className={`${styles.quickAvatar} ${styles.primary}`}>ME</div>
                  </div>
                  <div className={styles.quickDetails}>
                    <span className={styles.quickTitle}>{otherMember?.name} pagou, dividir igualmente.</span>
                    <span className={`${styles.quickSub} ${styles.negative}`}>
                      Você deve {currency.symbol} {amountInput ? (parseFloat(amountInput)/2).toFixed(2) : '0.00'} a {otherMember?.name}
                    </span>
                  </div>
                  {getQuickOption(3) && <Check size={20} weight="bold" className={styles.checkIcon} aria-hidden="true" />}
                </button>

                <button type="button" className={`unstyled-btn ${styles.quickOption} ${getQuickOption(4) ? styles.active : ''}`} onClick={() => handleQuickSelect(4)} aria-pressed={getQuickOption(4)}>
                  <div className={styles.quickAvatars} aria-hidden="true">
                    <div className={styles.quickAvatar}>{otherMember?.name.substring(0,2).toUpperCase()}</div>
                    <div className={`${styles.quickAvatar} ${styles.primary}`}>ME</div>
                  </div>
                  <div className={styles.quickDetails}>
                    <span className={styles.quickTitle}>{otherMember?.name} tem o valor total a receber.</span>
                    <span className={`${styles.quickSub} ${styles.negative}`}>
                      Você deve {currency.symbol} {amountInput ? parseFloat(amountInput).toFixed(2) : '0.00'} a {otherMember?.name}
                    </span>
                  </div>
                  {getQuickOption(4) && <Check size={20} weight="bold" className={styles.checkIcon} aria-hidden="true" />}
                </button>

                <button type="button" className={styles.moreOptionsBtn} onClick={() => setShowMoreOptions(true)}>
                  Mais opções
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.card}>
                <div className={styles.paidByCard}>
                  <label htmlFor="group-select" className={styles.label}>Group</label>
                  <select id="group-select" className={styles.selectBox} value={groupId} onChange={e => { setGroupId(e.target.value); fetchMembers(e.target.value); }}>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <label htmlFor="payer-select" className={styles.label} style={{ marginTop: '12px' }}>Payer</label>
                  <div className={styles.paidByRow} style={{ marginTop: '4px' }}>
                    <div className={styles.userBadge} aria-hidden="true">
                      <div className={styles.avatar}>{payerId === authUser?.id ? 'ME' : allMembers.find(m => m.id === payerId)?.name.substring(0,2).toUpperCase()}</div>
                      <span className={styles.userName}>{payerId === authUser?.id ? 'You' : allMembers.find(m => m.id === payerId)?.name}</span>
                    </div>
                    <select id="payer-select" className={styles.changeBtn} value={payerId} onChange={(e) => setPayerId(e.target.value)} style={{ appearance: 'none', cursor: 'pointer', textAlign: 'center' }}>
                      {allMembers.map(m => <option key={m.id} value={m.id}>{m.id === authUser?.id ? 'You' : m.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className={styles.sectionTitle}>Split with friends</h3>
                <div className={styles.friendList} style={{ marginTop: '16px' }}>
                  {allMembers.map(m => {
                    const isSelected = selectedMemberIds.has(m.id);
                    return (
                        <button 
                          key={m.id} 
                          type="button"
                          className={`unstyled-btn ${styles.friendCard} ${isSelected ? styles.selected : ''}`} 
                          onClick={() => toggleMember(m.id)}
                          aria-pressed={isSelected}
                        >
                          <div className={styles.friendInfo}>
                            <div className={styles.friendAvatar} aria-hidden="true">{m.id === authUser?.id ? 'ME' : m.name.substring(0, 2).toUpperCase()}</div>
                            <div className={styles.friendDetails}>
                              <span className={styles.friendName}>{m.id === authUser?.id ? 'You' : m.name}</span>
                              {m.email && <span className={styles.friendEmail}>{m.email}</span>}
                            </div>
                          </div>
                          <div className={`${styles.checkbox} ${isSelected ? styles.checked : ''}`} aria-hidden="true">{isSelected && <Check size={16} weight="bold" />}</div>
                        </button>
                    );
                  })}
                </div>
                {isOneOnOne && (
                  <button type="button" className={styles.moreOptionsBtn} onClick={() => setShowMoreOptions(false)}>
                    Show quick options
                  </button>
                )}
              </div>
            </>
          )}

          <button 
            type="submit"
            className={styles.submitBtn} 
            disabled={!isValid || !description || isSaving || activeIds.length === 0}
          >
            {isSaving ? 'Saving...' : 'Split Now'}
          </button>
        </form>

      </div>
    </div>
  );
}
