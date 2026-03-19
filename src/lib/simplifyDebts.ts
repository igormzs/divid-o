/**
 * Deterministic "Simplify Debts" Algorithm (Flow Network / Greedy)
 * Takes a list of balances where negative is "owes money" and positive is "is owed money".
 * Returns a list of optimal transfers between members to settle all debts.
 *
 * Ensure inputs have been pre-processed mathematically via CentMath to prevent floating pt dust.
 */

import { toCents, toDollars } from './centMath';

export type Balance = {
  userId: string;
  balance: number; // positive = gets back, negative = owes
};

export type SettlementTransfer = {
  fromUser: string;
  toUser: string;
  amount: number;
};

export function simplifyDebts(balances: Balance[]): SettlementTransfer[] {
  // Convert everything to cents to strictly avoid floating point dust
  const centsBalances = balances.map(b => ({
    userId: b.userId,
    cents: toCents(b.balance)
  })).filter(b => b.cents !== 0);

  // Separate debtors and creditors
  const debtors = centsBalances.filter(b => b.cents < 0).sort((a, b) => a.cents - b.cents); // Most debt first
  const creditors = centsBalances.filter(b => b.cents > 0).sort((a, b) => b.cents - a.cents); // Most credit first

  const transfers: SettlementTransfer[] = [];

  let i = 0; // index for debtors
  let j = 0; // index for creditors

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    
    // Amount to settle in this step is the minimum of debt or credit available
    const amountToSettle = Math.min(-debtor.cents, creditor.cents);

    transfers.push({
      fromUser: debtor.userId,
      toUser: creditor.userId,
      amount: toDollars(amountToSettle)
    });

    // Adjust balances
    debtor.cents += amountToSettle;
    creditor.cents -= amountToSettle;

    // Move pointers if zeroed out
    if (debtor.cents === 0) i++;
    if (creditor.cents === 0) j++;
  }

  return transfers;
}
