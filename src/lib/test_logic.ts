import { splitEqually, simplifyDebts, toCents, toDollars } from './mathEngine';

function testPennyRest() {
  console.log('Testing Penny-Rest Rule...');
  const total = toCents(10.00); // 1000 cents
  const users = ['Alice', 'Bob', 'Charlie'];
  const payer = 'Alice';

  const splits = splitEqually(total, users, payer);
  
  console.log('Splits:', splits);
  
  const sum = splits.reduce((acc, s) => acc + s.amount, 0);
  console.log('Total Sum:', sum, '(Expected: 1000)');

  const aliceShare = splits.find(s => s.userId === 'Alice')?.amount;
  console.log('Alice (Payer) Share:', aliceShare, '(Expected: 334)');

  if (sum === 1000 && aliceShare === 334) {
    console.log('✅ Penny-Rest Test Passed');
  } else {
    console.error('❌ Penny-Rest Test Failed');
  }
}

function testDebtSimplification() {
  console.log('\nTesting Debt Simplification...');
  
  // Scenario:
  // Alice owes Bob $10
  // Bob owes Charlie $10
  // Net balances:
  // Alice: -1000
  // Bob: 0 (Received 1000 from Alice, owes 1000 to Charlie)
  // Charlie: +1000
  
  const netBalances = {
    'Alice': -1000,
    'Bob': 0,
    'Charlie': 1000
  };

  const transfers = simplifyDebts(netBalances);
  console.log('Transfers:', transfers);

  if (transfers.length === 1 && transfers[0].from === 'Alice' && transfers[0].to === 'Charlie' && transfers[0].amount === 1000) {
    console.log('✅ Debt Simplification Test Passed');
  } else {
    console.error('❌ Debt Simplification Test Failed');
  }
}

function testComplexScenario() {
  console.log('\nTesting Complex Scenario...');
  
  // A paid 30 for A, B, C (10 each)
  // B paid 30 for B, C, D (10 each)
  // Net:
  // A: +20 (Paid 30, owes 10)
  // B: +10 (Paid 30, owes 20)
  // C: -20 (Owes 10 to A, 10 to B)
  // D: -10 (Owes 10 to B)
  
  const netBalances = {
    'A': 2000,
    'B': 1000,
    'C': -2000,
    'D': -1000
  };

  const transfers = simplifyDebts(netBalances);
  console.log('Transfers:', transfers);
  
  // Total debt = 3000. Total credit = 3000.
  // Transfers should sum to 3000.
  const totalTransferred = transfers.reduce((acc, t) => acc + t.amount, 0);
  console.log('Total Transferred:', totalTransferred, '(Expected: 3000)');

  if (totalTransferred === 3000 && transfers.length <= 3) {
    console.log('✅ Complex Scenario Test Passed');
  } else {
    console.error('❌ Complex Scenario Test Failed');
  }
}

testPennyRest();
testDebtSimplification();
testComplexScenario();
