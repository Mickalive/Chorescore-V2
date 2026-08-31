/**
 * ChoreScore V2 — System Share Adapter
 *
 * Uses the actual system share sheet via expo-sharing on native platforms,
 * or the Web Share API on web. This is NOT a social media SDK — it uses
 * only the native share sheet. No Instagram/Facebook/WhatsApp dependencies
 * are added.
 *
 * expo-sharing is the honest adapter: it opens the OS-level share sheet
 * and lets the user choose which app to share with.
 */

import { Platform } from 'react-native';
import { SystemShareGateway, ShareOptions, ShareResult } from '../../application/ports';

/**
 * Lazy-load expo-sharing to avoid import errors in test/web environments
 * where the native module is not available.
 */
async function loadExpoSharing(): Promise<typeof import('expo-sharing') | null> {
  try {
    return await import('expo-sharing');
  } catch {
    return null;
  }
}

export class SystemShareAdapter implements SystemShareGateway {
  isAvailable(): boolean {
    // On native platforms (Android/iOS), system share is always available
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      return true;
    }
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

    // Try expo-sharing first (native platforms)
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      try {
        const sharing = await loadExpoSharing();
        if (sharing) {
          // Build a text content for sharing
          const parts: string[] = [];
          if (options.title) parts.push(options.title);
          if (options.message) parts.push(options.message);
          if (options.url) parts.push(options.url);
          const text = parts.join('\n\n');

          await sharing.shareAsync(text, {
            mimeType: 'text/plain',
            dialogTitle: options.title || 'Partager via ChoreScore',
          });
          return { completed: true, method: 'system-share-sheet' };
        }
      } catch {
        // expo-sharing not available or user cancelled — try Web Share API fallback
      }
    }

    // Web fallback: Web Share API
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await navigator.share({
          title: options.title,
          text: options.message,
          url: options.url,
        });
        return { completed: true, method: 'web-share-api' };
      }
    } catch {
      // User cancelled or share failed
    }

    return { completed: false };
  }
}
