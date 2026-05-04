import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { TrendingUp, Users, Calendar, Building2 } from "lucide-react";

interface StatsSectionProps {
  language: "el" | "en";
}

const copy = {
  el: {
    eyebrow: "Αυξανόμενη Κοινότητα",
    title: "Η Κύπρος Ανακαλύπτεται",
    stats: [
      { value: 500, suffix: "+", label: "Events", sub: "κάθε μήνα", icon: Calendar },
      { value: 10, suffix: "K+", label: "Χρήστες", sub: "ενεργοί στην πλατφόρμα", icon: Users },
      { value: 200, suffix: "+", label: "Επιχειρήσεις", sub: "συνεργάτες", icon: Building2 },
      { value: 98, suffix: "%", label: "Ικανοποίηση", sub: "από χρήστες & επιχειρήσεις", icon: TrendingUp },
    ],
  },
  en: {
    eyebrow: "Growing Community",
    title: "Cyprus Is Being Discovered",
    stats: [
      { value: 500, suffix: "+", label: "Events", sub: "every month", icon: Calendar },
      { value: 10, suffix: "K+", label: "Users", sub: "active on the platform", icon: Users },
      { value: 200, suffix: "+", label: "Businesses", sub: "partner venues", icon: Building2 },
      { value: 98, suffix: "%", label: "Satisfaction", sub: "from users & businesses", icon: TrendingUp },
    ],
  },
};

const CountUp = ({ target, isInView }: { target: number; isInView: boolean }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1800;
    const steps = 60;
    const stepVal = target / steps;
    const stepDur = duration / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += stepVal;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, stepDur);
    return () => clearInterval(timer);
  }, [target, isInView]);

  return <span>{count}</span>;
};

const StatsSection = ({ language }: StatsSectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const t = copy[language];

  return (
    <section className="relative py-24 sm:py-32 bg-background overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,hsl(var(--primary)/0.18),transparent)]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16 sm:mb-20"
        >
          <p className="text-seafoam text-xs font-semibold tracking-widest uppercase mb-3">{t.eyebrow}</p>
          <h2 className="font-urbanist font-black text-4xl sm:text-5xl lg:text-6xl text-white leading-tight">
            {t.title}
          </h2>
        </motion.div>

        {/* Stats grid */}
        <div ref={ref} className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 max-w-5xl mx-auto">
          {t.stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              style={{ perspective: 800 }}
              initial={{ opacity: 0, y: 32, rotateX: 14 }}
              animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
              transition={{ delay: index * 0.1, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex flex-col gap-3 p-5 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-white/12 hover:bg-white/[0.05] transition-all duration-300 group">
                <div className="w-9 h-9 rounded-xl bg-seafoam/10 flex items-center justify-center">
                  <stat.icon className="w-4.5 h-4.5 text-seafoam" style={{ width: "18px", height: "18px" }} />
                </div>
                <div>
                  <p className="font-urbanist font-black text-3xl sm:text-4xl text-white leading-none mb-1">
                    <CountUp target={stat.value} isInView={isInView} />{stat.suffix}
                  </p>
                  <p className="text-white font-semibold text-sm">{stat.label}</p>
                  <p className="text-white/35 text-xs mt-0.5">{stat.sub}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
    </section>
  );
};

export default StatsSection;
