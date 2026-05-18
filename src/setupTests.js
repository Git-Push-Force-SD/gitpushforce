import '@testing-library/jest-dom';

class MockIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
  }

  observe() {
    return null;
  }

  unobserve() {
    return null;
  }

  disconnect() {
    return null;
  }

  takeRecords() {
    return [];
  }
}

global.IntersectionObserver = MockIntersectionObserver;
window.IntersectionObserver = MockIntersectionObserver;

Element.prototype.scrollIntoView = jest.fn();

jest.mock('jspdf', () => {
  const mockConstructor = jest.fn(() => ({
    setFontSize: jest.fn(),
    text: jest.fn(),
    save: jest.fn(),
    addPage: jest.fn(),
    setFillColor: jest.fn(),
    rect: jest.fn(),
  }));
  return {
    __esModule: true,
    jsPDF: mockConstructor,
    default: mockConstructor,
  };
});

const util = require('util');
global.TextEncoder = util.TextEncoder;
global.TextDecoder = util.TextDecoder;

// Mock window.location
delete window.location;
window.location = { 
  origin: 'http://localhost:3000',
  pathname: '/',
  hash: '',
  search: '',
};
