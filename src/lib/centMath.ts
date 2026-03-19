/**
 * Behavioral Rule 01 (Cents-Only Constraint)
 * All financial inputs, calculations, and DB entries strictly enforce a 2-decimal limit.
 */

export function toCents(amount: number | string): number {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return Math.round(value * 100);
}

export function toDollars(cents: number): number {
  return cents / 100;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Behavioral Rule 03 (Penny-Rest Determinism)
 * In an indivisible split, the remainder penny is assigned to the Payer.
 * Total splits must always perfectly sum to expense.amount.
 */
export function divideEquallyKeepRemainder(totalAmount: number, numPeople: number, payerIndex: number): number[] {
  const totalCents = toCents(totalAmount);
  if (numPeople === 0) return [];
  
  const baseShareCents = Math.floor(totalCents / numPeople);
  let remainderCents = totalCents % numPeople;
  
  const splits = new Array(numPeople).fill(baseShareCents);
  
  // Distribute the remainder primarily to the Payer
  if (remainderCents > 0) {
     splits[payerIndex] += remainderCents;
  }
  
  return splits.map(toDollars);
}

/**
 * Splits by provided percentages.
 * Remainder penny rule: assigned to Payer.
 */
export function divideByPercentages(totalAmount: number, percentages: number[], payerIndex: number): number[] {
  const totalCents = toCents(totalAmount);
  if (percentages.length === 0) return [];
  
  let totalCalculatedCents = 0;
  const splitsCents = percentages.map(p => {
    const cents = Math.floor(totalCents * (p / 100));
    totalCalculatedCents += cents;
    return cents;
  });
  
  const remainderCents = totalCents - totalCalculatedCents;
  if (remainderCents > 0) {
    splitsCents[payerIndex] += remainderCents;
  }
  
  return splitsCents.map(toDollars);
}

/**
 * Validates if the exact amounts precisely equal the total amount in cents.
 */
export function validateExactAmounts(totalAmount: number, exactAmounts: number[]): boolean {
  const totalCents = toCents(totalAmount);
  const sumCents = exactAmounts.reduce((acc, val) => acc + toCents(val), 0);
  return totalCents === sumCents;
}
