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

const STORAGE_KEY = 'zushi_walkthrough_v1';

function loadState(): WalkthroughState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(s: WalkthroughState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

// ─── Active tour ──────────────────────────────────────────────────────────────

interface ActiveTour {
  tour: Tour;
  stepIndex: number;
}

// ─── Context contract ─────────────────────────────────────────────────────────

interface WalkthroughContextType {
  // state
  state: WalkthroughState;
  activeTour: ActiveTour | null;
  currentStep: TourStep | null;

  // tour controls
  startTour: (tourId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  exitTour: () => void;
  completeTour: () => void;

  // checklist
  dismissChecklist: () => void;

  // welcome modal
  triggerWelcomeModal: () => void;
  dismissWelcomeModal: () => void;

  // page visits
  markPageVisited: (page: string) => void;
  isPageVisited: (page: string) => boolean;

  // helpers
  isTourComplete: (tourId: string) => boolean;
  completionPct: number;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const WalkthroughContext = createContext<WalkthroughContextType | undefined>(undefined);

export const useWalkthrough = (): WalkthroughContextType => {
  const ctx = useContext(WalkthroughContext);
  if (!ctx) throw new Error('useWalkthrough must be used within WalkthroughProvider');
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const WalkthroughProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WalkthroughState>(loadState);
  const [activeTour, setActiveTour] = useState<ActiveTour | null>(null);

  // persist on every change
  useEffect(() => {
    saveState(state);
  }, [state]);

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
      if (next >= prev.tour.steps.length) return null; // exit at end
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

  const completionPct = Math.round(
    (state.completedTours.length / ALL_TOURS.length) * 100
  );

  // Keyboard: Escape exits tour
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
      triggerWelcomeModal,
      dismissWelcomeModal,
      markPageVisited,
      isPageVisited,
      isTourComplete,
      completionPct,
    }}>
      {children}
    </WalkthroughContext.Provider>
  );
};
