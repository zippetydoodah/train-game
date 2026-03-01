import { STARTING_TREASURY } from '../types/costs';

export class TreasuryManager {
  private balance: number;

  constructor(initialBalance: number = STARTING_TREASURY) {
    this.balance = initialBalance;
  }

  getBalance(): number {
    return this.balance;
  }

  /**
   * Attempt to debit (spend) the given amount.
   * Debt IS allowed (balance can go negative), so this always succeeds.
   * Returns the new balance.
   */
  debit(amount: number): number {
    if (amount < 0) {
      console.warn('TreasuryManager.debit called with negative amount:', amount);
      return this.balance;
    }
    this.balance -= amount;
    return this.balance;
  }

  /**
   * Check if debiting this amount would cross from positive to negative balance.
   */
  wouldEnterDebt(amount: number): boolean {
    return this.balance >= 0 && (this.balance - amount) < 0;
  }

  /**
   * Credit (add) the given amount (e.g., demolish refund).
   * Returns the new balance.
   */
  credit(amount: number): number {
    if (amount < 0) {
      console.warn('TreasuryManager.credit called with negative amount:', amount);
      return this.balance;
    }
    this.balance += amount;
    return this.balance;
  }

  isInDebt(): boolean {
    return this.balance < 0;
  }

  setBalance(balance: number): void {
    this.balance = balance;
  }

  /**
   * Format balance for display: "\u00A31,234" or "-\u00A35,678".
   * Uses comma grouping. No decimals (integer only).
   */
  static formatBalance(amount: number): string {
    const abs = Math.abs(amount);
    const formatted = abs.toLocaleString('en-GB');
    return amount < 0 ? `-\u00A3${formatted}` : `\u00A3${formatted}`;
  }
}
