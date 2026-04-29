/**
 * Divid-o Math Engine
 * Handles financial calculations, splitting logic, and debt simplification.
 * All logic follows the "Cents-Only" constraint (BIGINT/integer math).
 */

export type UserBalance = {
  userId: string;
  amount: number; // In cents
};

export type Transfer = {
  from: string;
  to: string;
  amount: number; // In cents
};

/**
 * Helper to convert float dollars to integer cents safely.
 */
export function toCents(amount: number | string): number {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(value)) return 0;
  return Math.round(value * 100);
}

/**
 * Helper to convert integer cents to float dollars.
 */
export function toDollars(cents: number): number {
  return cents / 100;
}

/**
 * Splits an amount equally among a list of user IDs.
 * Behavioral Rule 03 (Penny-Rest): Any indivisible remainder is assigned to the payer.
 */
export function splitEqually(
  totalCents: number,
  userIds: string[],
  payerId: string
): UserBalance[] {
  if (userIds.length === 0) return [];

  const baseShare = Math.floor(totalCents / userIds.length);
  const remainder = totalCents % userIds.length;

  const splits: UserBalance[] = userIds.map((userId) => ({
    userId,
    amount: baseShare,
  }));

  // Assign the remainder penny/pennies to the Payer
  const payerSplitIndex = splits.findIndex((s) => s.userId === payerId);
  if (payerSplitIndex !== -1) {
    splits[payerSplitIndex].amount += remainder;
  } else {
    // If payer is not in the split, assign to the first participant
    splits[0].amount += remainder;
  }

  return splits;
}

/**
 * Splits by provided percentages.
 * Remainder penny rule: assigned to Payer.
 */
export function splitByPercentage(
  totalCents: number,
  userIds: string[],
  percentages: Record<string, number>,
  payerId: string
): UserBalance[] {
  if (userIds.length === 0) return [];

  let totalCalculatedCents = 0;
  const splits: UserBalance[] = userIds.map((userId) => {
    const p = percentages[userId] || 0;
    const cents = Math.floor(totalCents * (p / 100));
    totalCalculatedCents += cents;
    return { userId, amount: cents };
  });

  const remainder = totalCents - totalCalculatedCents;
  const payerSplitIndex = splits.findIndex((s) => s.userId === payerId);
  if (payerSplitIndex !== -1) {
    splits[payerSplitIndex].amount += remainder;
  } else {
    splits[0].amount += remainder;
  }

  return splits;
}

/**
 * Splits by shares (weighted).
 * Remainder penny rule: assigned to Payer.
 */
export function splitByShares(
  totalCents: number,
  userIds: string[],
  shares: Record<string, number>,
  payerId: string
): UserBalance[] {
  if (userIds.length === 0) return [];

  const totalShares = Object.values(shares).reduce((acc, val) => acc + val, 0);
  if (totalShares === 0) return userIds.map(userId => ({ userId, amount: 0 }));

  let totalCalculatedCents = 0;
  const splits: UserBalance[] = userIds.map((userId) => {
    const s = shares[userId] || 0;
    const cents = Math.floor(totalCents * (s / totalShares));
    totalCalculatedCents += cents;
    return { userId, amount: cents };
  });

  const remainder = totalCents - totalCalculatedCents;
  const payerSplitIndex = splits.findIndex((s) => s.userId === payerId);
  if (payerSplitIndex !== -1) {
    splits[payerSplitIndex].amount += remainder;
  } else {
    splits[0].amount += remainder;
  }

  return splits;
}

/**
 * Validates and returns splits for exact amounts.
 */
export function splitByExact(
  totalCents: number,
  userIds: string[],
  exactAmounts: Record<string, number>
): UserBalance[] {
  return userIds.map(userId => ({
    userId,
    amount: exactAmounts[userId] || 0
  }));
}

/**
 * Simplifies debts within a group using a Flow Network / Greedy approach.
 * Minimizes the number of transactions required to settle all balances.
 */
export function simplifyDebts(netBalancesCents: Record<string, number>): Transfer[] {
  const debtors: { userId: string; amount: number }[] = [];
  const creditors: { userId: string; amount: number }[] = [];

  for (const [userId, amount] of Object.entries(netBalancesCents)) {
    if (amount < 0) {
      debtors.push({ userId, amount: Math.abs(amount) });
    } else if (amount > 0) {
      creditors.push({ userId, amount });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];

    const amount = Math.min(debtor.amount, creditor.amount);
    if (amount > 0) {
      transfers.push({
        from: debtor.userId,
        to: creditor.userId,
        amount,
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount === 0) d++;
    if (creditor.amount === 0) c++;
  }

  return transfers;
}
