/**
 * In-Memory OTP Storage
 * Stores OTP codes temporarily for verification
 * 
 * In production, consider using Redis for better scalability
 */

interface OTPRecord {
  otp: string;
  phoneNumber: string;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
}

class OTPStore {
  private store: Map<string, OTPRecord> = new Map();
  private readonly MAX_ATTEMPTS = 3;
  private readonly EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);

  /**
   * Store OTP for a phone number
   */
  set(phoneNumber: string, otp: string): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.EXPIRY_MINUTES * 60 * 1000);

    this.store.set(phoneNumber, {
      otp,
      phoneNumber,
      createdAt: now,
      expiresAt,
      attempts: 0,
    });

    // Auto-cleanup after expiry
    setTimeout(() => {
      this.delete(phoneNumber);
    }, this.EXPIRY_MINUTES * 60 * 1000);
  }

  /**
   * Verify OTP for a phone number
   */
  verify(phoneNumber: string, otp: string): { valid: boolean; message: string } {
    const record = this.store.get(phoneNumber);

    if (!record) {
      return { valid: false, message: 'No OTP found. Please request a new one.' };
    }

    // Check expiry
    if (new Date() > record.expiresAt) {
      this.delete(phoneNumber);
      return { valid: false, message: 'OTP expired. Please request a new one.' };
    }

    // Check attempts
    if (record.attempts >= this.MAX_ATTEMPTS) {
      this.delete(phoneNumber);
      return { valid: false, message: 'Too many failed attempts. Please request a new OTP.' };
    }

    // Verify OTP
    if (record.otp === otp) {
      this.delete(phoneNumber);
      return { valid: true, message: 'OTP verified successfully' };
    }

    // Increment attempts on failure
    record.attempts += 1;
    this.store.set(phoneNumber, record);

    return {
      valid: false,
      message: `Invalid OTP. ${this.MAX_ATTEMPTS - record.attempts} attempts remaining.`,
    };
  }

  /**
   * Delete OTP for a phone number
   */
  delete(phoneNumber: string): void {
    this.store.delete(phoneNumber);
  }

  /**
   * Check if OTP exists and is still valid
   */
  has(phoneNumber: string): boolean {
    const record = this.store.get(phoneNumber);
    if (!record) return false;
    if (new Date() > record.expiresAt) {
      this.delete(phoneNumber);
      return false;
    }
    return true;
  }

  /**
   * Get time remaining for OTP (in seconds)
   */
  getTimeRemaining(phoneNumber: string): number | null {
    const record = this.store.get(phoneNumber);
    if (!record) return null;
    
    const remaining = Math.floor((record.expiresAt.getTime() - Date.now()) / 1000);
    return remaining > 0 ? remaining : null;
  }

  /**
   * Clear all OTPs (for testing/cleanup)
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get store size (for monitoring)
   */
  size(): number {
    return this.store.size;
  }
}

// Singleton instance
export const otpStore = new OTPStore();

export default otpStore;
