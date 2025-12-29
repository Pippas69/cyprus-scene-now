import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TypewriterProps {
  phrases: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  className?: string;
  cursorClassName?: string;
}

const Typewriter = ({
  phrases,
  typingSpeed = 80,
  deletingSpeed = 50,
  pauseDuration = 2000,
  className = "",
  cursorClassName = "",
}: TypewriterProps) => {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    
    if (prefersReducedMotion) {
      // Just show the first phrase without animation
      setCurrentText(phrases[0]);
      return;
    }

    const currentPhrase = phrases[currentPhraseIndex];

    if (isPaused) {
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, pauseDuration);
      return () => clearTimeout(pauseTimer);
    }

    if (!isDeleting) {
      // Typing
      if (currentText.length < currentPhrase.length) {
        const timer = setTimeout(() => {
          setCurrentText(currentPhrase.slice(0, currentText.length + 1));
        }, typingSpeed);
        return () => clearTimeout(timer);
      } else {
        // Finished typing, pause before deleting
        setIsPaused(true);
      }
    } else {
      // Deleting
      if (currentText.length > 0) {
        const timer = setTimeout(() => {
          setCurrentText(currentText.slice(0, -1));
        }, deletingSpeed);
        return () => clearTimeout(timer);
      } else {
        // Finished deleting, move to next phrase
        setIsDeleting(false);
        setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
      }
    }
  }, [currentText, isDeleting, isPaused, currentPhraseIndex, phrases, typingSpeed, deletingSpeed, pauseDuration]);

  return (
    <span className="inline-flex items-center">
      <AnimatePresence mode="wait">
        <motion.span
          key={currentText}
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 1 }}
          className={`inline-block ${className}`}
        >
          {currentText}
        </motion.span>
      </AnimatePresence>
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        className={`inline-block w-[3px] h-[1.1em] ml-1 bg-aegean ${cursorClassName}`}
      />
    </span>
  );
};

export default Typewriter;
