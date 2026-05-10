import { motion } from "framer-motion";

interface WhyFOMOProps {
  language: "el" | "en";
}

const content = {
  el: {
    eyebrow: "Γιατί εμείς",
    title: "Why ΦΟΜΟ",
    rows: [
      { letter: "Φ", sentence: "Φέρνει τους σωστούς πελάτες στην πόρτα σου" },
      { letter: "Ο", sentence: "Όλα σε ένα μέρος — events, κρατήσεις, εισιτήρια" },
      { letter: "Μ", sentence: "Μέγιστη ορατότητα για κάθε επιχείρηση στην Κύπρο" },
      { letter: "Ο", sentence: "Ο απόλυτος οδηγός nightlife για χρήστες και επιχειρήσεις" },
    ],
  },
  en: {
    eyebrow: "Why us",
    title: "Why ΦΟΜΟ",
    rows: [
      { letter: "Φ", sentence: "Φind every event, venue, and experience Cyprus has to offer" },
      { letter: "Ο", sentence: "One app for reservations, tickets, and exclusive deals" },
      { letter: "Μ", sentence: "Maximum reach for your business, with real-time analytics and zero hassle" },
      { letter: "Ο", sentence: "Over 10,000 users discovering something new every day" },
    ],
  },
};

const WhyFOMO = ({ language }: WhyFOMOProps) => {
  const t = content[language];

  return (
    <section className="py-14 sm:py-20 bg-background overflow-hidden">
      <div className="px-6 sm:px-10 lg:px-16">
        <div className="flex flex-col max-w-5xl mx-auto">

          {/* Left — sticky title */}
          <div className="mb-10 sm:mb-14">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7 }}
              className="font-inter text-[10px] tracking-[0.24em] text-white/40 uppercase mb-4"
            >
              {t.eyebrow}
            </motion.p>

            <h2
              className="font-urbanist font-black text-white leading-[0.88] tracking-[-0.04em]"
              style={{ fontSize: "clamp(2.4rem, 5vw, 4.5rem)" }}
            >
              {"Why ΦΟΜΟ".split("").map((char, i) => (
                <motion.span
                  key={i}
                  className="inline-block overflow-hidden"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                >
                  <motion.span
                    className="inline-block"
                    variants={{
                      hidden: { y: "110%", rotateZ: 6 },
                      visible: {
                        y: "0%",
                        rotateZ: 0,
                        transition: {
                          duration: 0.9,
                          ease: [0.215, 0.61, 0.355, 1],
                          delay: i * 0.04,
                        },
                      },
                    }}
                  >
                    {char === " " ? " " : char}
                  </motion.span>
                </motion.span>
              ))}
            </h2>
          </div>

          {/* Right — acrostic rows */}
          <div className="flex flex-col">
            {t.rows.map((row, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 32 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.7,
                  ease: [0.16, 1, 0.3, 1],
                  delay: i * 0.1,
                }}
                className={`flex items-center gap-6 sm:gap-8 py-7 sm:py-8 ${
                  i < t.rows.length - 1 ? "border-b border-white/[0.07]" : ""
                }`}
              >
                {/* Large letter */}
                <span
                  className={`font-urbanist font-black leading-none flex-shrink-0 select-none ${row.letter === "Φ" ? "text-[#7EC8F0]" : "text-white"}`}
                  style={{ fontSize: "clamp(3.5rem, 6vw, 6rem)", lineHeight: 1 }}
                >
                  {row.letter}
                </span>

                {/* Sentence */}
                <p
                  className="font-urbanist font-semibold text-white/85 leading-snug tracking-[-0.01em]"
                  style={{ fontSize: "clamp(1rem, 2vw, 1.35rem)" }}
                >
                  {row.sentence}
                </p>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};

export default WhyFOMO;
