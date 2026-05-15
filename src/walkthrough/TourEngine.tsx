import React, { useEffect, useRef } from 'react';
import { useWalkthrough } from './WalkthroughContext';
import { SpotlightOverlay } from './components/SpotlightOverlay';
import { TourTooltip } from './components/TourTooltip';
import { ChecklistWidget } from './components/ChecklistWidget';
import { WelcomeModal } from './components/WelcomeModal';
import { PageDiscoveryCard } from './components/PageDiscoveryCard';

// CSS animations always injected — PageDiscoveryCard uses tour-fade-in even with no active tour
const TOUR_STYLES = `
  @keyframes tour-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(194,12,11,0.4); }
    50% { box-shadow: 0 0 0 10px rgba(194,12,11,0); }
  }
  @keyframes tour-fade-in {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

interface TourEngineProps {
  userName?: string;
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

export const TourEngine: React.FC<TourEngineProps> = ({ userName, currentPage, onNavigate }) => {
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

      {/* Page discovery card — inline hint shown on first visit to each page */}
      {!activeTour && currentPage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, pointerEvents: 'none' }}>
          {/* Actual card is rendered by the page itself via PageDiscoveryCard component */}
        </div>
      )}

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
        <>
          <ChecklistWidget />
          <WelcomeModal userName={userName} />
        </>
      )}
    </>
  );
};
