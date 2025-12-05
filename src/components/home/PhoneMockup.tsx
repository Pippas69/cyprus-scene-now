import { motion } from "framer-motion";

const PhoneMockup = () => {
  const mockEvents = [
    { title: "Beach Party Paphos", time: "Σάββατο 21:00", attendees: 127, color: "bg-sunset-coral" },
    { title: "Live Music Night", time: "Παρασκευή 20:00", attendees: 89, color: "bg-seafoam" },
    { title: "Wine Tasting Limassol", time: "Κυριακή 18:00", attendees: 45, color: "bg-aegean" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="relative"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-sunset-coral/30 via-seafoam/20 to-aegean/30 blur-3xl scale-110 rounded-full" />
      
      {/* Phone frame */}
      <div className="relative bg-foreground rounded-[3rem] p-3 shadow-2xl">
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
      </div>
    </motion.div>
  );
};

export default PhoneMockup;
