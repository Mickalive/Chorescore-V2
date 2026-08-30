/**
 * ChoreScore V2 — Local Notification Adapter
 *
 * HONEST adapter: notifications are not configured in development.
 * This adapter does not simulate push notifications.
 */

import { NotificationGateway, NotificationOptions } from '../../application/ports';

export class LocalNotificationAdapter implements NotificationGateway {
  isAvailable(): boolean {
    // Notifications not configured in development
    return false;
  }

  async requestPermission(): Promise<boolean> {
    return false;
  }

  async scheduleNotification(_options: NotificationOptions): Promise<string> {
    throw new Error('Notifications are not configured');
  }

  async cancelNotification(_id: string): Promise<void> {
    // No-op
  }
}
