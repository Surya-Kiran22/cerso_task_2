import '@testing-library/jest-dom';

// Mock ResizeObserver for Recharts compatibility in Vitest/jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
