import '@testing-library/jest-dom';

// Mock Zustand - consolidated mock
const mockStore = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  permissions: [],
  roles: [],
  currentRole: null,
  availableRoles: [],
  roleSessionState: {},
  login: jest.fn(),
  logout: jest.fn(function() {
    mockStore.user = null;
    mockStore.token = null;
    mockStore.isAuthenticated = false;
    mockStore.roles = [];
    mockStore.currentRole = null;
    mockStore.permissions = [];
    mockStore.availableRoles = [];
    mockStore.roleSessionState = {};
  }),
  refresh: jest.fn(),
  setUser: jest.fn(function(user: any, token: string) {
    mockStore.user = user;
    mockStore.token = token;
    mockStore.isAuthenticated = true;
    const userRoles = user?.roles?.map((r: any) => r.role.name) || [];
    mockStore.roles = userRoles;
    mockStore.availableRoles = userRoles;
    // Preserve current role if it exists in the user's roles, otherwise set to first available role
    if (mockStore.currentRole && userRoles.includes(mockStore.currentRole)) {
      // Keep existing currentRole
    } else {
      mockStore.currentRole = userRoles[0] || null;
    }
    mockStore.permissions = user?.roles?.flatMap((r: any) => r.role.permissions?.map((p: any) => p.code) || []) || [];
  }),
  switchRole: jest.fn(function(role: string) {
    if (!mockStore.roles.includes(role)) {
      throw new Error(`Cannot switch to role: ${role}. Role not assigned to user.`);
    }
    mockStore.currentRole = role;
  }),
  canSwitchToRole: jest.fn(function(role: string) {
    return mockStore.roles.includes(role);
  }),
  saveRoleSession: jest.fn(function(role: string, data: any) {
    mockStore.roleSessionState[role] = { ...mockStore.roleSessionState[role], ...data };
  }),
  getRoleSession: jest.fn(function(role: string) {
    return mockStore.roleSessionState[role];
  }),
  clearRoleSession: jest.fn(function(role: string) {
    delete mockStore.roleSessionState[role];
  }),
  hasPermission: jest.fn(function(permission: string) {
    return mockStore.permissions.includes(permission);
  }),
  hasRole: jest.fn(function(role: string) {
    return mockStore.roles.includes(role);
  }),
  hasAnyRole: jest.fn(function(...roles: string[]) {
    return roles.some(role => mockStore.roles.includes(role));
  }),
  getCurrentRolePermissions: jest.fn(function() {
    return mockStore.permissions;
  }),
  setState: jest.fn(function(state: any) {
    if (typeof state === 'function') {
      const newState = state(mockStore);
      Object.assign(mockStore, newState);
    } else {
      Object.assign(mockStore, state);
    }
  }),
};

const createMock = jest.fn(() => jest.fn(() => mockStore));

jest.mock('zustand', () => ({
  create: createMock,
}));

// Export the mock for tests to use
(global as any).__mockStore = mockStore;
(global as any).__createMock = createMock;

// Mock the auth store specifically
const mockUseAuthStore = jest.fn(() => mockStore);
mockUseAuthStore.setState = jest.fn((state: any) => {
  Object.assign(mockStore, state);
});

jest.mock('@/stores/auth.store', () => ({
  useAuthStore: mockUseAuthStore,
}));

jest.mock('zustand/middleware', () => ({
  persist: (fn: any) => fn,
  createJSONStorage: () => ({}),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/assessor';
  },
}));

// Mock React Hook Form
jest.mock('react-hook-form', () => ({
  useForm: jest.fn(() => ({
    register: jest.fn(),
    handleSubmit: jest.fn((callback) => (e) => {
      e.preventDefault();
      callback({
        rapidAssessmentDate: new Date(),
        affectedEntityId: 'entity-1',
        assessorName: 'Test Assessor',
        hasFunctionalClinic: false,
        numberHealthFacilities: 0,
        healthFacilityType: '',
        qualifiedHealthWorkers: 0,
        hasMedicineSupply: false,
        hasMedicalSupplies: false,
        hasMaternalChildServices: false,
        commonHealthIssues: [],
        additionalHealthDetails: '',
      });
    }),
    formState: { errors: {}, isValid: true, isSubmitting: false },
    setValue: jest.fn(),
    getValues: jest.fn(),
    watch: jest.fn(),
    reset: jest.fn(),
    trigger: jest.fn(),
  })),
  Controller: ({ render }) => render(),
}));

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $transaction: jest.fn(),
    rapidAssessment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    healthAssessment: {
      create: jest.fn(),
      update: jest.fn(),
    },
    populationAssessment: {
      create: jest.fn(),
      update: jest.fn(),
    },
    foodAssessment: {
      create: jest.fn(),
      update: jest.fn(),
    },
    washAssessment: {
      create: jest.fn(),
      update: jest.fn(),
    },
    shelterAssessment: {
      create: jest.fn(),
      update: jest.fn(),
    },
    securityAssessment: {
      create: jest.fn(),
      update: jest.fn(),
    },
  })),
}));

// Mock geolocation
Object.defineProperty(global.navigator, 'geolocation', {
  value: {
    getCurrentPosition: jest.fn((success) => {
      success({
        coords: {
          latitude: 11.506,
          longitude: 13.098,
          accuracy: 10,
        },
        timestamp: Date.now(),
      });
    }),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  },
  writable: true,
});

// Mock FileReader
Object.defineProperty(global, 'FileReader', {
  value: jest.fn().mockImplementation(() => ({
    onload: null,
    readAsDataURL: jest.fn(function() {
      if (this.onload) {
        this.onload({ target: { result: 'data:image/jpeg;base64,test' } });
      }
    }),
  })),
  writable: true,
});

// Mock File
Object.defineProperty(global, 'File', {
  value: jest.fn().mockImplementation(function(chunks: any[], name: string, options: any) {
    this.chunks = chunks;
    this.name = name;
    this.options = options;
    this.size = chunks.reduce((total: number, chunk: any) => total + (chunk.size || 0), 0);
    this.type = options?.type || '';
  }),
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock IndexedDB
const indexedDBMock = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
  cmp: jest.fn(),
};
Object.defineProperty(window, 'indexedDB', {
  value: indexedDBMock,
  writable: true,
});

// Mock fetch and related Web APIs
global.fetch = jest.fn();

// Mock Request class with proper Headers
global.Request = class MockRequest {
  url: string;
  method: string;
  headers: any;
  
  constructor(url: string, options: any = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this.headers = new Map();
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        this.headers.set(key.toLowerCase(), value);
      });
    }
  }
} as any;

// Mock Response class
global.Response = class MockResponse {
  status: number;
  statusText: string;
  headers: any;
  
  constructor(body?: any, options: any = {}) {
    this.status = options.status || 200;
    this.statusText = options.statusText || 'OK';
    this.headers = new Map();
  }
  
  json() { return Promise.resolve({}); }
  text() { return Promise.resolve(''); }
} as any;

// Mock Headers class
global.Headers = class MockHeaders {
  private map = new Map();
  
  set(name: string, value: string) { this.map.set(name.toLowerCase(), value); }
  get(name: string) { return this.map.get(name.toLowerCase()); }
  has(name: string) { return this.map.has(name.toLowerCase()); }
  delete(name: string) { this.map.delete(name.toLowerCase()); }
  entries() { return this.map.entries(); }
} as any;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Setup test environment
process.env.NODE_ENV = 'test';