/**
 * ChoreScore V2 — Jest Setup
 *
 * Provides AsyncStorage mock for tests using
 * @react-native-async-storage/async-storage's built-in jest mock.
 */

// Mock AsyncStorage for all tests
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-sharing for tests (the module uses native APIs not available in Jest)
jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn().mockResolvedValue({ action: 'shared' }),
  isAvailableAsync: jest.fn().mockResolvedValue(false),
}));
