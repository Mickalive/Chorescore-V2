/**
 * ChoreScore V2 — Local Calendar Adapter
 *
 * HONEST adapter: calendar integration is not configured in development.
 * This adapter does not simulate calendar operations.
 */

import { CalendarGateway, CalendarEventOptions } from '../../application/ports';

export class LocalCalendarAdapter implements CalendarGateway {
  isAvailable(): boolean {
    // Calendar not configured in development
    return false;
  }

  async requestPermission(): Promise<boolean> {
    return false;
  }

  async createEvent(_options: CalendarEventOptions): Promise<string | null> {
    return null;
  }

  async deleteEvent(_id: string): Promise<void> {
    // No-op
  }
}
