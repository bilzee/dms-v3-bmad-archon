import '@testing-library/jest-dom';
import 'next/dist/next-env.d.ts';

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

// Mock Zustand
jest.mock('zustand', () => ({
  create: jest.fn(),
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
  value: class FileReader {
    onload: () => {};
    readAsDataURL: jest.fn(() => {
      this.onload?.({ target: { result: 'data:image/jpeg;base64,test' } });
    });
  },
  writable: true,
});

// Mock File
Object.defineProperty(global, 'File', {
  value: class File {
    constructor(public chunks: any[], public name: string, public options: any) {}
  },
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

// Mock fetch
global.fetch = jest.fn();

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