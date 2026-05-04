import { useState, useRef, useCallback, useEffect, KeyboardEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useLanguage } from "@/hooks/useLanguage";
import { profileTranslations } from "@/translations/profileTranslations";
import { spring, fadeUp, staggerContainer, reducedMotion } from "@/lib/motion";
import { SavedEvents } from "@/components/user/SavedEvents";
import {
  ArrowLeft, Calendar, Heart, Ticket, MapPin, Share2, Settings,
  AlertCircle, RefreshCw, Clock,
} from "lucide-react";
import { format } from "date-fns";
import { el as elLocale, enUS } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityType = "attended" | "going" | "saved";

interface ActivityItem {
  id: string;
  type: ActivityType;
  eventTitle: string;
  businessName: string | null;
  eventDate: string | null;
  coverUrl: string | null;
  createdAt: string;
}

interface RawEventData {
  id: string;
  title: string;
  start_at: string | null;
  cover_image_url: string | null;
  businesses: { name: string } | null;
}

interface RawEventRow {
  id: string;
  created_at: string;
  events: RawEventData | null;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Pulse = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />
);

const HeroSkeleton = () => (
  <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-6 sm:p-8 mb-2">
    <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-center sm:items-start">
      <Pulse className="w-24 h-24 sm:w-36 sm:h-36 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-3 w-full">
        <Pulse className="h-7 w-48" />
        <Pulse className="h-4 w-32" />
        <Pulse className="h-4 w-24" />
        <div className="flex gap-6 pt-2">
          {[0, 1, 2].map(i => <div key={i} className="space-y-1"><Pulse className="h-6 w-10" /><Pulse className="h-3 w-16" /></div>)}
        </div>
      </div>
    </div>
  </div>
);

const ActivitySkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex gap-3 items-start pl-4 border-l border-white/[0.07]">
        <Pulse className="w-8 h-8 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2 py-0.5">
          <Pulse className="h-4 w-3/4" />
          <Pulse className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

const GoingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.07]">
        <Pulse className="h-32 w-full rounded-none" />
        <div className="p-3 space-y-2">
          <Pulse className="h-4 w-3/4" />
          <Pulse className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

// ─── Blur-up image ─────────────────────────────────────────────────────────────

const BlurImage = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-[filter,opacity] duration-300 ${loaded ? "blur-0 opacity-100" : "blur-sm opacity-60"}`}
      />
    </div>
  );
};

// ─── Activity item card ────────────────────────────────────────────────────────

const typeConfig: Record<ActivityType, { icon: typeof Calendar; color: string; bg: string }> = {
  attended: { icon: Ticket, color: "text-white/60", bg: "bg-white/[0.06]" },
  going: { icon: Calendar, color: "text-seafoam", bg: "bg-seafoam/10" },
  saved: { icon: Heart, color: "text-golden", bg: "bg-golden/10" },
};

const ActivityCard = ({ item, t, language }: { item: ActivityItem; t: typeof profileTranslations.en; language: "el" | "en" }) => {
  const { icon: Icon, color, bg } = typeConfig[item.type];
  const dateLocale = language === "el" ? elLocale : enUS;
  const formattedDate = item.eventDate
    ? format(new Date(item.eventDate), "d MMM yyyy", { locale: dateLocale })
    : null;
  const typeLabel = item.type === "attended" ? t.attended : item.type === "going" ? t.rsvpd : t.savedEvent;

  return (
    <div className="flex gap-3 items-start pl-4 border-l border-white/[0.07] relative">
      <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-white/20 flex-shrink-0" />
      <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <p className="text-white/80 text-sm font-medium leading-snug truncate">{item.eventTitle}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {item.businessName && <span className="text-white/40 text-xs truncate">{item.businessName}</span>}
          {formattedDate && <><span className="text-white/20 text-xs">·</span><span className="text-white/30 text-xs">{formattedDate}</span></>}
        </div>
      </div>
      <span className={`text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full ${bg} ${color} flex-shrink-0 mt-1`}>{typeLabel}</span>
    </div>
  );
};

// ─── Going event card ──────────────────────────────────────────────────────────

const GoingCard = ({ reservation, language }: { reservation: RawEventRow; language: "el" | "en" }) => {
  const dateLocale = language === "el" ? elLocale : enUS;
  const eventDate = reservation.events?.start_at
    ? format(new Date(reservation.events.start_at), "EEE d MMM · HH:mm", { locale: dateLocale })
    : null;

  return (
    <motion.div
      whileHover={reducedMotion ? {} : { scale: 1.02 }}
      transition={spring.smooth}
      className="rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.07] group cursor-pointer"
    >
      <div className="relative h-32 overflow-hidden bg-white/[0.04]">
        {reservation.events?.cover_image_url ? (
          <BlurImage
            src={reservation.events.cover_image_url}
            alt={reservation.events.title || ""}
            className="h-full w-full"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-seafoam/10 to-primary/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <span className="absolute top-2 right-2 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-seafoam text-aegean">
          {language === "el" ? "Πηγαίνω" : "Going"}
        </span>
      </div>
      <div className="p-3">
        <p className="text-white/85 text-sm font-semibold leading-snug line-clamp-1">{reservation.events?.title}</p>
        <p className="text-white/40 text-xs mt-0.5 truncate">{reservation.events?.businesses?.name}</p>
        {eventDate && (
          <div className="flex items-center gap-1 mt-1.5">
            <Clock className="w-3 h-3 text-seafoam/70" />
            <span className="text-seafoam/70 text-xs">{eventDate}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── Empty state ───────────────────────────────────────────────────────────────

const EmptyState = ({ icon: Icon, title, sub, action, onAction }: { icon: typeof Calendar; title: string; sub: string; action?: string; onAction?: () => void }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
    <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-white/25" />
    </div>
    <p className="text-white/60 font-semibold text-base mb-1">{title}</p>
    <p className="text-white/30 text-sm max-w-xs leading-relaxed mb-5">{sub}</p>
    {action && onAction && (
      <button
        onClick={onAction}
        className="px-5 py-2.5 rounded-full bg-seafoam text-aegean text-sm font-bold hover:bg-seafoam/90 transition-all active:scale-95"
      >
        {action}
      </button>
    )}
  </div>
);

// ─── Main page ─────────────────────────────────────────────────────────────────

const TABS = ["activity", "going", "saved"] as const;
type Tab = typeof TABS[number];

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = profileTranslations[language];
  const tabListRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>("activity");

  // Current session
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessionUserId(data.session?.user?.id ?? null));
  }, []);

  const isOwnProfile = sessionUserId === userId;

  // Profile data
  const { data: profile, isLoading: profileLoading, error: profileError, refetch } = usePublicProfile(userId);

  // Stats counts
  const { data: eventsAttended = 0 } = useQuery({
    queryKey: ["profile-events-count", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq("ticket_orders.user_id" as any, userId);
      return count ?? 0;
    },
    enabled: !!userId,
  });

  const { data: goingCount = 0 } = useQuery({
    queryKey: ["profile-going-count", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count } = await supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .neq("status", "cancelled")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .gte("events.start_at" as any, new Date().toISOString());
      return count ?? 0;
    },
    enabled: !!userId,
  });

  const { data: savedCount = 0 } = useQuery({
    queryKey: ["profile-saved-count", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count } = await supabase
        .from("favorites")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      return count ?? 0;
    },
    enabled: !!userId,
  });

  // Activity feed — merged tickets + reservations + favorites
  const { data: activityItems = [], isLoading: activityLoading } = useQuery({
    queryKey: ["profile-activity", userId],
    queryFn: async () => {
      if (!userId) return [];

      const [ticketsRes, reservationsRes, favoritesRes] = await Promise.all([
        supabase
          .from("tickets")
          .select("id, created_at, events(id, title, start_at, cover_image_url, businesses(name))")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .eq("ticket_orders.user_id" as any, userId)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("reservations")
          .select("id, created_at, events(id, title, start_at, cover_image_url, businesses(name))")
          .eq("user_id", userId)
          .neq("status", "cancelled")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("favorites")
          .select("id, created_at, events(id, title, start_at, cover_image_url, businesses(name))")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const items: ActivityItem[] = [];

      (ticketsRes.data as RawEventRow[] || []).forEach((t) => {
        if (t.events) items.push({ id: `ticket-${t.id}`, type: "attended", eventTitle: t.events.title, businessName: t.events.businesses?.name ?? null, eventDate: t.events.start_at, coverUrl: t.events.cover_image_url ?? null, createdAt: t.created_at });
      });

      (reservationsRes.data as RawEventRow[] || []).forEach((r) => {
        if (r.events) items.push({ id: `res-${r.id}`, type: "going", eventTitle: r.events.title, businessName: r.events.businesses?.name ?? null, eventDate: r.events.start_at, coverUrl: r.events.cover_image_url ?? null, createdAt: r.created_at });
      });

      (favoritesRes.data as RawEventRow[] || []).forEach((f) => {
        if (f.events) items.push({ id: `fav-${f.id}`, type: "saved", eventTitle: f.events.title, businessName: f.events.businesses?.name ?? null, eventDate: f.events.start_at, coverUrl: f.events.cover_image_url ?? null, createdAt: f.created_at });
      });

      return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);
    },
    enabled: activeTab === "activity" && !!userId,
  });

  // Going tab — upcoming reservations
  const { data: goingItems = [], isLoading: goingLoading } = useQuery({
    queryKey: ["profile-going", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("reservations")
        .select("id, created_at, events(id, title, start_at, cover_image_url, businesses(name))")
        .eq("user_id", userId)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      return (data as RawEventRow[] || []).filter((r) => r.events?.start_at && new Date(r.events.start_at) > new Date());
    },
    enabled: activeTab === "going" && !!userId,
  });

  // Member since date
  const dateLocale = language === "el" ? elLocale : enUS;
  const memberSince = profile?.created_at
    ? format(new Date(profile.created_at), "MMMM yyyy", { locale: dateLocale })
    : null;

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.name || "—"
    : "—";

  const location2 = profile?.city || profile?.town;

  // Tab keyboard navigation
  const handleTabKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const idx = TABS.indexOf(activeTab);
    if (e.key === "ArrowRight") { e.preventDefault(); setActiveTab(TABS[(idx + 1) % TABS.length]); }
    if (e.key === "ArrowLeft") { e.preventDefault(); setActiveTab(TABS[(idx - 1 + TABS.length) % TABS.length]); }
  }, [activeTab]);

  const tabLabel: Record<Tab, string> = {
    activity: t.activity,
    going: t.going,
    saved: t.saved,
  };

  // Share profile
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: displayName, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
    }
  };

  // ── Error state
  if (profileError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-white/20 mx-auto" />
          <p className="text-white/60 font-medium">{t.profileError}</p>
          <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-all text-sm mx-auto">
            <RefreshCw className="w-3.5 h-3.5" /> {t.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-15 bg-[radial-gradient(ellipse,hsl(var(--primary)/0.6),transparent)]" />
        <div className="absolute bottom-0 left-0 w-80 h-80 opacity-10 bg-[radial-gradient(ellipse,hsl(var(--seafoam)/0.7),transparent)]" />
      </div>

      {/* Back button */}
      <div className="sticky top-0 z-20 px-4 sm:px-6 py-3 bg-background/80 backdrop-blur-md border-b border-white/[0.05]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{language === "el" ? "Πίσω" : "Back"}</span>
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 relative z-10">
        {/* ── Hero card ── */}
        {profileLoading ? (
          <HeroSkeleton />
        ) : (
          <motion.div
            initial={reducedMotion ? {} : fadeUp.hidden}
            animate={fadeUp.show}
            transition={spring.gentle}
            className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-6 sm:p-8 mb-4 relative overflow-hidden"
          >
            {/* Subtle radial glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_20%_50%,hsl(var(--primary)/0.12),transparent)] pointer-events-none" />

            <div className="relative flex flex-col sm:flex-row gap-5 sm:gap-6 items-center sm:items-start">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="w-24 h-24 sm:w-36 sm:h-36 rounded-full object-cover ring-2 ring-background shadow-xl"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-seafoam/20 to-primary/20 ring-2 ring-background shadow-xl flex items-center justify-center">
                    <span className="font-urbanist font-black text-3xl sm:text-4xl text-white/60">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Identity + actions */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h1 className="font-urbanist font-black text-2xl sm:text-3xl text-white leading-tight">
                      {displayName}
                    </h1>
                    {location2 && (
                      <div className="flex items-center gap-1 justify-center sm:justify-start mt-1">
                        <MapPin className="w-3.5 h-3.5 text-white/35" />
                        <span className="text-white/40 text-sm">{location2}</span>
                      </div>
                    )}
                    {memberSince && (
                      <p className="text-white/25 text-xs mt-1">{t.memberSince} {memberSince}</p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 justify-center sm:justify-start flex-shrink-0">
                    {isOwnProfile ? (
                      <>
                        <Link
                          to="/dashboard-user?tab=settings"
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-seafoam/40 text-seafoam text-xs font-semibold hover:bg-seafoam/10 transition-all"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          {t.editProfile}
                        </Link>
                        <button
                          onClick={handleShare}
                          aria-label={t.share}
                          className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white/70 hover:border-white/20 transition-all"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleShare}
                        aria-label={t.share}
                        className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white/70 hover:border-white/20 transition-all"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center justify-center sm:justify-start gap-6 mt-5 pt-4 border-t border-white/[0.07]">
                  {[
                    { value: eventsAttended, label: t.eventsAttended, tab: "activity" as Tab },
                    { value: goingCount, label: t.goingLabel, tab: "going" as Tab },
                    { value: savedCount, label: t.savedLabel, tab: "saved" as Tab },
                  ].map(({ value, label, tab }) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className="text-center group"
                    >
                      <p className="font-urbanist font-black text-xl sm:text-2xl text-white group-hover:text-seafoam transition-colors">
                        {value}
                      </p>
                      <p className="text-white/35 text-[10px] uppercase tracking-wide mt-0.5 group-hover:text-white/50 transition-colors">
                        {label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Tab bar ── */}
        <div
          ref={tabListRef}
          role="tablist"
          aria-label={language === "el" ? "Ενότητες προφίλ" : "Profile sections"}
          onKeyDown={handleTabKeyDown}
          className="flex gap-1 mb-4 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto"
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`panel-${tab}`}
              id={`tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className="relative flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seafoam/50"
              style={{ color: activeTab === tab ? "hsl(var(--seafoam))" : "rgba(255,255,255,0.4)" }}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-0 bg-seafoam/10 rounded-lg"
                  transition={reducedMotion ? { duration: 0 } : spring.smooth}
                />
              )}
              <span className="relative">{tabLabel[tab]}</span>
            </button>
          ))}
        </div>

        {/* ── Tab panels ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            id={`panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            initial={reducedMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? {} : { opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Activity tab */}
            {activeTab === "activity" && (
              <>
                {activityLoading ? (
                  <ActivitySkeleton />
                ) : activityItems.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title={t.noActivity}
                    sub={t.noActivitySub}
                    action={t.exploreEvents}
                    onAction={() => navigate("/events")}
                  />
                ) : (
                  <motion.div
                    variants={staggerContainer(0.05)}
                    initial="hidden"
                    animate="show"
                    className="space-y-3"
                  >
                    {activityItems.map((item, i) => (
                      <motion.div
                        key={item.id}
                        variants={reducedMotion ? {} : { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                        transition={spring.smooth}
                      >
                        <ActivityCard item={item} t={t} language={language} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </>
            )}

            {/* Going tab */}
            {activeTab === "going" && (
              <>
                {goingLoading ? (
                  <GoingSkeleton />
                ) : goingItems.length === 0 ? (
                  <EmptyState
                    icon={Ticket}
                    title={t.noGoing}
                    sub={t.noGoingSub}
                    action={t.exploreEvents}
                    onAction={() => navigate("/events")}
                  />
                ) : (
                  <motion.div
                    variants={staggerContainer(0.06)}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    {(goingItems as RawEventRow[]).map((res) => (
                      <motion.div
                        key={res.id}
                        variants={reducedMotion ? {} : { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                        transition={spring.smooth}
                      >
                        <GoingCard reservation={res} language={language} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </>
            )}

            {/* Saved tab */}
            {activeTab === "saved" && userId && (
              <SavedEvents userId={userId} language={language} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default UserProfile;
