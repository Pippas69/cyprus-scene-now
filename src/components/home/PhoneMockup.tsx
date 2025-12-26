import { useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

const PhoneMockup = () => {
  const mockEvents = [
    { title: "Beach Party Paphos", time: "Σάββατο 21:00", attendees: 127, color: "bg-sunset-coral" },
    { title: "Live Music Night", time: "Παρασκευή 20:00", attendees: 89, color: "bg-seafoam" },
    { title: "Wine Tasting Limassol", time: "Κυριακή 18:00", attendees: 45, color: "bg-aegean" },
  ];

  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  // Motion values for mouse position
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring config for smooth animation
  const springConfig = { stiffness: 150, damping: 20 };
  
  // Transform mouse position to rotation (max ±12 degrees)
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [12, -12]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Normalize to -0.5 to 0.5 range
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
      {/* Glow effect */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-br from-sunset-coral/30 via-seafoam/20 to-aegean/30 blur-3xl scale-110 rounded-full"
        style={{
          rotateX: isHovering ? rotateX : 0,
          rotateY: isHovering ? rotateY : 0,
        }}
      />
      
      {/* Phone frame with 3D tilt */}
      <motion.div 
        className="relative bg-foreground rounded-[3rem] p-3 shadow-2xl"
        style={{
          rotateX: isHovering ? rotateX : 0,
          rotateY: isHovering ? rotateY : 0,
          transformStyle: "preserve-3d",
        }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className="bg-background rounded-[2.5rem] overflow-hidden w-[280px] h-[580px]">
          {/* Status bar */}
          <div className="bg-background px-6 py-3 flex justify-between items-center">
            <span className="text-xs font-medium text-foreground">9:41</span>
            <div className="flex gap-1">
              <div className="w-4 h-2 bg-foreground/60 rounded-sm" />
              <div className="w-4 h-2 bg-foreground/60 rounded-sm" />
              <div className="w-6 h-3 bg-foreground/60 rounded-sm" />
            </div>
          </div>
          
          {/* App header */}
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-cinzel text-xl font-bold text-foreground">ΦΟΜΟ</h3>
            <p className="text-xs text-muted-foreground">Τι γίνεται τώρα</p>
          </div>
          
          {/* Event cards */}
          <div className="p-4 space-y-3">
            {mockEvents.map((event, index) => (
              <motion.div
                key={event.title}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.15 }}
                className="bg-card rounded-xl p-3 shadow-sm border border-border"
                style={{ transform: "translateZ(20px)" }}
              >
                <div className={`w-full h-20 ${event.color} rounded-lg mb-2 flex items-center justify-center`}>
                  <span className="text-white/80 text-2xl">🎉</span>
                </div>
                <h4 className="font-semibold text-sm text-foreground">{event.title}</h4>
                <p className="text-xs text-muted-foreground">{event.time}</p>
                <div className="flex items-center gap-1 mt-2">
                  <div className="flex -space-x-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="w-5 h-5 rounded-full bg-muted border-2 border-card" />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">+{event.attendees} going</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Home indicator */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-background/50 rounded-full" />
      </motion.div>
    </motion.div>
  );
};

export default PhoneMockup;
