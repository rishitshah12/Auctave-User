import React, { useEffect, useRef } from 'react';
import { useWalkthrough } from './WalkthroughContext';
import { SpotlightOverlay } from './components/SpotlightOverlay';
import { TourTooltip } from './components/TourTooltip';
import { WelcomeModal } from './components/WelcomeModal';

// CSS always injected — handles animations + mobile-responsive positioning
const TOUR_STYLES = `
  @keyframes tour-halo-pulse {
    0%, 100% {
      box-shadow: 0 0 0 2px rgba(255,255,255,0.9), 0 0 0 6px rgba(255,255,255,0.3), 0 0 24px 8px rgba(255,255,255,0.1);
    }
    50% {
      box-shadow: 0 0 0 3px rgba(255,255,255,0.7), 0 0 0 10px rgba(255,255,255,0.15), 0 0 40px 16px rgba(255,255,255,0.06);
    }
  }

  /* Card entrance — fires on every step change via React key */
  @keyframes zushi-card-in {
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes tour-fade-in {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Desktop default — sidebar on left, no bottom nav */
  .zushi-checklist {
    bottom: 24px !important;
    right: 20px !important;
    width: 328px !important;
  }

  /* Mobile — clear the pill bottom nav: 58px height + 16px offset + 12px gap + safe area */
  @media (max-width: 767px) {
    .zushi-checklist {
      bottom: calc(env(safe-area-inset-bottom) + 86px) !important;
      right: 12px !important;
      left: 12px !important;
      width: auto !important;
      max-width: 420px !important;
    }
    .zushi-checklist-pill {
      bottom: calc(env(safe-area-inset-bottom) + 86px) !important;
      right: 12px !important;
    }
    /* Tooltip on mobile: anchor above nav, edge-to-edge with margin */
    .zushi-tooltip {
      bottom: calc(env(safe-area-inset-bottom) + 90px) !important;
      top: auto !important;
      left: 12px !important;
      right: 12px !important;
      width: auto !important;
      max-width: none !important;
      border-radius: 20px !important;
    }
    /* Spotlight overlay: don't cover the bottom nav so it stays tappable */
    .zushi-overlay-root {
      bottom: calc(env(safe-area-inset-bottom) + 74px) !important;
    }
  }
`;

interface TourEngineProps {
  userName?: string;
  onNavigate?: (page: string) => void;
}

export const TourEngine: React.FC<TourEngineProps> = ({ userName, onNavigate }) => {
  const {
    activeTour,
    currentStep,
    nextStep,
    prevStep,
    exitTour,
    completeTour,
  } = useWalkthrough();

  const prevStepId = useRef<string | null>(null);

  // Navigate when a step specifies navigateTo — uses app's handleSetCurrentPage
  useEffect(() => {
    if (!currentStep || !activeTour) return;
    if (currentStep.id === prevStepId.current) return;
    prevStepId.current = currentStep.id;

    if (currentStep.navigateTo && onNavigate) {
      onNavigate(currentStep.navigateTo);
    }
  }, [currentStep?.id, activeTour, onNavigate]);

  const isCenter = !currentStep?.target || currentStep.placement === 'center';

  return (
    <>
      {/* Always-present global CSS */}
      <style>{TOUR_STYLES}</style>

      {activeTour && currentStep ? (
        <SpotlightOverlay
          targetId={isCenter ? undefined : currentStep.target}
          padding={currentStep.highlightPadding ?? 8}
          allowInteraction={currentStep.allowInteraction}
          onClickOutside={isCenter ? undefined : exitTour}
        >
          <TourTooltip
            step={currentStep}
            tour={activeTour.tour}
            stepIndex={activeTour.stepIndex}
            onNext={nextStep}
            onPrev={prevStep}
            onExit={exitTour}
            onComplete={completeTour}
          />
        </SpotlightOverlay>
      ) : (
        <WelcomeModal userName={userName} />
      )}
    </>
  );
};
