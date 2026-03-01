import { Check } from 'lucide-react';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export default function OnboardingProgress({ currentStep, totalSteps, labels }: OnboardingProgressProps) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-2xl mx-auto">
      {Array.from({ length: totalSteps }, (_, i) => {
        const isComplete = i < currentStep;
        const isCurrent = i === currentStep;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  isComplete
                    ? 'bg-gold text-tonalli-black'
                    : isCurrent
                    ? 'bg-gold/20 text-gold border-2 border-gold'
                    : 'bg-tonalli-black-elevated text-silver-dark border border-light-border'
                }`}
              >
                {isComplete ? <Check size={16} /> : i + 1}
              </div>
              <span
                className={`text-[10px] mt-1.5 whitespace-nowrap ${
                  isComplete || isCurrent ? 'text-gold' : 'text-silver-dark'
                }`}
              >
                {labels[i]}
              </span>
            </div>
            {i < totalSteps - 1 && (
              <div className="flex-1 mx-2 mt-[-16px]">
                <div className={`h-px ${isComplete ? 'bg-gold' : 'bg-light-border'}`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
