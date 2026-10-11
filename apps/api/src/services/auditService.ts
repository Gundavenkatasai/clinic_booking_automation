import { AuditLogEntry } from '@clinic/shared';
import fs from 'fs';
import path from 'path';

const AUDIT_FILE = path.resolve(process.cwd(), 'data', 'audit_logs.json');

export class AuditService {
  private logs: AuditLogEntry[] = [];

  constructor() {
    this.loadLogs();
  }

  private loadLogs(): void {
    try {
      if (fs.existsSync(AUDIT_FILE)) {
        const raw = fs.readFileSync(AUDIT_FILE, 'utf-8');
        this.logs = JSON.parse(raw);
      }
    } catch {
      this.logs = [];
    }
  }

  private saveLogs(): void {
    try {
      const dir = path.dirname(AUDIT_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(AUDIT_FILE, JSON.stringify(this.logs, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save audit logs:', err);
    }
  }

  public record(params: {
    actor: string;
    action: string;
    bookingId?: string;
    details: string;
    ipAddress?: string;
  }): void {
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      actor: params.actor,
      action: params.action,
      bookingId: params.bookingId,
      details: params.details,
      ipAddress: params.ipAddress,
    };

    this.logs.unshift(entry);
    // Keep last 1000 records
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }
    this.saveLogs();
  }

  public getLogs(limit = 100): AuditLogEntry[] {
    return this.logs.slice(0, limit);
  }
}

export const auditService = new AuditService();
