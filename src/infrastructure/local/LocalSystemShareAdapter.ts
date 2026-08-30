/**
 * ChoreScore V2 — System Share Adapter
 *
 * Uses the actual system share sheet when available on the platform.
 * This is NOT a social media SDK - it uses only the native share sheet.
 * No Instagram/Facebook/WhatsApp dependencies are added.
 */

import { SystemShareGateway, ShareOptions, ShareResult } from '../../application/ports';

export class SystemShareAdapter implements SystemShareGateway {
  isAvailable(): boolean {
    // On native platforms, share is always available
    // On web, it depends on the Web Share API
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      return true;
    }
    return false;
  }

  async share(options: ShareOptions): Promise<ShareResult> {
    if (!this.isAvailable()) {
      return { completed: false };
    }

    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await navigator.share({
          title: options.title,
          text: options.message,
          url: options.url,
        });
        return { completed: true, method: 'web-share-api' };
      }
    } catch (error) {
      // User cancelled or share failed
      return { completed: false };
    }

    return { completed: false };
  }
}
