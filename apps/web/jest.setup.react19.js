import '@testing-library/jest-dom';

// Mock Next.js Request and Response for API route testing
import { TextEncoder, TextDecoder } from 'util';

// Mock global Request and Response
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Next.js specific globals for API routes
global.Request = global.Request || require('whatwg-fetch').Request;
global.Response = global.Response || require('whatwg-fetch').Response;
global.Headers = global.Headers || require('whatwg-fetch').Headers;

// React 19 compatibility fix for Jest
// Mock React's jsx-runtime for Jest environment
jest.mock('react/jsx-runtime', () => {
  const actualJSXRuntime = jest.requireActual('react/jsx-runtime');
  const React = jest.requireActual('react');
  
  return {
    ...actualJSXRuntime,
    jsx: (type, props, key) => React.createElement(type, { ...props, key }),
    jsxs: (type, props, key) => React.createElement(type, { ...props, key }),
    Fragment: React.Fragment
  };
});

// Also mock jsx-dev-runtime for development
jest.mock('react/jsx-dev-runtime', () => {
  const React = jest.requireActual('react');
  
  return {
    jsx: (type, props, key) => React.createElement(type, { ...props, key }),
    jsxs: (type, props, key) => React.createElement(type, { ...props, key }),
    Fragment: React.Fragment
  };
});