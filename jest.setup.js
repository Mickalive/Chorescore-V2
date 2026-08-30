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
