// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.MARKET_DATA_BASE_URL = 'https://test-market-data.com'
process.env.REG_CONFIG_BASE_URL = 'https://test-reg-config.com'
process.env.NEXT_PUBLIC_WS_BASE_URL = 'wss://test-websocket.com'
process.env.MARKET_DATA_API_KEY = 'test-api-key'
process.env.REG_CONFIG_API_KEY = 'test-api-key'

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
}

