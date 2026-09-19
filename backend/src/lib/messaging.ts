import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { config, mailEnabled, pushEnabled } from '../config.ts';
import { logger } from './logger.ts';

// ── Transactional email ────────────────────────────────────────────────────

let transport: any = null;

function getTransport(): any {
  if (!mailEnabled) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.password } : undefined,
    });
  }
  return transport;
}

export interface MailResult {
  delivered: boolean;
  reason?: string;
}

export async function sendMail(to: string, subject: string, html: string, text?: string): Promise<MailResult> {
  const sender = getTransport();
  if (!sender) {
    logger.info('mail: SMTP is not configured — message not delivered', { to, subject });
    return { delivered: false, reason: 'SMTP_NOT_CONFIGURED' };
  }
  try {
    await sender.sendMail({ from: config.smtp.from, to, subject, html, text: text ?? html.replace(/<[^>]+>/g, ' ') });
    logger.info('mail: sent', { to, subject });
    return { delivered: true };
  } catch (error) {
    logger.error('mail: delivery failed', { to, subject, message: (error as Error).message });
    return { delivered: false, reason: (error as Error).message };
  }
}

export function passwordResetEmail(name: string, link: string): { subject: string; html: string } {
  return {
    subject: 'Reset your ThinkTank Academia password',
    html: `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e0d5">
      <p style="letter-spacing:.18em;font-size:12px;color:#987029;margin:0 0 12px">THINKTANK ACADEMIA</p>
      <h1 style="font-size:24px;color:#071b33;margin:0 0 16px">Password reset</h1>
      <p style="line-height:1.7;color:#33414f">Hello ${name},</p>
      <p style="line-height:1.7;color:#33414f">We received a request to reset your password. The link below expires in ${config.jwt.resetTokenTtlMinutes} minutes and can be used once.</p>
      <p style="margin:24px 0"><a href="${link}" style="background:#071b33;color:#d4b274;padding:12px 20px;text-decoration:none;display:inline-block">Reset password</a></p>
      <p style="line-height:1.7;color:#33414f">If you did not request this, you can safely ignore the message — your password will not change.</p>
      <p style="line-height:1.6;color:#6b7785;font-size:13px">Link: ${link}</p>
    </div>`,
  };
}

// ── Push notifications (Firebase Cloud Messaging HTTP v1) ───────────────────

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function googleAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) return cachedAccessToken.token;
  const assertion = jwt.sign(
    {
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
    },
    config.firebase.privateKey,
    {
      algorithm: 'RS256',
      issuer: config.firebase.clientEmail,
      subject: config.firebase.clientEmail,
      expiresIn: '55m',
      header: { alg: 'RS256', typ: 'JWT' },
    },
  );

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`Google token endpoint responded ${response.status}`);
  const data = (await response.json()) as { access_token: string; expires_in?: number };
  cachedAccessToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return data.access_token;
}

export interface PushMessage {
  token: string;
  title: string;
  body: string;
  link?: string;
  data?: Record<string, string>;
}

/**
 * Sends a push notification through FCM HTTP v1. Returns false (without
 * throwing) when Firebase credentials are absent, so in-app notifications keep
 * working on installations that have not configured push.
 */
export async function sendPush(message: PushMessage): Promise<boolean> {
  if (!pushEnabled) return false;
  try {
    const accessToken = await googleAccessToken();
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${config.firebase.projectId}/messages:send`, {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: message.token,
          notification: { title: message.title, body: message.body },
          webpush: message.link ? { fcmOptions: { link: message.link } } : undefined,
          android: { notification: { click_action: 'OPEN_LINK' }, data: message.link ? { link: message.link } : undefined },
          data: message.data,
        },
      }),
    });
    if (!response.ok) {
      logger.warn('push: FCM rejected the message', { status: response.status });
      return false;
    }
    return true;
  } catch (error) {
    logger.warn('push: delivery failed', { message: (error as Error).message });
    return false;
  }
}
