import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.ts';
import { logger } from '../lib/logger.ts';
import { one, run } from '../db/index.ts';
import { sendMail } from '../lib/messaging.ts';
import { hashResetToken } from '../security/tokens.ts';

/**
 * Hacker admin — the emergency operations console served at /hackeradmin.
 *
 * Access is a short-lived passcode:
 *   • generated automatically every `passcodeTtlMinutes` (default: 60 — the
 *     passcode changes on the hour, one hour apart),
 *   • e-mailed through SMTP to the operator address in .env
 *     (HACKER_ADMIN_EMAIL, default mdmoshiurrahmanmohi1@gmail.com),
 *   • only a SHA-256 hash is ever stored — the code itself exists in memory
 *     for the duration of the rotation window and in the operator's inbox.
 */

export interface HackerAdminState {
  passcodeHash: string;
  issuedAt: string;
  expiresAt: string;
  rotations: number;
  lastMailStatus: string;
}

const UNAMBIGUOUS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** 8-character, unambiguous (no 0/O/1/I/L) code formatted as XXXX-XXXX. */
export function generatePasscode(): string {
  const half = 4;
  let code = '';
  for (let i = 0; i < half * 2; i += 1) {
    code += UNAMBIGUOUS[crypto.randomInt(0, UNAMBIGUOUS.length)];
    if (i === half - 1) code += '-';
  }
  return code;
}

export function hashPasscode(passcode: string): string {
  return hashResetToken(passcode.trim().toUpperCase());
}

export function readState(): HackerAdminState | null {
  return null;
}

async function loadStateRow(): Promise<Record<string, any> | undefined> {
  const row = await one<Record<string, any>>('SELECT * FROM hacker_admin_state WHERE id = $1', ['state']);
  if (!row) return undefined;
  return {
    passcodeHash: String(row.passcode_hash ?? ''),
    issuedAt: String(row.issued_at ?? ''),
    expiresAt: String(row.expires_at ?? ''),
    rotations: Number(row.rotations ?? 0),
    lastMailStatus: String(row.last_mail_status ?? 'PENDING'),
  };
}

export function passcodeEmail(code: string, expiresAt: string): { subject: string; html: string; text: string } {
  const human = new Date(expiresAt).toUTCString();
  return {
    subject: `ThinkTank Academia — hacker admin passcode ${code.slice(0, 4)}… (valid until ${human})`,
    text:
      `ThinkTank Academia hacker admin passcode\n\n` +
      `Passcode: ${code}\n` +
      `Valid until: ${human}\n\n` +
      `Use it at /hackeradmin on your site. A new code replaces this one automatically every hour. ` +
      `If you did not request this, check /hackeradmin immediately and rotate the code.`,
    html: `<div style="font-family:ui-monospace,Menlo,monospace;max-width:560px;margin:0 auto;padding:24px;border:1px solid #243447;background:#0b1420;color:#dbe7f3">
      <p style="letter-spacing:.22em;font-size:12px;color:#7dd3fc;margin:0 0 12px">THINKTANK ACADEMIA — OPERATIONS</p>
      <h1 style="font-size:22px;color:#f8fafc;margin:0 0 16px">Hacker admin passcode</h1>
      <p style="font-size:40px;letter-spacing:.35em;color:#7dd3fc;margin:18px 0;font-weight:700">${code}</p>
      <p style="line-height:1.7;margin:0 0 8px">Valid until: <strong>${human}</strong></p>
      <p style="line-height:1.7;margin:0 0 16px">Enter this code at <code style="background:#12202f;padding:2px 6px;border-radius:4px">/hackeradmin</code> to open the operations console (site on/off, traffic, visitors, admins, management).</p>
      <p style="line-height:1.7;font-size:13px;color:#94a3b8">This code changes automatically every hour and is delivered here via SMTP. If you did not request it, open the console immediately and force a new rotation.</p>
    </div>`,
  };
}

/**
 * Issues a fresh passcode, stores its hash, and e-mails the code to the
 * operator address. Returns the issued code (never logged — it only goes to
 * the inbox; in development without SMTP it is returned to the caller).
 */
export async function issuePasscode(reason: 'BOOT' | 'ROTATION' | 'MANUAL'): Promise<{ code: string; state: HackerAdminState; mailDelivered: boolean }> {
  const code = generatePasscode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.hackerAdmin.passcodeTtlMinutes * 60_000);
  const existing = (await loadStateRow()) ?? undefined;
  const rotations = (existing?.rotations ?? 0) + 1;

  const mail = passcodeEmail(code, expiresAt.toISOString());
  let mailDelivered = false;
  let mailStatus = 'PENDING';
  try {
    const result = await sendMail(config.hackerAdmin.email, mail.subject, mail.html, mail.text);
    mailDelivered = result.delivered;
    mailStatus = result.delivered ? 'DELIVERED' : `FAILED_${result.reason ?? 'UNKNOWN'}`;
  } catch (error) {
    mailStatus = `FAILED_${(error as Error).message ?? 'UNKNOWN'}`;
  }

  await run(
    `INSERT INTO hacker_admin_state(id, passcode_hash, issued_at, expires_at, rotations, last_mail_status)
     VALUES('state', $1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET passcode_hash = $1, issued_at = $2, expires_at = $3, rotations = $4, last_mail_status = $5`,
    [hashPasscode(code), now.toISOString(), expiresAt.toISOString(), rotations, mailStatus],
  );

  logger.info(`hackeradmin: passcode issued (${reason})`, {
    expiresAt: expiresAt.toISOString(),
    rotations,
    mailTo: config.hackerAdmin.email,
    mailDelivered,
    mailStatus,
  });
  if (!mailDelivered) {
    logger.warn(
      `hackeradmin: SMTP passcode e-mail not delivered (${mailStatus}). ` +
        `Configure SMTP_* in .env. During development you can also set HACKER_ADMIN_DEV_PASSCODE to a fixed code.`,
    );
  }

  return {
    code,
    state: {
      passcodeHash: hashPasscode(code),
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      rotations,
      lastMailStatus: mailStatus,
    },
    mailDelivered,
  };
}

/** Rotates when the current passcode is missing or expired. Safe to call on an interval. */
export async function ensurePasscode(reason: 'BOOT' | 'ROTATION' = 'ROTATION'): Promise<HackerAdminState> {
  const current = await loadStateRow();
  if (current && current.expiresAt && new Date(current.expiresAt).getTime() > Date.now()) {
    return {
      passcodeHash: current.passcodeHash,
      issuedAt: current.issuedAt,
      expiresAt: current.expiresAt,
      rotations: current.rotations,
      lastMailStatus: current.lastMailStatus,
    };
  }
  const issued = await issuePasscode(reason);
  return issued.state;
}

// ── Session tokens ─────────────────────────────────────────────────────────

export interface HackerSession {
  token: string;
  expiresAt: string;
}

/** Signs a bearer token that grants access to the /api/v1/hackeradmin endpoints. */
export function signHackerToken(state: HackerAdminState): HackerSession {
  const expiresAt = new Date();
  const sessionTtlMinutes = Math.max(5, Math.min(60, config.hackerAdmin.passcodeTtlMinutes));
  expiresAt.setTime(Date.now() + sessionTtlMinutes * 60_000);
  const token = jwt.sign(
    { sub: 'hacker-admin', role: 'HACKER_ADMIN' },
    config.jwt.secret,
    { expiresIn: `${sessionTtlMinutes}m` },
  );
  return { token, expiresAt: expiresAt.toISOString() };
}

export function verifyHackerToken(token: string): boolean {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as jwt.JwtPayload;
    return decoded?.role === 'HACKER_ADMIN' && decoded?.sub === 'hacker-admin';
  } catch {
    return false;
  }
}

/** Validates a submitted passcode against the current window. */
export async function validatePasscode(submitted: string): Promise<{ ok: boolean; state?: HackerAdminState; reason?: string }> {
  const clean = String(submitted ?? '').trim().toUpperCase();
  if (!clean) return { ok: false, reason: 'EMPTY' };

  // Development convenience only — never active in production.
  if (!config.isProduction && config.hackerAdmin.devPasscode && clean === config.hackerAdmin.devPasscode.trim().toUpperCase()) {
    const state = await ensurePasscode('ROTATION');
    return { ok: true, state };
  }

  const current = await loadStateRow();
  if (!current) return { ok: false, reason: 'NO_CODE_ISSUED' };
  if (new Date(current.expiresAt).getTime() < Date.now()) {
    // Expired — rotate immediately so the operator's next e-mail is fresh.
    await issuePasscode('ROTATION');
    return { ok: false, reason: 'EXPIRED' };
  }
  if (hashPasscode(clean) !== current.passcodeHash) {
    return { ok: false, reason: 'INVALID' };
  }
  return {
    ok: true,
    state: {
      passcodeHash: current.passcodeHash,
      issuedAt: current.issuedAt,
      expiresAt: current.expiresAt,
      rotations: current.rotations,
      lastMailStatus: current.lastMailStatus,
    },
  };
}

/** Public, non-secret view of the rotation state (for the panel header). */
export async function stateInfo(): Promise<{
  enabled: boolean;
  mailConfigured: boolean;
  mailTo: string;
  ttlMinutes: number;
  rotations: number;
  issuedAt: string | null;
  expiresAt: string | null;
  nextRotationInMinutes: number | null;
  lastMailStatus: string | null;
}> {
  const row = await loadStateRow();
  const expiresAt = row?.expiresAt ? new Date(row.expiresAt) : null;
  const nextRotationInMinutes = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 60_000)) : null;
  return {
    enabled: config.hackerAdmin.enabled,
    mailConfigured: Boolean(config.smtp.host),
    mailTo: config.hackerAdmin.email,
    ttlMinutes: config.hackerAdmin.passcodeTtlMinutes,
    rotations: row?.rotations ?? 0,
    issuedAt: row?.issuedAt ?? null,
    expiresAt: row?.expiresAt ?? null,
    nextRotationInMinutes,
    lastMailStatus: row?.lastMailStatus ?? null,
  };
}
