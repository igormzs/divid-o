'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './ExpenseForm.module.css';
import { 
  toCents, 
  toDollars, 
  splitEqually,
  splitByExact,
  splitByPercentage,
  UserBalance
} from '@/lib/mathEngine';
import { 
  X,
  Check,
  Note,
  CurrencyCircleDollar,
  CalendarBlank,
  Users,
  Camera,
  Article,
  CaretRight,
  Divide,
  ListNumbers,
  Percent
} from '@phosphor-icons/react';
import { createTypedClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

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

export default function ExpenseForm({ onClose, onSuccess, preSelectedGroupId, editingExpenseId }: ExpenseFormProps) {
  const db = createTypedClient();
  const { user: authUser, profile } = useAuth();
  
  // Input states
  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [notes, setNotes] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [groupId, setGroupId] = useState<string | null>(preSelectedGroupId || null);
  
  // Split states
  const [splitType, setSplitType] = useState<'EQUALLY' | 'EXACT' | 'PERCENTAGE' | 'FULL'>('EQUALLY');
  const [payerId, setPayerId] = useState(authUser?.id || '');
  const [selectedFriends, setSelectedFriends] = useState<any[]>([]);
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  
  // UI states
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showFriendSelect, setShowFriendSelect] = useState(false);
  const [showSplitOptions, setShowSplitOptions] = useState(false);
  const [showCurrencySelect, setShowCurrencySelect] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load available friends (people you share groups with)
  const [availableFriends, setAvailableFriends] = useState<any[]>([]);

  useEffect(() => {
    if (!authUser) return;
    setPayerId(authUser.id);
    if (profile?.preferred_currency) {
      const c = CURRENCIES.find(x => x.code === profile.preferred_currency);
      if (c) setCurrency(c);
    }
    
    // Fetch friends
    const fetchFriends = async () => {
      const { data: myGroups } = await db.from('group_members').select('group_id').eq('user_id', authUser.id);
      if (myGroups && myGroups.length > 0) {
        const groupIds = myGroups.map(g => g.group_id);
        const { data: members } = await db.from('group_members').select('users(id, first_name, last_name, avatar_url)').in('group_id', groupIds);
        if (members) {
          const uniqueUsers = new Map();
          members.forEach((m: any) => {
            if (m.users && m.users.id !== authUser.id) uniqueUsers.set(m.users.id, m.users);
          });
          setAvailableFriends(Array.from(uniqueUsers.values()));
        }
      }
    };
    fetchFriends();
  }, [authUser, profile, db]);

  const totalCents = toCents(amountInput);
  const activeIds = [authUser?.id, ...selectedFriends.map(f => f.id)].filter(Boolean) as string[];
  
  let calculatedSplits: UserBalance[] = [];
  let isValid = description.trim() !== '' && totalCents > 0 && selectedFriends.length > 0;

  if (isValid) {
    if (splitType === 'EQUALLY') {
      calculatedSplits = splitEqually(totalCents, activeIds, payerId);
    } else if (splitType === 'EXACT') {
      const exacts: Record<string, number> = {};
      activeIds.forEach(id => exacts[id] = toCents(customInputs[id]) || 0);
      const sumCents = Object.values(exacts).reduce((a, b) => a + b, 0);
      if (sumCents === totalCents) {
        calculatedSplits = splitByExact(totalCents, activeIds, exacts);
      } else {
        isValid = false;
      }
    } else if (splitType === 'PERCENTAGE') {
      const pct: Record<string, number> = {};
      activeIds.forEach(id => pct[id] = parseFloat(customInputs[id]) || 0);
      const sumPct = Object.values(pct).reduce((a, b) => a + b, 0);
      if (Math.abs(sumPct - 100) < 0.01) {
        calculatedSplits = splitByPercentage(totalCents, activeIds, pct, payerId);
      } else {
        isValid = false;
      }
    }
  }

  const getSplitSummary = () => {
    if (selectedFriends.length === 0) return 'Select split';
    if (splitType === 'EQUALLY') return 'Split equally';
    
    // Check if it's an "All for X" case
    const values = Object.values(customInputs).map(v => toCents(v));
    const paidByOne = values.filter(v => v > 0).length === 1;
    if (splitType === 'EXACT' && paidByOne) {
      const payerId = Object.keys(customInputs).find(id => toCents(customInputs[id]) > 0);
      const name = payerId === authUser?.id ? 'you' : availableFriends.find(f => f.id === payerId)?.first_name;
      return `All for ${name}`;
    }

    if (splitType === 'EXACT') return 'Exact amounts';
    return 'Percentages';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;

    setIsUploadingReceipt(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${authUser.id}/${Date.now()}.${fileExt}`;
      const { data, error } = await db.storage
        .from('receipts')
        .upload(fileName, file);

      if (error) throw error;
      
      const { data: { publicUrl } } = db.storage
        .from('receipts')
        .getPublicUrl(data.path);

      setReceiptUrl(publicUrl);
      toast.success('Receipt uploaded!');
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleSave = async () => {
    if (!isValid || isSaving || !authUser) return;
    setIsSaving(true);
    
    try {
      const expenseBody = {
        description,
        amount: totalCents,
        currency: currency.code,
        paid_by: payerId,
        group_id: groupId,
        notes: notes || null,
        receipt_url: receiptUrl,
        created_at: new Date(expenseDate).toISOString()
      };

      const { data: newExp, error } = await db.from('expenses').insert(expenseBody).select().single();
      if (error) throw error;

      const splitRows = calculatedSplits.map(s => ({
        expense_id: newExp.id,
        user_id: s.userId,
        amount_owed: s.amount
      }));

      await db.from('expense_splits').insert(splitRows);
      
      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error('Error saving expense: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };


  if (isSuccess) {
    return (
      <div className={styles.overlay}>
        <div className={styles.successView}>
           <div className={styles.successIcon}><Check size={40} weight="bold" /></div>
           <h2 className={styles.successTitle}>Expense saved!</h2>
           <p className={styles.successMessage}>The expense <strong>{description}</strong> has been added.</p>
           <button onClick={onClose} className={styles.successBtn}>Return</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Top Bar */}
        <div className={styles.topBar}>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close"><X size={18} weight="bold" /></button>
          <span className={styles.title}>Add Expense</span>
          <button className={styles.saveBtn} onClick={handleSave} disabled={!isValid || isSaving}>
            {isSaving ? '...' : 'Save'}
          </button>
        </div>

        {/* With Whom Selector Row */}
        <div className={styles.withWhomRow}>
          <span className={styles.withWhomLabel}>With you and:</span>
          <button className={styles.friendSelectorBtn} onClick={() => setShowFriendSelect(true)}>
            {selectedFriends.length > 0 ? (
              <>
                {selectedFriends[0].avatar_url ? (
                  <img src={selectedFriends[0].avatar_url} className={styles.friendAvatar} alt="" />
                ) : (
                  <div className={styles.friendAvatar}>{selectedFriends[0].first_name?.[0]}</div>
                )}
                <span>
                  {selectedFriends[0].first_name}
                  {selectedFriends.length > 1 && ` +${selectedFriends.length - 1} others`}
                </span>
              </>
            ) : (
              'Select friends...'
            )}
          </button>
        </div>

        {/* Main Input Area */}
        <div className={styles.mainContent}>
          
          <div className={styles.inputRow}>
            <div className={styles.iconBox}><Article size={22} weight="bold" /></div>
            <div className={styles.inputWrapper}>
              <input 
                className={styles.textInput} 
                placeholder="What was it for?" 
                value={description}
                onChange={e => setDescription(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className={styles.amountInputContainer}>
            <button 
              className={styles.currencyIconBtn} 
              onClick={() => setShowCurrencySelect(true)}
              type="button"
            >
              {currency.symbol}
            </button>
            <div className={styles.inputWrapper}>
              <input 
                type="number"
                step="0.01"
                className={styles.numberInput} 
                placeholder="0.00" 
                value={amountInput}
                onChange={e => setAmountInput(e.target.value)}
              />
            </div>
          </div>
               <button className={styles.splitSummaryBtn} onClick={() => setShowSplitOptions(true)}>
            {getSplitSummary()}
          </button>

          <div className={styles.extraActionsGrid}>
            <button className={styles.actionCard} onClick={() => {
              const date = prompt('Date (YYYY-MM-DD):', expenseDate);
              if (date) setExpenseDate(date);
            }}>
              <CalendarBlank size={24} weight="bold" />
              <span>{expenseDate === new Date().toISOString().split('T')[0] ? 'Today' : expenseDate}</span>
            </button>
            
            <button className={styles.actionCard} onClick={() => {
              const confirmGroup = window.confirm('Remove from group?');
              if (confirmGroup) setGroupId(null);
            }}>
              <Users size={24} weight="bold" />
              <span>{groupId ? 'In Group' : 'No group'}</span>
            </button>

            <button 
              className={styles.actionCard} 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingReceipt}
            >
              <Camera size={24} weight="bold" />
              <span>{isUploadingReceipt ? 'Uploading...' : (receiptUrl ? 'Uploaded!' : 'Receipt')}</span>
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*" 
              onChange={handleFileUpload} 
            />

            <button className={styles.actionCard} onClick={() => {
              const note = prompt('Add extra notes:', notes);
              if (note !== null) setNotes(note);
            }}>
              <Note size={24} weight="bold" />
              <span>{notes ? 'Has Notes' : 'Notes'}</span>
            </button>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Currency Selection Embedded Modal */}
        {showCurrencySelect && (
          <div className={styles.embeddedModal}>
            <div className={styles.topBar}>
              <button className={styles.closeBtn} onClick={() => setShowCurrencySelect(false)}><X size={18} weight="bold" /></button>
              <span className={styles.title}>Currency</span>
              <div style={{ width: 32 }} />
            </div>
            <div className={styles.currencyGrid}>
              {CURRENCIES.map(c => (
                <button 
                  key={c.code} 
                  className={`${styles.currencyCard} ${currency.code === c.code ? styles.active : ''}`}
                  onClick={() => {
                    setCurrency(c);
                    setShowCurrencySelect(false);
                  }}
                >
                  <span className={styles.currencySymbol}>{c.symbol}</span>
                  <span className={styles.currencyCode}>{c.code}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Friend Selection Embedded Modal */}
        {showFriendSelect && (
          <div className={styles.embeddedModal}>
            <div className={styles.topBar}>
              <button className={styles.closeBtn} onClick={() => setShowFriendSelect(false)}><X size={18} weight="bold" /></button>
              <span className={styles.title}>Friends</span>
              <div style={{ width: 32 }} />
            </div>
            <div className={styles.friendList}>
              {availableFriends.map(f => {
                const isSelected = selectedFriends.some(sf => sf.id === f.id);
                return (
                  <button 
                    key={f.id} 
                    className={`${styles.friendItem} ${isSelected ? styles.selected : ''}`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedFriends(selectedFriends.filter(sf => sf.id !== f.id));
                      } else {
                        setSelectedFriends([...selectedFriends, f]);
                      }
                    }}
                  >
                    <div className={styles.friendAvatar}>{f.first_name?.[0]}</div>
                    <span style={{ flex: 1 }}>{f.first_name} {f.last_name}</span>
                    {isSelected && <Check size={18} weight="bold" style={{ color: 'var(--primary)' }} />}
                  </button>
                );
              })}
              <div style={{ padding: '16px 12px' }}>
                <button className={styles.saveBtn} style={{ width: '100%' }} onClick={() => setShowFriendSelect(false)}>
                  Done ({selectedFriends.length} selected)
                </button>
              </div>
              {availableFriends.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--outline)', marginTop: 24, fontSize: 13 }}>No friends found.</p>
              )}
            </div>
          </div>
        )}

        {/* Split Options Embedded Modal */}
        {showSplitOptions && (
          <div className={styles.embeddedModal}>
            <div className={styles.topBar}>
              <button className={styles.closeBtn} onClick={() => setShowSplitOptions(false)}><X size={18} weight="bold" /></button>
              <span className={styles.title}>Split Options</span>
              <div style={{ width: 32 }} />
            </div>
            <div className={styles.splitOptionsList}>
               {/* Quick Options */}
               <button className={`${styles.splitOptionCard} ${splitType === 'EQUALLY' ? styles.active : ''}`} onClick={() => { setSplitType('EQUALLY'); setShowSplitOptions(false); }}>
                  <div className={styles.splitIconBox}><Divide size={24} weight="bold" /></div>
                  <div className={styles.splitOptionInfo}>
                     <h4>Equally</h4>
                     <p>Split equal parts for everyone.</p>
                  </div>
               </button>

               <button className={`${styles.splitOptionCard} ${splitType === 'FULL' ? styles.active : ''}`} onClick={() => setSplitType('FULL')}>
                  <div className={styles.splitIconBox}><Check size={24} weight="bold" /></div>
                  <div className={styles.splitOptionInfo}>
                     <h4>All for one</h4>
                     <p>One person pays the full amount.</p>
                  </div>
               </button>

               {splitType === 'FULL' && (
                 <div className={styles.splitInputsList}>
                   {activeIds.map(id => {
                     const user = id === authUser?.id ? { first_name: 'You' } : availableFriends.find(f => f.id === id);
                     return (
                       <button 
                         key={id} 
                         className={styles.splitPayerItem}
                         onClick={() => {
                           const exacts: Record<string, string> = {};
                           activeIds.forEach(aid => exacts[aid] = aid === id ? amountInput : '0');
                           setCustomInputs(exacts);
                           setSplitType('EXACT');
                           setShowSplitOptions(false);
                         }}
                       >
                         <div className={styles.friendAvatar}>{user?.first_name?.[0]}</div>
                         <span>{user?.first_name}</span>
                         <CaretRight size={16} weight="bold" />
                       </button>
                     );
                   })}
                 </div>
               )}

               <div className={styles.divider} />

               {/* Custom Types */}
               <button className={`${styles.splitOptionCard} ${splitType === 'EXACT' ? styles.active : ''}`} onClick={() => setSplitType('EXACT')}>
                  <div className={styles.splitIconBox}><ListNumbers size={24} weight="bold" /></div>
                  <div className={styles.splitOptionInfo}>
                     <h4>Exact amounts</h4>
                     <p>Define the exact amount for each person.</p>
                  </div>
               </button>

               {splitType === 'EXACT' && (
                 <div className={styles.splitInputsList}>
                   {activeIds.map(id => {
                     const user = id === authUser?.id ? { first_name: 'You' } : availableFriends.find(f => f.id === id);
                     return (
                       <div key={id} className={styles.splitInputRow}>
                         <span>{user?.first_name}</span>
                         <input 
                           type="number" 
                           placeholder="0.00" 
                           value={customInputs[id] || ''} 
                           onChange={e => setCustomInputs({...customInputs, [id]: e.target.value})}
                         />
                       </div>
                     );
                   })}
                 </div>
               )}

               <button className={`${styles.splitOptionCard} ${splitType === 'PERCENTAGE' ? styles.active : ''}`} onClick={() => setSplitType('PERCENTAGE')}>
                  <div className={styles.splitIconBox}><Percent size={24} weight="bold" /></div>
                  <div className={styles.splitOptionInfo}>
                     <h4>Percentages</h4>
                     <p>Split by percentage of the total.</p>
                  </div>
               </button>

               {splitType === 'PERCENTAGE' && (
                 <div className={styles.splitInputsList}>
                   {activeIds.map(id => {
                     const user = id === authUser?.id ? { first_name: 'You' } : availableFriends.find(f => f.id === id);
                     return (
                       <div key={id} className={styles.splitInputRow}>
                         <span>{user?.first_name}</span>
                         <input 
                           type="number" 
                           placeholder="0" 
                           value={customInputs[id] || ''} 
                           onChange={e => setCustomInputs({...customInputs, [id]: e.target.value})}
                         />
                         <span className={styles.unit}>%</span>
                       </div>
                     );
                   })}
                 </div>
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
