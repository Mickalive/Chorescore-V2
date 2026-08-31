/**
 * ChoreScore V2 — System Share Adapter
 *
 * Uses the actual system share sheet:
 * - React Native's built-in Share API for text content (works on Android/iOS)
 * - expo-sharing for file/image content (requires file:// URI)
 * - Web Share API on web as fallback
 *
 * This is NOT a social media SDK — it uses only the native share sheet.
 * No Instagram/Facebook/WhatsApp dependencies are added.
 */

import { Platform, Share } from 'react-native';
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

    // If file URIs are provided, use expo-sharing (requires file:// URI)
    if (options.files && options.files.length > 0) {
      return this.shareFiles(options);
    }

    // For text content on native platforms, use React Native's built-in Share API
    // This opens the native share sheet with plain text — no file URI needed
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      try {
        const parts: string[] = [];
        if (options.title) parts.push(options.title);
        if (options.message) parts.push(options.message);
        if (options.url) parts.push(options.url);
        const text = parts.join('\n\n');

        const result = await Share.share(
          { message: text },
          { dialogTitle: options.title || 'Partager via ChoreScore' }
        );

        if (result.action === Share.sharedAction) {
          return { completed: true, method: 'system-share-sheet' };
        }
        // result.action === Share.dismissedAction means user cancelled
        return { completed: false };
      } catch {
        // Share failed
        return { completed: false };
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

  /**
   * Share files using expo-sharing. expo-sharing requires a file:// URI,
   * not plain text. This method handles image/file sharing.
   */
  private async shareFiles(options: ShareOptions): Promise<ShareResult> {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      try {
        const sharing = await loadExpoSharing();
        if (sharing && options.files && options.files.length > 0) {
          // Share the first file (expo-sharing supports one file at a time)
          await sharing.shareAsync(options.files[0], {
            dialogTitle: options.title || 'Partager via ChoreScore',
          });
          return { completed: true, method: 'system-share-sheet-file' };
        }
      } catch {
        // expo-sharing not available or user cancelled
      }
    }

    return { completed: false };
  }
}
