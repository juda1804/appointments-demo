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