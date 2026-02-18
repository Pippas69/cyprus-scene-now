import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TestimonialsSectionProps {
  language: "en" | "el";
}

const testimonials = [
{
  id: 1,
  name: "Maria Georgiou",
  role: { en: "Event Enthusiast", el: "Λάτρης Εκδηλώσεων" },
  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
  rating: 5,
  text: {
    en: "ΦΟΜΟ changed how I discover events in Cyprus! I never miss the best parties and cultural happenings anymore.",
    el: "Το ΦΟΜΟ άλλαξε τον τρόπο που ανακαλύπτω εκδηλώσεις στην Κύπρο! Δεν χάνω πια τα καλύτερα πάρτι και πολιτιστικά δρώμενα."
  }
},
{
  id: 2,
  name: "Andreas Christodoulou",
  role: { en: "Bar Owner, Limassol", el: "Ιδιοκτήτης Bar, Λεμεσός" },
  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
  rating: 5,
  text: {
    en: "Our venue's bookings increased by 40% since joining ΦΟΜΟ. The platform connects us directly with our target audience.",
    el: "Οι κρατήσεις του μαγαζιού μας αυξήθηκαν κατά 40% από τότε που μπήκαμε στο ΦΟΜΟ. Η πλατφόρμα μας συνδέει άμεσα με το κοινό μας."
  }
},
{
  id: 3,
  name: "Elena Papantoniou",
  role: { en: "Music Festival Organizer", el: "Διοργανώτρια Μουσικών Φεστιβάλ" },
  avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
  rating: 5,
  text: {
    en: "The analytics and boost features helped our summer festival reach 10,000+ attendees. Absolutely essential for event promotion!",
    el: "Τα analytics και οι λειτουργίες boost βοήθησαν το καλοκαιρινό μας φεστιβάλ να φτάσει 10.000+ επισκέπτες. Απολύτως απαραίτητο!"
  }
},
{
  id: 4,
  name: "Nikos Stavrou",
  role: { en: "University Student", el: "Φοιτητής Πανεπιστημίου" },
  avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
  rating: 5,
  text: {
    en: "Best app for finding student nights and discounts! The QR offers save me so much money every weekend.",
    el: "Η καλύτερη εφαρμογή για φοιτητικές βραδιές και εκπτώσεις! Οι προσφορές με QR μου εξοικονομούν πολλά κάθε Σαββατοκύριακο."
  }
}];


const TestimonialsSection = ({ language }: TestimonialsSectionProps) => {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const next = () => setCurrent((prev) => (prev + 1) % testimonials.length);
  const prev = () => setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  const content = {
    en: {
      title: "What People Say",
      subtitle: "Join thousands discovering the best of Cyprus"
    },
    el: {
      title: "Τι Λένε οι Άνθρωποι",
      subtitle: "Γίνε μέρος χιλιάδων που ανακαλύπτουν το καλύτερο της Κύπρου"
    }
  };

  return (
    <section className="relative py-10 sm:py-12 md:py-16 overflow-hidden bg-white dark:bg-white">
      <div className="container mx-auto px-3 sm:px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-6 sm:mb-8 md:mb-10">

          


          


        </motion.div>

        <div
          className="relative max-w-4xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}>

          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="bg-[#3d5a6e] backdrop-blur-md border border-[#4a6b7f]/50 rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-10 lg:p-12 shadow-card">

              <Quote className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-seafoam/50 mb-4 sm:mb-5 md:mb-6" />
              
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white mb-5 sm:mb-6 md:mb-8 leading-relaxed">
                "{testimonials[current].text[language]}"
              </p>

              <div className="flex items-center gap-3 sm:gap-4">
                <img
                  src={testimonials[current].avatar}
                  alt={testimonials[current].name}
                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full object-cover border-2 border-white/30" />

                <div>
                  <h4 className="font-semibold text-white text-sm sm:text-base">
                    {testimonials[current].name}
                  </h4>
                  <p className="text-xs sm:text-sm text-white/70">
                    {testimonials[current].role[language]}
                  </p>
                  <div className="flex gap-0.5 sm:gap-1 mt-1">
                    {Array.from({ length: testimonials[current].rating }).map((_, i) =>
                    <Star key={i} className="w-3 h-3 sm:w-4 sm:h-4 fill-seafoam text-seafoam" />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots only - no arrows, auto-scrolls */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-5 sm:mt-6 md:mt-8">
            {testimonials.map((_, i) =>
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
              i === current ?
              "bg-[#0d3b66] w-4 sm:w-6" :
              "bg-[#0d3b66]/30 hover:bg-[#0d3b66]/50 w-1.5 sm:w-2"}`
              } />

            )}
          </div>
        </div>
      </div>
    </section>);

};

export default TestimonialsSection;