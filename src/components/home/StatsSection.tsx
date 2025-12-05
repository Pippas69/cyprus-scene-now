import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

interface StatsSectionProps {
  language: "el" | "en";
}

const StatsSection = ({ language }: StatsSectionProps) => {
  const text = {
    el: {
      title: "Η Κοινότητά μας",
      stats: [
        { value: 500, suffix: "+", label: "Εκδηλώσεις" },
        { value: 10, suffix: "K+", label: "Χρήστες" },
        { value: 200, suffix: "+", label: "Επιχειρήσεις" },
      ],
    },
    en: {
      title: "Our Community",
      stats: [
        { value: 500, suffix: "+", label: "Events" },
        { value: 10, suffix: "K+", label: "Users" },
        { value: 200, suffix: "+", label: "Businesses" },
      ],
    },
  };

  const t = text[language];
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section className="py-24 bg-gradient-to-br from-aegean via-aegean/90 to-seafoam/80 text-white">
      <div className="container mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-cinzel text-4xl md:text-5xl font-bold text-center mb-16"
        >
          {t.title}
        </motion.h2>

        <div ref={ref} className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {t.stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: index * 0.15, duration: 0.5 }}
              className="text-center"
            >
              <div className="font-cinzel text-5xl md:text-6xl font-black mb-2">
                <CountUp target={stat.value} isInView={isInView} />
                {stat.suffix}
              </div>
              <p className="text-xl text-white/80 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// CountUp component for animated numbers
const CountUp = ({ target, isInView }: { target: number; isInView: boolean }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const duration = 2000;
    const steps = 60;
    const stepValue = target / steps;
    const stepDuration = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += stepValue;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [target, isInView]);

  return <span>{count}</span>;
};

export default StatsSection;
