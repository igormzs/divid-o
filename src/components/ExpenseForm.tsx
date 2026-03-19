'use client';

import React, { useState } from 'react';
import styles from './ExpenseForm.module.css';
import { divideEquallyKeepRemainder, toCents, toDollars, divideByPercentages, validateExactAmounts } from '@/lib/centMath';
import { Scan, Users, Calculator, Percent } from '@phosphor-icons/react';

type User = { id: string; name: string };
type Group = { id: string; name: string };

interface ExpenseFormProps {
  groupMembers: User[];
  groups?: Group[];
  onSave: (expenseData: {
    description: string;
    amount: number;
    payerId: string;
    groupId: string;
    splits: { userId: string; amountOwed: number }[];
  }) => void;
  onCancel: () => void;
}

export default function ExpenseForm({ groupMembers, groups = [], onSave, onCancel }: ExpenseFormProps) {
  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [payerId, setPayerId] = useState(groupMembers[0]?.id || '');
  const [groupId, setGroupId] = useState(groups[0]?.id || '');
  const [splitType, setSplitType] = useState<'EQUALLY' | 'EXACT' | 'PERCENTAGE'>('EQUALLY');
  
  // Stores exact amounts or percentages input by the user keyed by userId
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const rawValue = parseFloat(amountInput) || 0; 
  const payerIndex = groupMembers.findIndex(u => u.id === payerId);
  const actualPayerIndex = Math.max(0, payerIndex); // fallback

  // Generate the real cent-perfect splits
  let calculatedSplits: number[] = [];
  let isValid = false;
  let validationError = '';

  if (rawValue > 0) {
    if (splitType === 'EQUALLY') {
      calculatedSplits = divideEquallyKeepRemainder(rawValue, groupMembers.length, actualPayerIndex);
      isValid = true;
    } else if (splitType === 'PERCENTAGE') {
      const percentages = groupMembers.map(m => parseFloat(customInputs[m.id]) || 0);
      const sumPc = percentages.reduce((acc, val) => acc + val, 0);
      if (Math.abs(sumPc - 100) < 0.01) {
        calculatedSplits = divideByPercentages(rawValue, percentages, actualPayerIndex);
        isValid = true;
      } else {
        validationError = `Percentages must add to 100% (currently ${sumPc.toFixed(1)}%)`;
      }
    } else if (splitType === 'EXACT') {
      const exacts = groupMembers.map(m => parseFloat(customInputs[m.id]) || 0);
      if (validateExactAmounts(rawValue, exacts)) {
        calculatedSplits = exacts;
        isValid = true;
      } else {
        const sumAmounts = exacts.reduce((acc, val) => acc + val, 0);
        validationError = `Exact amounts must add up precisely. Missing/Over: ${(rawValue - sumAmounts).toFixed(2)}`;
      }
    }
  }

  const handleCustomInputChange = (userId: string, val: string) => {
    setCustomInputs(prev => ({ ...prev, [userId]: val }));
  };

  const mockOCRScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setDescription('Dinner at Olive Garden');
      setAmountInput('145.82');
      setIsScanning(false);
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || rawValue <= 0 || !isValid) return;
    if (!groupId) {
      return;
    }

    setIsSaving(true);

    // Rule 01: Enforce Cents-Only math
    const totalCents = toCents(rawValue);
    const finalAmount = toDollars(totalCents);

    await onSave({
      description,
      amount: finalAmount,
      payerId,
      groupId,
      splits: groupMembers.map((m, i) => ({
        userId: m.id,
        amountOwed: calculatedSplits[i] || 0,
      })),
    });

    setIsSaving(false);
  };

  return (
    <div className={styles.overlay}>
      <form className={styles.formContainer} onSubmit={handleSubmit}>
        <div className={styles.header}>
          <button type="button" onClick={onCancel} className={styles.cancelBtn}>Cancel</button>
          <h3 className={styles.title}>Add Expense</h3>
          <button type="submit" className={styles.saveBtn} disabled={!isValid || !description || !groupId || isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {groups.length > 0 && (
          <div className={styles.inputGroup}>
            <label>Group</label>
            <select className={styles.select} value={groupId} onChange={e => setGroupId(e.target.value)}>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.ocrSection}>
          <button type="button" onClick={mockOCRScan} className={styles.ocrBtn} disabled={isScanning}>
             <Scan weight="bold" className={styles.ocrIcon} /> {isScanning ? 'Scanning Receipt...' : 'Smart Scan Receipt'}
          </button>
        </div>

        <div className={styles.inputGroup}>
          <label>Description</label>
          <input 
            autoFocus={!isScanning}
            className={styles.input} 
            type="text" 
            placeholder="e.g. Dinner at Mario's" 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className={styles.inputGroup}>
          <label>Total Amount</label>
          <div className={styles.amountWrapper}>
            <span className={styles.currencySymbol}>$</span>
            <input 
              className={`${styles.input} ${styles.amountInput}`} 
              type="number" 
              step="0.01"
              placeholder="0.00" 
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label>Paid by</label>
          <select className={styles.select} value={payerId} onChange={e => setPayerId(e.target.value)}>
            {groupMembers.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {amountInput && Number(amountInput) > 0 && (
          <div className={styles.splitSection}>
            <div className={styles.splitToggle}>
              <button type="button" className={`${styles.toggleBtn} ${splitType === 'EQUALLY' ? styles.activeToggle : ''}`} onClick={() => setSplitType('EQUALLY')}><Users weight="bold"/> Equally</button>
              <button type="button" className={`${styles.toggleBtn} ${splitType === 'EXACT' ? styles.activeToggle : ''}`} onClick={() => setSplitType('EXACT')}><Calculator weight="bold"/> Exact</button>
              <button type="button" className={`${styles.toggleBtn} ${splitType === 'PERCENTAGE' ? styles.activeToggle : ''}`} onClick={() => setSplitType('PERCENTAGE')}><Percent weight="bold"/> Percent</button>
            </div>

            {!isValid && validationError && (
              <div className={styles.validationError}>{validationError}</div>
            )}

            <ul className={styles.splitList}>
              {groupMembers.map((m, i) => (
                <li key={m.id} className={styles.splitItem}>
                  <span className={styles.splitName}>
                    {m.name} {m.id === payerId ? <span className={styles.payerBadge}>(Payer)</span> : ''}
                  </span>

                  {splitType === 'EQUALLY' ? (
                     <span className={styles.splitAmount}>${calculatedSplits[i]?.toFixed(2) || '0.00'}</span>
                  ) : (
                     <div className={styles.customInputWrapper}>
                       <input 
                          type="number"
                          step="0.01"
                          className={styles.customSplitInput}
                          placeholder="0"
                          value={customInputs[m.id] || ''}
                          onChange={(e) => handleCustomInputChange(m.id, e.target.value)}
                       />
                       <span className={styles.customSuffix}>{splitType === 'PERCENTAGE' ? '%' : '$'}</span>
                     </div>
                  )}
                </li>
              ))}
            </ul>
            
            {(splitType === 'EQUALLY' || splitType === 'PERCENTAGE') && isValid && (
              <p className={styles.ruleNote}>*Remainder pennies are cleanly assigned to the Payer</p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
