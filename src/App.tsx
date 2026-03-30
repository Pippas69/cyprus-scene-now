// App entry point
import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import BottomNav from "@/components/BottomNav";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AnimatePresence } from "framer-motion";
// Inline splash is now in index.html for instant display
import { PageTransition } from "@/components/ui/page-transition";
import { UserLayout } from "@/components/layouts/UserLayout";
import ProtectedAdminRoute from "@/components/admin/ProtectedAdminRoute";
import AdminLayout from "@/components/layouts/AdminLayout";

// Core user navigation pages loaded eagerly to avoid sidebar/layout remount flicker
import Index from "./pages/Index";
import Feed from "./pages/Feed";
import Ekdiloseis from "./pages/Ekdiloseis";
import Xartis from "./pages/Xartis";
import Offers from "./pages/Offers";

// Auth pages loaded eagerly to avoid layout flicker from landing page
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import SignupBusiness from "./pages/SignupBusiness";

// Secondary pages lazy-loaded for reduced initial bundle
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
const AdminBusinesses = lazy(() => import("./pages/AdminBusinesses"));
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
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const CookiesPolicy = lazy(() => import("./pages/CookiesPolicy"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const ForVisitors = lazy(() => import("./pages/ForVisitors"));
const ForBusinesses = lazy(() => import("./pages/ForBusinesses"));
const VerifyStudent = lazy(() => import("./pages/VerifyStudent"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes default
      gcTime: 1000 * 60 * 10, // Keep in cache 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Component to conditionally render BottomNav
function AppContent() {
  const location = useLocation();
  const userLayoutRoutes = ['/feed', '/ekdiloseis', '/xartis', '/offers', '/dashboard-user', '/messages'];
  const adminRoutes = ['/admin'];
  const businessRoutes = ['/dashboard-business'];
  const isUserLayoutRoute = userLayoutRoutes.some(route => location.pathname.startsWith(route));
  const hideBottomNav = location.pathname === '/' ||
                        isUserLayoutRoute || 
                        adminRoutes.some(route => location.pathname.startsWith(route)) ||
                        businessRoutes.some(route => location.pathname.startsWith(route));

  const routesKey = location.pathname.startsWith('/dashboard-business')
    ? '/dashboard-business'
    : isUserLayoutRoute
      ? '/user-layout'
      : location.pathname;

  return (
    <>
      <ScrollToTop />
      <div className={`min-h-screen ${hideBottomNav ? '' : 'pb-16'} md:pb-0`}>
        <Suspense fallback={null}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={routesKey}>
          <Route path="/" element={<PageTransition><Index /></PageTransition>} />
          <Route path="/features" element={<PageTransition><Features /></PageTransition>} />
          <Route path="/pricing" element={<PageTransition><PricingPublic /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
          <Route path="/blog" element={<PageTransition><Blog /></PageTransition>} />
          <Route path="/blog/:slug" element={<PageTransition><BlogPost /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><TermsOfService /></PageTransition>} />
          <Route path="/cookies" element={<PageTransition><CookiesPolicy /></PageTransition>} />
          <Route path="/unsubscribe" element={<PageTransition><Unsubscribe /></PageTransition>} />
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
        </AnimatePresence>
        </Suspense>
      </div>
      {!hideBottomNav && <BottomNav />}
    </>
  );
}

// PageTransition is now imported from @/components/ui/page-transition

const App = () => {
  // Keep splash visible long enough and remove only after page load to avoid white flash
  useEffect(() => {
    const splash = document.getElementById('inline-splash');
    if (!splash) return;

    const MIN_SPLASH_MS = 2800;
    const splashStart = (window as { __fomoSplashStart?: number }).__fomoSplashStart ?? performance.now();
    let timer: number | undefined;

    const removeSplash = () => {
      splash.classList.add('fade-out');
      window.setTimeout(() => splash.remove(), 400);
    };

    const scheduleRemoval = () => {
      const elapsed = performance.now() - splashStart;
      const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
      timer = window.setTimeout(removeSplash, remaining);
    };

    if (document.readyState === 'complete') {
      scheduleRemoval();
    } else {
      window.addEventListener('load', scheduleRemoval, { once: true });
    }

    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('load', scheduleRemoval);
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <TooltipProvider>
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
