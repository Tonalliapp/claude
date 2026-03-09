import { useState, useCallback } from 'react';
import { apiFetch } from '@/config/api';

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
    // Persist to backend so it survives across devices/browsers
    apiFetch('/tenants/me', {
      method: 'PUT',
      body: { config: { onboardingComplete: true } },
      auth: true,
    }).catch(() => {});
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(COMPLETE_KEY);
    localStorage.removeItem(STEP_KEY);
    setStepState(0);
  }, []);

  return { step, setStep, isComplete, complete, reset };
}
