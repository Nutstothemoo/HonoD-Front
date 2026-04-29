'use client';

import { animate, motion, useMotionValue, useTransform, type HTMLMotionProps, type Transition } from 'framer-motion';
import { forwardRef, useEffect } from 'react';

// Shared spring vocabulary. Stick to these instead of inventing one-off transitions
// — keeping the catalogue small is what makes the whole UI feel cohesive.
export const springs = {
  // Default — for almost everything (panels, modals, list reorders).
  default: { type: 'spring', stiffness: 320, damping: 28, mass: 0.6 } as Transition,
  // Snappy — for micro-interactions (button press, hover lift, toggle).
  snappy:  { type: 'spring', stiffness: 520, damping: 32, mass: 0.5 } as Transition,
  // Gentle — for entrances of large surfaces (full-screen overlays).
  gentle:  { type: 'spring', stiffness: 220, damping: 30, mass: 0.8 } as Transition,
  // Bouncy — sparingly, for celebratory moments (KPI win, success toast).
  bouncy:  { type: 'spring', stiffness: 380, damping: 18, mass: 0.5 } as Transition,
} as const;

type RevealProps = HTMLMotionProps<'div'> & {
  /** Delay (ms) before the animation starts — handy for stagger. */
  delay?: number;
  /** Direction the element slides in from. Defaults to 'up'. */
  from?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Slide distance in px. Defaults to 8. */
  distance?: number;
};

const offsetFor = (from: RevealProps['from'], d: number) => {
  switch (from) {
    case 'down':  return { y: -d };
    case 'left':  return { x: d };
    case 'right': return { x: -d };
    case 'none':  return {};
    case 'up':
    default:      return { y: d };
  }
};

// Drop-in replacement for a div that fades + slides into place on mount.
// Inherits the spring from <MotionConfig> unless `transition` is overridden.
export const Reveal = forwardRef<HTMLDivElement, RevealProps>(function Reveal(
  { delay = 0, from = 'up', distance = 8, transition, ...rest },
  ref,
) {
  const offset = offsetFor(from, distance);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, ...offset }}
      transition={transition ?? { ...springs.default, delay: delay / 1000 }}
      {...rest}
    />
  );
});

type AnimatedNumberProps = {
  value: number;
  /** Decimals to display. Default 0. */
  decimals?: number;
  /** Tween duration in seconds. Default 0.6 — short enough to keep the UI snappy. */
  duration?: number;
  /** Optional className applied to the inline span. */
  className?: string;
};

// Tweens between numeric values smoothly — we never re-render text on each frame,
// the DOM node's textContent is updated directly via useTransform → motionValue.
export function AnimatedNumber({ value, decimals = 0, duration = 0.6, className }: AnimatedNumberProps) {
  const mv = useMotionValue(value);
  const display = useTransform(mv, (v) => v.toFixed(decimals));

  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return controls.stop;
  }, [value, duration, mv]);

  return <motion.span className={className}>{display}</motion.span>;
}
