'use client';

import { useState, useEffect } from 'react';
import ExpenseForm from './ExpenseForm';

export default function GlobalModalManager() {
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  useEffect(() => {
    const handleOpen = () => setShowExpenseForm(true);
    window.addEventListener('open-expense-modal', handleOpen);
    return () => window.removeEventListener('open-expense-modal', handleOpen);
  }, []);

  if (!showExpenseForm) return null;

  return (
    <ExpenseForm 
      onClose={() => setShowExpenseForm(false)} 
      onSuccess={() => {
        // Optionally refresh current page data
        window.location.reload(); 
      }}
    />
  );
}
