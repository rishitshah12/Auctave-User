import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { ALL_TOURS } from './tours';
import type { Tour, TourStep } from './tours';

// ─── State shape ──────────────────────────────────────────────────────────────

interface WalkthroughState {
  completedTours: string[];
  dismissedChecklist: boolean;
  visitedPages: string[];
  showWelcomeModal: boolean;
}

const DEFAULT_STATE: WalkthroughState = {
  completedTours: [],
  dismissedChecklist: false,
  visitedPages: [],
  showWelcomeModal: false,
};

function storageKey(userId?: string) {
  return userId ? `zushi_walkthrough_v1_${userId}` : 'zushi_walkthrough_v1';
}

function loadState(userId?: string): WalkthroughState {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(s: WalkthroughState, userId?: string) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(s));
  } catch {}
}

// ─── Active tour ──────────────────────────────────────────────────────────────

interface ActiveTour {
  tour: Tour;
  stepIndex: number;
}

// ─── Context contract ─────────────────────────────────────────────────────────

interface WalkthroughContextType {
  state: WalkthroughState;
  activeTour: ActiveTour | null;
  currentStep: TourStep | null;

  startTour: (tourId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  exitTour: () => void;
  completeTour: () => void;

  dismissChecklist: () => void;
  openChecklist: () => void;

  triggerWelcomeModal: () => void;
  dismissWelcomeModal: () => void;

  markPageVisited: (page: string) => void;
  isPageVisited: (page: string) => boolean;

  isTourComplete: (tourId: string) => boolean;
  completionPct: number;
  resetTours: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const WalkthroughContext = createContext<WalkthroughContextType | undefined>(undefined);

export const useWalkthrough = (): WalkthroughContextType => {
  const ctx = useContext(WalkthroughContext);
  if (!ctx) throw new Error('useWalkthrough must be used within WalkthroughProvider');
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const WalkthroughProvider: React.FC<{ children: ReactNode; userId?: string }> = ({ children, userId }) => {
  const [state, setState] = useState<WalkthroughState>(() => loadState(userId));
  const [activeTour, setActiveTour] = useState<ActiveTour | null>(null);

  // Re-load when userId changes (user switches account / logs in)
  useEffect(() => {
    setState(loadState(userId));
    setActiveTour(null);
  }, [userId]);

  // Persist every state change under the user-specific key
  useEffect(() => {
    saveState(state, userId);
  }, [state, userId]);

  const currentStep = activeTour
    ? activeTour.tour.steps[activeTour.stepIndex] ?? null
    : null;

  const startTour = useCallback((tourId: string) => {
    const tour = ALL_TOURS.find(t => t.id === tourId);
    if (!tour) return;
    setActiveTour({ tour, stepIndex: 0 });
  }, []);

  const nextStep = useCallback(() => {
    setActiveTour(prev => {
      if (!prev) return null;
      const next = prev.stepIndex + 1;
      if (next >= prev.tour.steps.length) return null;
      return { ...prev, stepIndex: next };
    });
  }, []);

  const prevStep = useCallback(() => {
    setActiveTour(prev => {
      if (!prev || prev.stepIndex === 0) return prev;
      return { ...prev, stepIndex: prev.stepIndex - 1 };
    });
  }, []);

  const exitTour = useCallback(() => {
    setActiveTour(null);
  }, []);

  const completeTour = useCallback(() => {
    if (!activeTour) return;
    const tourId = activeTour.tour.id;
    setState(prev => {
      if (prev.completedTours.includes(tourId)) return prev;
      return { ...prev, completedTours: [...prev.completedTours, tourId] };
    });
    setActiveTour(null);
  }, [activeTour]);

  const dismissChecklist = useCallback(() => {
    setState(prev => ({ ...prev, dismissedChecklist: true }));
  }, []);

  // Restore checklist from Settings — undoes dismiss
  const openChecklist = useCallback(() => {
    setState(prev => ({ ...prev, dismissedChecklist: false }));
    setActiveTour(null);
  }, []);

  const triggerWelcomeModal = useCallback(() => {
    setState(prev => ({ ...prev, showWelcomeModal: true }));
  }, []);

  const dismissWelcomeModal = useCallback(() => {
    setState(prev => ({ ...prev, showWelcomeModal: false }));
  }, []);

  const markPageVisited = useCallback((page: string) => {
    setState(prev => {
      if (prev.visitedPages.includes(page)) return prev;
      return { ...prev, visitedPages: [...prev.visitedPages, page] };
    });
  }, []);

  const isPageVisited = useCallback((page: string) => {
    return state.visitedPages.includes(page);
  }, [state.visitedPages]);

  const isTourComplete = useCallback((tourId: string) => {
    return state.completedTours.includes(tourId);
  }, [state.completedTours]);

  // Reset all tour progress — useful from Settings
  const resetTours = useCallback(() => {
    setState(DEFAULT_STATE);
    setActiveTour(null);
  }, []);

  const completionPct = Math.round(
    (state.completedTours.length / ALL_TOURS.length) * 100
  );

  // Escape exits active tour
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeTour) exitTour();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTour, exitTour]);

  return (
    <WalkthroughContext.Provider value={{
      state,
      activeTour,
      currentStep,
      startTour,
      nextStep,
      prevStep,
      exitTour,
      completeTour,
      dismissChecklist,
      openChecklist,
      triggerWelcomeModal,
      dismissWelcomeModal,
      markPageVisited,
      isPageVisited,
      isTourComplete,
      completionPct,
      resetTours,
    }}>
      {children}
    </WalkthroughContext.Provider>
  );
};
