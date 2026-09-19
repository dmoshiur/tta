import { all, insert, one, run } from '../db/index.ts';
import { json, newId } from '../lib/util.ts';
import { logger } from '../lib/logger.ts';
import { sendPush } from '../lib/messaging.ts';

export type NotificationType = 'ANNOUNCEMENT' | 'COURSE' | 'LESSON' | 'QUIZ_RESULT' | 'SYSTEM';

export interface NotificationInput {
  userId?: string | null;
  audience?: 'USER' | 'ALL' | 'ADMIN';
  title: string;
  message?: string;
  type?: NotificationType;
  link?: string;
}

async function deliverPush(notificationId: string, userId: string, title: string, body: string, link: string): Promise<void> {
  const devices = await all<{ token: string }>('SELECT token FROM user_devices WHERE user_id = $1', [userId]);
  if (!devices.length) return;
  let delivered = false;
  for (const device of devices) {
    const sent = await sendPush({ token: device.token, title, body, link: link || undefined, data: { notificationId } });
    delivered = delivered || sent;
  }
  if (delivered) await run('UPDATE notifications SET push_sent_at = NOW() WHERE id = $1', [notificationId]);
}

/** Creates a notification row for one user (or a broadcast when userId is null). */
export async function notify(input: NotificationInput): Promise<string> {
  const id = newId();
  await insert('notifications', {
    id,
    user_id: input.userId ?? null,
    audience: input.audience ?? (input.userId ? 'USER' : 'ALL'),
    title: input.title,
    message: input.message ?? '',
    type: input.type ?? 'SYSTEM',
    link: input.link ?? '',
  });

  if (input.userId) {
    // Fire and forget: notification storage must not wait on push delivery.
    deliverPush(id, input.userId, input.title, input.message ?? '', input.link ?? '').catch((error) =>
      logger.warn('push delivery error', { message: (error as Error).message }),
    );
  }
  return id;
}

/** Notifies many users (used by cohort announcements). */
export async function notifyUsers(userIds: string[], input: Omit<NotificationInput, 'userId'>): Promise<number> {
  for (const userId of userIds) await notify({ ...input, userId });
  return userIds.length;
}

/** Broadcasts to every active learner; rows with a null user_id are visible to all. */
export async function broadcast(input: Omit<NotificationInput, 'userId' | 'audience'>): Promise<string> {
  return notify({ ...input, userId: null, audience: 'ALL' });
}

/** Unread count for the header badge. */
export async function unreadCount(userId: string): Promise<number> {
  const row = await one<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM notifications
      WHERE (user_id = $1 OR (user_id IS NULL AND audience = 'ALL')) AND read_at IS NULL`,
    [userId],
  );
  return Number(row?.total ?? 0);
}

/** Records an audit-trail entry for administrative actions. */
export async function logActivity(entry: {
  actorId?: string | null;
  actorName?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  entityLabel?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  await insert('activity_log', {
    id: newId(),
    actor_id: entry.actorId ?? null,
    actor_name: entry.actorName ?? 'system',
    action: entry.action,
    entity_type: entry.entityType ?? '',
    entity_id: entry.entityId ?? '',
    entity_label: entry.entityLabel ?? '',
    meta: json(entry.meta ?? {}),
  });
}
