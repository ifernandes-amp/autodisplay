import { describe, expect, it } from 'bun:test';
import { clearCsrfToken, getCsrfToken, setCsrfToken } from './csrf-token';

describe('csrf-token store', () => {
  it('stores token only in memory', () => {
    clearCsrfToken();
    expect(getCsrfToken()).toBeNull();

    setCsrfToken('signed-token');
    expect(getCsrfToken()).toBe('signed-token');

    clearCsrfToken();
    expect(getCsrfToken()).toBeNull();
  });
});
