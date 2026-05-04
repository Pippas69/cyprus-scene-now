export const spring = {
  snappy: { type: "spring" as const, stiffness: 400, damping: 30 },
  smooth: { type: "spring" as const, stiffness: 260, damping: 28 },
  gentle: { type: "spring" as const, stiffness: 170, damping: 26 },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export const staggerContainer = (delay = 0.05) => ({
  hidden: {},
  show: { transition: { staggerChildren: delay } },
});

export const reducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const withReducedMotion = <T extends object>(transition: T): T =>
  reducedMotion ? ({ ...transition, duration: 0 } as T) : transition;
