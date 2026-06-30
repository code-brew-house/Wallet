import { describe, expect, test } from 'bun:test';
import './setup-env';
import { getAllowedCorsOrigins } from '../src/app.config';

describe('app CORS configuration', () => {
  test('allows localhost and loopback web origins in development to avoid browser Failed To Fetch on signup preflight', () => {
    expect(getAllowedCorsOrigins('http://localhost:3000', 'development')).toEqual([
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]);
  });

  test('also allows localhost when the configured development web origin uses loopback IP', () => {
    expect(getAllowedCorsOrigins('http://127.0.0.1:3000', 'development')).toEqual([
      'http://127.0.0.1:3000',
      'http://localhost:3000',
    ]);
  });

  test('normalizes trailing slashes before comparing origins', () => {
    expect(getAllowedCorsOrigins('http://localhost:3000/', 'test')).toEqual([
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]);
  });

  test('keeps production CORS pinned to the configured public web origin', () => {
    expect(getAllowedCorsOrigins('https://wallet.example.com', 'production')).toEqual(['https://wallet.example.com']);
  });
});
