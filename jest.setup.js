import '@testing-library/jest-dom'

// Mock crypto.randomUUID if not available in test environment
if (!globalThis.crypto) {
  globalThis.crypto = {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
  }
}

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

// Mock window.addEventListener and removeEventListener
const mockEventListeners = new Map()

global.addEventListener = jest.fn((event, handler) => {
  if (!mockEventListeners.has(event)) {
    mockEventListeners.set(event, [])
  }
  mockEventListeners.get(event).push(handler)
})

global.removeEventListener = jest.fn((event, handler) => {
  if (mockEventListeners.has(event)) {
    const handlers = mockEventListeners.get(event)
    const index = handlers.indexOf(handler)
    if (index > -1) {
      handlers.splice(index, 1)
    }
  }
})

// Mock dispatchEvent for testing
global.dispatchEvent = jest.fn((event) => {
  const eventType = event.type
  if (mockEventListeners.has(eventType)) {
    mockEventListeners.get(eventType).forEach(handler => handler(event))
  }
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock fetch globally
global.fetch = jest.fn()

// Console suppression for cleaner test output
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})