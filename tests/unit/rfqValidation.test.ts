import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Mirrors the isStep2Valid() logic from FactoryDetailPage.tsx and the
// general RFQ form validation rules.
// ---------------------------------------------------------------------------

interface RfqInput {
  qty: string;
  targetPrice: string;
  comments: string;
}

// Replica of isStep2Valid from FactoryDetailPage
function isStep2Valid(
  selectedIds: Set<string>,
  inputs: Record<string, RfqInput>,
): boolean {
  if (selectedIds.size === 0) return false;
  return [...selectedIds].every(id => {
    const input = inputs[id] ?? { qty: '', targetPrice: '', comments: '' };
    return parseInt(input.qty) > 0;
  });
}

// Validate email format (mirrors LoginPage logic)
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Validate phone (digits only, 7–15 chars)
function isValidPhone(phone: string): boolean {
  const clean = phone.replace(/\D/g, '');
  return clean.length >= 7 && clean.length <= 15;
}

// ---------------------------------------------------------------------------

describe('RFQ Step 2 Validation (isStep2Valid)', () => {
  it('invalid when no products selected', () => {
    expect(isStep2Valid(new Set(), {})).toBe(false);
  });

  it('invalid when selected product has no quantity', () => {
    const ids = new Set(['p1']);
    const inputs: Record<string, RfqInput> = { p1: { qty: '', targetPrice: '', comments: '' } };
    expect(isStep2Valid(ids, inputs)).toBe(false);
  });

  it('invalid when quantity is 0', () => {
    const ids = new Set(['p1']);
    const inputs: Record<string, RfqInput> = { p1: { qty: '0', targetPrice: '', comments: '' } };
    expect(isStep2Valid(ids, inputs)).toBe(false);
  });

  it('invalid when quantity is negative', () => {
    const ids = new Set(['p1']);
    const inputs: Record<string, RfqInput> = { p1: { qty: '-10', targetPrice: '', comments: '' } };
    expect(isStep2Valid(ids, inputs)).toBe(false);
  });

  it('valid when all selected products have qty > 0', () => {
    const ids = new Set(['p1', 'p2']);
    const inputs: Record<string, RfqInput> = {
      p1: { qty: '500', targetPrice: '12.50', comments: '' },
      p2: { qty: '200', targetPrice: '', comments: 'Custom fabric' },
    };
    expect(isStep2Valid(ids, inputs)).toBe(true);
  });

  it('invalid when at least one selected product is missing qty', () => {
    const ids = new Set(['p1', 'p2']);
    const inputs: Record<string, RfqInput> = {
      p1: { qty: '500', targetPrice: '', comments: '' },
      p2: { qty: '', targetPrice: '', comments: '' }, // missing qty
    };
    expect(isStep2Valid(ids, inputs)).toBe(false);
  });

  it('valid even if targetPrice and comments are empty (optional fields)', () => {
    const ids = new Set(['p1']);
    const inputs: Record<string, RfqInput> = { p1: { qty: '100', targetPrice: '', comments: '' } };
    expect(isStep2Valid(ids, inputs)).toBe(true);
  });
});

describe('Email Validation', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@company.com')).toBe(true);
    expect(isValidEmail('admin@auctaveexports.com')).toBe(true);
    expect(isValidEmail('user+tag@sub.domain.io')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('user @company.com')).toBe(false);
  });
});

describe('Phone Validation', () => {
  it('accepts valid phone numbers', () => {
    expect(isValidPhone('9876543210')).toBe(true);
    expect(isValidPhone('+91 98765 43210')).toBe(true); // stripped to digits
    expect(isValidPhone('1234567')).toBe(true);          // min 7
  });

  it('rejects too-short phone numbers', () => {
    expect(isValidPhone('12345')).toBe(false);
    expect(isValidPhone('')).toBe(false);
  });

  it('rejects too-long phone numbers (> 15 digits)', () => {
    expect(isValidPhone('1234567890123456')).toBe(false);
  });
});
