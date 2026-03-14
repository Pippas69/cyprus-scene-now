// App entry point
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import BottomNav from "@/components/BottomNav";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/ui/splash-screen";
import { PageTransition } from "@/components/ui/page-transition";
import { UserLayout } from "@/components/layouts/UserLayout";
import ProtectedAdminRoute from "@/components/admin/ProtectedAdminRoute";
import AdminLayout from "@/components/layouts/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

const Index = lazy(() => import("./pages/Index"));
const Feed = lazy(() => import("./pages/Feed"));
const Ekdiloseis = lazy(() => import("./pages/Ekdiloseis"));
const Xartis = lazy(() => import("./pages/Xartis"));
const Signup = lazy(() => import("./pages/Signup"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SignupBusiness = lazy(() => import("./pages/SignupBusiness"));
const DashboardBusiness = lazy(() => import("./pages/DashboardBusiness"));
const DashboardUser = lazy(() => import("./pages/DashboardUser"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminVerification = lazy(() => import("./pages/AdminVerification"));
const AdminGeocoding = lazy(() => import("./pages/AdminGeocoding"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminReports = lazy(() => import("./pages/AdminReports"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminDatabaseMonitoring = lazy(() => import("./pages/AdminDatabaseMonitoring"));
const AdminBetaManagement = lazy(() => import("./pages/AdminBetaManagement"));
const AdminWaitlist = lazy(() => import("./pages/AdminWaitlist"));
const AdminStudentVerification = lazy(() => import("./pages/AdminStudentVerification"));
const AdminStudentPartners = lazy(() => import("./pages/AdminStudentPartners"));
const AdminStudentSubsidies = lazy(() => import("./pages/AdminStudentSubsidies"));
const AdminForbidden = lazy(() => import("./pages/AdminForbidden"));
const BusinessProfile = lazy(() => import("./pages/BusinessProfile"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const SubscriptionPlans = lazy(() => import("./pages/SubscriptionPlans"));
const Features = lazy(() => import("./pages/Features"));
const PricingPublic = lazy(() => import("./pages/PricingPublic"));
const Contact = lazy(() => import("./pages/Contact"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Messages = lazy(() => import("./pages/Messages"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TicketSuccess = lazy(() => import("./pages/TicketSuccess"));
const TicketView = lazy(() => import("./pages/TicketView"));
const ReservationView = lazy(() => import("./pages/ReservationView"));
const OfferView = lazy(() => import("./pages/OfferView"));
const ReservationSuccess = lazy(() => import("./pages/ReservationSuccess"));
const OfferPurchaseSuccess = lazy(() => import("./pages/OfferPurchaseSuccess"));
const Offers = lazy(() => import("./pages/Offers"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const CookiesPolicy = lazy(() => import("./pages/CookiesPolicy"));
const ForVisitors = lazy(() => import("./pages/ForVisitors"));
const ForBusinesses = lazy(() => import("./pages/ForBusinesses"));
const VerifyStudent = lazy(() => import("./pages/VerifyStudent"));

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="min-h-screen bg-gradient-ocean flex flex-col items-center justify-center px-6" aria-busy="true">
      <h1 className="font-cinzel text-5xl md:text-7xl font-bold text-primary-foreground tracking-wider">ΦΟΜΟ</h1>
      <p className="mt-2 text-xs uppercase tracking-[0.35em] text-primary-foreground/80">Cyprus Events</p>
      <div className="mt-8 h-8 w-8 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
    </div>
  );
}

function RootEntryRoute() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    let active = true;

    const resolveEntry = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!active) return;

        if (!session?.user) {
          setIsGuest(true);
          setIsChecking(false);
          return;
        }

        const [profileResult, businessResult] = await Promise.all([
          supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle(),
          supabase.from("businesses").select("id").eq("user_id", session.user.id).maybeSingle(),
        ]);

        if (!active) return;

        const role = profileResult.data?.role;

        if (role === "admin") {
          navigate("/admin/verification", { replace: true });
          return;
        }

        if (businessResult.data || role === "business") {
          navigate("/dashboard-business", { replace: true });
          return;
        }

        navigate("/feed", { replace: true });
      } catch {
        if (active) {
          navigate("/feed", { replace: true });
        }
      }
    };

    void resolveEntry();

    return () => {
      active = false;
    };
  }, [navigate]);

  if (isChecking) return <RouteFallback />;
  if (isGuest) return <PageTransition><Index /></PageTransition>;
  return <RouteFallback />;
}

// Component to conditionally render BottomNav
function AppContent() {
  const location = useLocation();
  const userLayoutRoutes = ['/feed', '/ekdiloseis', '/xartis', '/offers', '/dashboard-user', '/messages'];
  const adminRoutes = ['/admin'];
  const businessRoutes = ['/dashboard-business'];
  const hideBottomNav = location.pathname === '/' ||
                        userLayoutRoutes.some(route => location.pathname.startsWith(route)) || 
                        adminRoutes.some(route => location.pathname.startsWith(route)) ||
                        businessRoutes.some(route => location.pathname.startsWith(route));

  const routesKey = location.pathname.startsWith('/dashboard-business')
    ? '/dashboard-business'
    : location.pathname;

  return (
    <>
      <ScrollToTop />
      <div className={`min-h-screen ${hideBottomNav ? '' : 'pb-16'} md:pb-0`}>
        <AnimatePresence initial={false}>
          <Suspense fallback={<RouteFallback />}>
            <Routes location={location} key={routesKey}>
              <Route path="/" element={<RootEntryRoute />} />
              <Route path="/features" element={<PageTransition><Features /></PageTransition>} />
              <Route path="/pricing" element={<PageTransition><PricingPublic /></PageTransition>} />
              <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
              <Route path="/blog" element={<PageTransition><Blog /></PageTransition>} />
              <Route path="/blog/:slug" element={<PageTransition><BlogPost /></PageTransition>} />
              <Route path="/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
              <Route path="/terms" element={<PageTransition><TermsOfService /></PageTransition>} />
              <Route path="/cookies" element={<PageTransition><CookiesPolicy /></PageTransition>} />
              <Route path="/for-visitors" element={<PageTransition><ForVisitors /></PageTransition>} />
              <Route path="/for-businesses" element={<PageTransition><ForBusinesses /></PageTransition>} />
              <Route path="/feed" element={<PageTransition><UserLayout><Feed showNavbar={false} /></UserLayout></PageTransition>} />
              <Route path="/ekdiloseis" element={<PageTransition><UserLayout><Ekdiloseis /></UserLayout></PageTransition>} />
              <Route path="/xartis" element={<PageTransition><UserLayout><Xartis /></UserLayout></PageTransition>} />
              <Route path="/offers" element={<PageTransition><UserLayout><Offers /></UserLayout></PageTransition>} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-student" element={<VerifyStudent />} />
              <Route path="/signup-business" element={<SignupBusiness />} />
              <Route path="/dashboard-user/*" element={<UserLayout><DashboardUser /></UserLayout>} />
              <Route path="/messages" element={<PageTransition><Messages /></PageTransition>} />
              <Route path="/dashboard-business/*" element={<DashboardBusiness />} />
              <Route path="/subscription-plans" element={<SubscriptionPlans />} />
              <Route path="/ticket-success" element={<PageTransition><TicketSuccess /></PageTransition>} />
              <Route path="/ticket-view/:token" element={<PageTransition><TicketView /></PageTransition>} />
              <Route path="/reservation-view/:token" element={<PageTransition><ReservationView /></PageTransition>} />
              <Route path="/offer-view/:token" element={<PageTransition><OfferView /></PageTransition>} />
              <Route path="/reservation-success" element={<PageTransition><ReservationSuccess /></PageTransition>} />
              <Route path="/offer-purchase-success" element={<PageTransition><OfferPurchaseSuccess /></PageTransition>} />

              {/* Admin Routes - Protected */}
              <Route path="/admin" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="verification" element={<AdminVerification />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="geocoding" element={<AdminGeocoding />} />
                <Route path="database" element={<AdminDatabaseMonitoring />} />
                <Route path="beta" element={<AdminBetaManagement />} />
                <Route path="waitlist" element={<AdminWaitlist />} />
                <Route path="student-verification" element={<AdminStudentVerification />} />
                <Route path="student-partners" element={<AdminStudentPartners />} />
                <Route path="student-subsidies" element={<AdminStudentSubsidies />} />
              </Route>
              <Route path="/admin/forbidden" element={<AdminForbidden />} />

              <Route path="/business/:businessId" element={<BusinessProfile />} />
              <Route path="/event/:eventId" element={<EventDetail />} />
              <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </div>
      {!hideBottomNav && <BottomNav />}
    </>
  );
}

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const connection = (navigator as any)?.connection;
    if (connection?.saveData || /2g/.test(connection?.effectiveType ?? "")) return;

    const warmUpRoutes = () => {
      void import("./pages/Feed");
      void import("./pages/Xartis");
    };

    if ("requestIdleCallback" in window) {
      const idleId = (window as any).requestIdleCallback(warmUpRoutes, { timeout: 1400 });
      return () => {
        if ("cancelIdleCallback" in window) {
          (window as any).cancelIdleCallback(idleId);
        }
      };
    }

    const timeoutId = globalThis.setTimeout(warmUpRoutes, 900);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <TooltipProvider>
              {showSplash && (
                <SplashScreen minDisplayTime={2000} onComplete={handleSplashComplete} />
              )}
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </TooltipProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
