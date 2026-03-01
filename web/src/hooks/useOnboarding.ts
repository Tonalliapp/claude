import { useState, useCallback } from 'react';

const COMPLETE_KEY = 'tonalli_onboarding_complete';
const STEP_KEY = 'tonalli_onboarding_step';

export function useOnboarding() {
  const [step, setStepState] = useState(() => {
    const saved = localStorage.getItem(STEP_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });

  const isComplete = localStorage.getItem(COMPLETE_KEY) === 'true';

  const setStep = useCallback((s: number) => {
    setStepState(s);
    localStorage.setItem(STEP_KEY, String(s));
  }, []);

  const complete = useCallback(() => {
    localStorage.setItem(COMPLETE_KEY, 'true');
    localStorage.removeItem(STEP_KEY);
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(COMPLETE_KEY);
    localStorage.removeItem(STEP_KEY);
    setStepState(0);
  }, []);

  return { step, setStep, isComplete, complete, reset };
}
