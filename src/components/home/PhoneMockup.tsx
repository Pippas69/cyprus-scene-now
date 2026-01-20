import { useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Flame, Sparkles, Crown, MapPin, Calendar, Users } from "lucide-react";

const PhoneMockup = () => {
  // Mock feed data - Events and Offers
  const boostedEvents = [
    { 
      type: "event",
      title: "Summer Vibes Beach Party", 
      location: "Λεμεσός · Guaba Beach Bar",
      time: "Σάββατο 22:00", 
      attendees: 247, 
      isBoosted: true,
      image: "🏖️",
      category: "Nightlife"
    },
  ];

  const boostedOffers = [
    { 
      type: "offer",
      title: "-40% Cocktails All Night", 
      location: "Λάρνακα · Club 66",
      expires: "Λήγει σε 2 ημέρες", 
      isBoosted: true,
      image: "🍸",
      discount: "-40%"
    },
  ];

  const regularEvents = [
    { 
      type: "event",
      title: "Live Jazz Night", 
      location: "Λευκωσία · Blue Note Bar",
      time: "Παρασκευή 21:00", 
      attendees: 89, 
      image: "🎷",
      category: "Μουσική"
    },
    { 
      type: "event",
      title: "Wine & Dine Sunset", 
      location: "Πάφος · Paphos Wine House",
      time: "Κυριακή 18:30", 
      attendees: 56, 
      image: "🍷",
      category: "Φαγητό & Ποτό"
    },
  ];

  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { stiffness: 150, damping: 20 };
  
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [12, -12]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = (e.clientX - centerX) / rect.width;
    const y = (e.clientY - centerY) / rect.height;
    
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="relative"
      style={{ perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Premium Glow effect with seafoam/aegean */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-br from-seafoam/40 via-aegean/30 to-seafoam/40 blur-3xl scale-110 rounded-full"
        style={{
          rotateX: isHovering ? rotateX : 0,
          rotateY: isHovering ? rotateY : 0,
        }}
      />
      
      {/* Phone frame - Premium seafoam/aegean gradient border */}
      <motion.div 
        className="relative bg-gradient-to-br from-seafoam via-aegean to-seafoam rounded-[3rem] p-[3px] shadow-2xl"
        style={{
          rotateX: isHovering ? rotateX : 0,
          rotateY: isHovering ? rotateY : 0,
          transformStyle: "preserve-3d",
        }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className="bg-background rounded-[2.8rem] overflow-hidden w-[300px] h-[620px]">
          {/* Status bar */}
          <div className="bg-background px-6 py-3 flex justify-between items-center">
            <span className="text-xs font-medium text-foreground">9:41</span>
            <div className="flex gap-1">
              <div className="w-4 h-2 bg-foreground/60 rounded-sm" />
              <div className="w-4 h-2 bg-foreground/60 rounded-sm" />
              <div className="w-6 h-3 bg-seafoam rounded-sm" />
            </div>
          </div>
          
          {/* App header */}
          <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-seafoam/5 to-aegean/5">
            <h3 className="font-cinzel text-xl font-bold bg-gradient-to-r from-seafoam to-aegean bg-clip-text text-transparent">ΦΟΜΟ</h3>
            <p className="text-xs text-muted-foreground">Τι γίνεται τώρα στην Κύπρο</p>
          </div>
          
          {/* Feed content */}
          <div className="p-3 space-y-3 overflow-hidden h-[500px]">
            {/* Boosted Events Section */}
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-foreground">Boosted Events</span>
            </div>
            
            {boostedEvents.map((event, index) => (
              <motion.div
                key={event.title}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="relative bg-card rounded-xl overflow-hidden shadow-sm border border-seafoam/20"
              >
                {/* Boosted badge */}
                <div className="absolute top-2 right-2 z-10">
                  <div className="bg-amber-500 rounded-full p-1.5">
                    <Crown className="w-3 h-3 text-white" />
                  </div>
                </div>
                
                <div className="h-16 bg-gradient-to-r from-seafoam/30 to-aegean/30 flex items-center justify-center text-2xl">
                  {event.image}
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] px-2 py-0.5 bg-seafoam/10 text-seafoam rounded-full">{event.category}</span>
                  <h4 className="font-semibold text-xs text-foreground mt-1">{event.title}</h4>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3" />
                    {event.location}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {event.time}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-seafoam">
                      <Users className="w-3 h-3" />
                      {event.attendees}+
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Boosted Offers Section */}
            <div className="flex items-center gap-2 mb-2 mt-3">
              <Sparkles className="w-4 h-4 text-green-500" />
              <span className="text-xs font-semibold text-foreground">Boosted Offers</span>
            </div>

            {boostedOffers.map((offer, index) => (
              <motion.div
                key={offer.title}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="relative bg-card rounded-xl overflow-hidden shadow-sm border border-green-500/20"
              >
                {/* Boosted badge */}
                <div className="absolute top-2 right-2 z-10">
                  <div className="bg-green-500 rounded-full p-1.5">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>
                
                <div className="h-14 bg-gradient-to-r from-green-500/20 to-seafoam/20 flex items-center justify-center text-2xl">
                  {offer.image}
                </div>
                <div className="p-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-foreground">{offer.title}</h4>
                    <span className="text-[10px] px-2 py-0.5 bg-green-500 text-white rounded-full font-bold">{offer.discount}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3" />
                    {offer.location}
                  </div>
                  <div className="text-[10px] text-amber-600 mt-1.5">{offer.expires}</div>
                </div>
              </motion.div>
            ))}

            {/* Regular Events */}
            <div className="flex items-center gap-2 mb-2 mt-3">
              <span className="text-xs font-semibold text-muted-foreground">Νυχτερινή Ζωή</span>
            </div>

            {regularEvents.map((event, index) => (
              <motion.div
                key={event.title}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + index * 0.1 }}
                className="bg-card rounded-xl p-2.5 shadow-sm border border-border"
              >
                <div className="flex gap-2">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xl flex-shrink-0">
                    {event.image}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-xs text-foreground truncate">{event.title}</h4>
                    <p className="text-[10px] text-muted-foreground truncate">{event.location}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-aegean">{event.time}</span>
                      <span className="text-[10px] text-muted-foreground">{event.attendees}+ going</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Home indicator */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/50 rounded-full" />
      </motion.div>
    </motion.div>
  );
};

export default PhoneMockup;
