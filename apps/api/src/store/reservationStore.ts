/**
 * Concurrency-Safe Slot Reservation & Idempotency Store
 * 
 * Google Sheets uses a read-then-append pattern which is susceptible to race conditions
 * under simultaneous booking traffic. This in-memory transactional reservation store
 * provides atomic mutex locking with TTL and idempotency key caching.
 */

interface SlotLock {
  slotKey: string;
  holderId: string;
  expiresAt: number;
  isCommitted: boolean;
  bookingId?: string;
}

interface IdempotencyRecord {
  key: string;
  response: any;
  createdAt: number;
}

export class ReservationStore {
  private static instance: ReservationStore;
  private locks: Map<string, SlotLock> = new Map();
  private idempotencyRecords: Map<string, IdempotencyRecord> = new Map();

  private constructor() {
    // Periodically clean up expired locks every 30 seconds
    setInterval(() => this.cleanupExpiredLocks(), 30000);
  }

  public static getInstance(): ReservationStore {
    if (!ReservationStore.instance) {
      ReservationStore.instance = new ReservationStore();
    }
    return ReservationStore.instance;
  }

  public getSlotKey(doctorId: string, date: string, time: string): string {
    return `${doctorId}:${date}:${time}`;
  }

  /**
   * Atomically acquire a temporary lock for a doctor's date and time slot.
   * Returns true if lock was acquired, false if already locked/held.
   */
  public acquireLock(slotKey: string, holderId: string, ttlMs: number = 60000): boolean {
    this.cleanupExpiredLocks();
    const existing = this.locks.get(slotKey);

    const now = Date.now();
    if (existing) {
      if (existing.isCommitted) {
        return false; // Already permanently booked
      }
      if (existing.expiresAt > now && existing.holderId !== holderId) {
        return false; // Currently locked by another concurrent process
      }
    }

    // Acquire lock
    this.locks.set(slotKey, {
      slotKey,
      holderId,
      expiresAt: now + ttlMs,
      isCommitted: false,
    });
    return true;
  }

  /**
   * Commit the lock once booking is confirmed in Google Sheets & Calendar.
   */
  public commitLock(slotKey: string, bookingId: string): void {
    const existing = this.locks.get(slotKey);
    if (existing) {
      existing.isCommitted = true;
      existing.bookingId = bookingId;
      existing.expiresAt = Number.MAX_SAFE_INTEGER; // Permanent until cancelled/rescheduled
    } else {
      this.locks.set(slotKey, {
        slotKey,
        holderId: 'system',
        expiresAt: Number.MAX_SAFE_INTEGER,
        isCommitted: true,
        bookingId,
      });
    }
  }

  /**
   * Release a temporary or permanent lock (e.g. on cancellation, reschedule, or booking failure).
   */
  public releaseLock(slotKey: string): void {
    this.locks.delete(slotKey);
  }

  /**
   * Release lock by booking ID (useful during cancellation)
   */
  public releaseLockByBookingId(bookingId: string): void {
    for (const [key, lock] of this.locks.entries()) {
      if (lock.bookingId === bookingId) {
        this.locks.delete(key);
      }
    }
  }

  /**
   * Check if a slot is currently reserved or committed
   */
  public isSlotLocked(slotKey: string): boolean {
    this.cleanupExpiredLocks();
    const lock = this.locks.get(slotKey);
    if (!lock) return false;
    return lock.isCommitted || lock.expiresAt > Date.now();
  }

  /**
   * Idempotency handling: Retrieve cached response if key exists
   */
  public getIdempotencyResult(key: string): any | null {
    const record = this.idempotencyRecords.get(key);
    if (!record) return null;
    // Idempotency records valid for 24 hours
    if (Date.now() - record.createdAt > 24 * 60 * 60 * 1000) {
      this.idempotencyRecords.delete(key);
      return null;
    }
    return record.response;
  }

  /**
   * Idempotency handling: Store response for idempotency key
   */
  public setIdempotencyResult(key: string, response: any): void {
    this.idempotencyRecords.set(key, {
      key,
      response,
      createdAt: Date.now(),
    });
  }

  private cleanupExpiredLocks(): void {
    const now = Date.now();
    for (const [key, lock] of this.locks.entries()) {
      if (!lock.isCommitted && lock.expiresAt <= now) {
        this.locks.delete(key);
      }
    }
  }

  // Clear all for testing purposes
  public clearAll(): void {
    this.locks.clear();
    this.idempotencyRecords.clear();
  }
}

export const reservationStore = ReservationStore.getInstance();
