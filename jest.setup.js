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

// Mock react-native-view-shot for tests
jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn().mockResolvedValue('file:///tmp/test-share.png'),
  captureScreen: jest.fn().mockResolvedValue('file:///tmp/test-screen.png'),
}));

// Mock expo-file-system for tests (legacy API used by the app)
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/tmp/cache/',
  documentDirectory: '/tmp/doc/',
  copyAsync: jest.fn().mockResolvedValue(undefined),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, isDirectory: false }),
}));

// Mock expo-file-system for tests (also mock the base module)
jest.mock('expo-file-system', () => ({
  cacheDirectory: '/tmp/cache/',
  documentDirectory: '/tmp/doc/',
  copyAsync: jest.fn().mockResolvedValue(undefined),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, isDirectory: false }),
}));
