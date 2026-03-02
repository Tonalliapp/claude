import { motion } from 'framer-motion';

interface TonalliLogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

export default function TonalliLogo({ size = 32, animated = false, className = '' }: TonalliLogoProps) {
  const Wrapper = animated ? motion.svg : 'svg';
  const animProps = animated
    ? { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 1 } }
    : {};

  return (
    <Wrapper
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      fill="none"
      width={size}
      height={size}
      className={className}
      {...animProps}
    >
      <defs>
        <radialGradient id="sun-core-g" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#E2C97E" />
          <stop offset="50%" stopColor="#C9A84C" />
          <stop offset="100%" stopColor="#9A7B2F" />
        </radialGradient>
      </defs>
      {/* Outer silver ring */}
      <circle cx="100" cy="100" r="60" stroke="#C0C0C0" strokeWidth="0.6" opacity="0.08" />
      {/* Jade ring */}
      <circle cx="100" cy="100" r="50" stroke="#4A8C6F" strokeWidth="0.8" opacity="0.2" />
      {/* Gold ring */}
      <circle cx="100" cy="100" r="40" stroke="#C9A84C" strokeWidth="1" opacity="0.3" />
      {/* 12 Ray lines */}
      <g stroke="#C9A84C" strokeWidth="1.2" strokeLinecap="round" opacity="0.55">
        <line x1="100" y1="30" x2="100" y2="14" />
        <line x1="135" y1="39.5" x2="143" y2="25.6" />
        <line x1="160.5" y1="65" x2="174.4" y2="57" />
        <line x1="170" y1="100" x2="186" y2="100" />
        <line x1="160.5" y1="135" x2="174.4" y2="143" />
        <line x1="135" y1="160.5" x2="143" y2="174.4" />
        <line x1="100" y1="170" x2="100" y2="186" />
        <line x1="65" y1="160.5" x2="57" y2="174.4" />
        <line x1="39.5" y1="135" x2="25.6" y2="143" />
        <line x1="30" y1="100" x2="14" y2="100" />
        <line x1="39.5" y1="65" x2="25.6" y2="57" />
        <line x1="65" y1="39.5" x2="57" y2="25.6" />
      </g>
      {/* 4 Jade leaf accents */}
      <g fill="#4A8C6F" opacity="0.35">
        <ellipse cx="117.5" cy="32" rx="2" ry="4" transform="rotate(15 117.5 32)" />
        <ellipse cx="168" cy="82.5" rx="2" ry="4" transform="rotate(105 168 82.5)" />
        <ellipse cx="82.5" cy="168" rx="2" ry="4" transform="rotate(195 82.5 168)" />
        <ellipse cx="32" cy="117.5" rx="2" ry="4" transform="rotate(285 32 117.5)" />
      </g>
      {/* 4 Gold diamond rays at cardinal points */}
      <g fill="#C9A84C" opacity="0.7">
        <polygon points="100,6 103,10 100,14 97,10" />
        <polygon points="194,100 190,103 186,100 190,97" />
        <polygon points="100,194 103,190 100,186 97,190" />
        <polygon points="6,100 10,103 14,100 10,97" />
      </g>
      {/* Sun core */}
      <circle cx="100" cy="100" r="26" fill="url(#sun-core-g)" />
    </Wrapper>
  );
}
