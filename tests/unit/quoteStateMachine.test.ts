import { describe, it, expect } from 'vitest';

// ------- State machine -------------------------------------------------------
// Maps every status to its valid next statuses.
// Mirrors the business rules enforced in QuoteDetailPage + AdminRFQPage.

type QuoteStatus =
  | 'Draft'
  | 'Pending'
  | 'Responded'
  | 'In Negotiation'
  | 'Admin Accepted'
  | 'Client Accepted'
  | 'Accepted'
  | 'Declined'
  | 'Trashed';

const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  Draft:            ['Pending', 'Trashed'],
  Pending:          ['Responded', 'Trashed'],
  Responded:        ['In Negotiation', 'Accepted', 'Declined', 'Admin Accepted'],
  'In Negotiation': ['Admin Accepted', 'Client Accepted', 'Accepted', 'Declined'],
  'Admin Accepted': ['Accepted', 'Declined', 'Client Accepted'],
  'Client Accepted':[],
  Accepted:         [],
  Declined:         [],
  Trashed:          [],
};

function canTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ------- Tests ---------------------------------------------------------------

describe('Quote Status State Machine', () => {
  describe('Happy path transitions', () => {
    it('Draft → Pending (client submits RFQ)', () => {
      expect(canTransition('Draft', 'Pending')).toBe(true);
    });

    it('Pending → Responded (admin responds)', () => {
      expect(canTransition('Pending', 'Responded')).toBe(true);
    });

    it('Responded → In Negotiation (client counter-offers)', () => {
      expect(canTransition('Responded', 'In Negotiation')).toBe(true);
    });

    it('Responded → Admin Accepted (admin accepts)', () => {
      expect(canTransition('Responded', 'Admin Accepted')).toBe(true);
    });

    it('Admin Accepted → Accepted (both parties confirm)', () => {
      expect(canTransition('Admin Accepted', 'Accepted')).toBe(true);
    });

    it('In Negotiation → Admin Accepted', () => {
      expect(canTransition('In Negotiation', 'Admin Accepted')).toBe(true);
    });

    it('Responded → Accepted (direct fast-path)', () => {
      expect(canTransition('Responded', 'Accepted')).toBe(true);
    });
  });

  describe('Decline paths', () => {
    it('Responded → Declined', () => {
      expect(canTransition('Responded', 'Declined')).toBe(true);
    });

    it('In Negotiation → Declined', () => {
      expect(canTransition('In Negotiation', 'Declined')).toBe(true);
    });

    it('Admin Accepted → Declined', () => {
      expect(canTransition('Admin Accepted', 'Declined')).toBe(true);
    });
  });

  describe('Trash paths', () => {
    it('Draft → Trashed (discard draft)', () => {
      expect(canTransition('Draft', 'Trashed')).toBe(true);
    });

    it('Pending → Trashed (admin trashes request)', () => {
      expect(canTransition('Pending', 'Trashed')).toBe(true);
    });
  });

  describe('Blocked illegal transitions', () => {
    it('blocks Draft → Accepted (skipping all steps)', () => {
      expect(canTransition('Draft', 'Accepted')).toBe(false);
    });

    it('blocks Draft → Responded (bypassing Pending)', () => {
      expect(canTransition('Draft', 'Responded')).toBe(false);
    });

    it('blocks Pending → Accepted (no response yet)', () => {
      expect(canTransition('Pending', 'Accepted')).toBe(false);
    });

    it('blocks re-activating Trashed quotes', () => {
      const allStatuses = Object.keys(VALID_TRANSITIONS) as QuoteStatus[];
      for (const to of allStatuses) {
        expect(canTransition('Trashed', to)).toBe(false);
      }
    });

    it('blocks re-activating Declined quotes', () => {
      const allStatuses = Object.keys(VALID_TRANSITIONS) as QuoteStatus[];
      for (const to of allStatuses) {
        expect(canTransition('Declined', to)).toBe(false);
      }
    });

    it('blocks re-activating Accepted quotes', () => {
      const allStatuses = Object.keys(VALID_TRANSITIONS) as QuoteStatus[];
      for (const to of allStatuses) {
        expect(canTransition('Accepted', to)).toBe(false);
      }
    });

    it('blocks re-activating Client Accepted quotes', () => {
      const allStatuses = Object.keys(VALID_TRANSITIONS) as QuoteStatus[];
      for (const to of allStatuses) {
        expect(canTransition('Client Accepted', to)).toBe(false);
      }
    });
  });

  describe('Terminal states have no outbound transitions', () => {
    const terminals: QuoteStatus[] = ['Client Accepted', 'Accepted', 'Declined', 'Trashed'];

    for (const status of terminals) {
      it(`${status} has 0 valid transitions`, () => {
        expect(VALID_TRANSITIONS[status]).toHaveLength(0);
      });
    }
  });
});
