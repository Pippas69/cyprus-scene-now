import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import BottomNav from "@/components/BottomNav";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AnimatePresence, motion } from "framer-motion";
import { SplashScreen } from "@/components/ui/splash-screen";
import { UserLayout } from "@/components/layouts/UserLayout";
import ProtectedAdminRoute from "@/components/admin/ProtectedAdminRoute";
import AdminLayout from "@/components/layouts/AdminLayout";
import Index from "./pages/Index";
import Feed from "./pages/Feed";
import Ekdiloseis from "./pages/Ekdiloseis";
import Xartis from "./pages/Xartis";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import SignupBusiness from "./pages/SignupBusiness";
import DashboardBusiness from "./pages/DashboardBusiness";
import DashboardUser from "./pages/DashboardUser";
import AdminDashboard from "./pages/AdminDashboard";
import AdminVerification from "./pages/AdminVerification";
import AdminGeocoding from "./pages/AdminGeocoding";
import AdminUsers from "./pages/AdminUsers";
import AdminReports from "./pages/AdminReports";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminSettings from "./pages/AdminSettings";
import AdminDatabaseMonitoring from "./pages/AdminDatabaseMonitoring";
import AdminForbidden from "./pages/AdminForbidden";
import BusinessProfile from "./pages/BusinessProfile";
import EventDetail from "./pages/EventDetail";
import SubscriptionPlans from "./pages/SubscriptionPlans";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to conditionally render BottomNav
function AppContent() {
  const location = useLocation();
  const userLayoutRoutes = ['/feed', '/ekdiloseis', '/xartis', '/dashboard-user'];
  const adminRoutes = ['/admin'];
  const hideBottomNav = userLayoutRoutes.some(route => location.pathname.startsWith(route)) || 
                        adminRoutes.some(route => location.pathname.startsWith(route));

  return (
    <>
      <div className="min-h-screen pb-16 md:pb-0">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Index /></PageTransition>} />
          <Route path="/feed" element={<PageTransition><UserLayout><Feed /></UserLayout></PageTransition>} />
          <Route path="/ekdiloseis" element={<PageTransition><UserLayout><Ekdiloseis /></UserLayout></PageTransition>} />
          <Route path="/xartis" element={<PageTransition><UserLayout><Xartis /></UserLayout></PageTransition>} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/signup-business" element={<SignupBusiness />} />
          <Route path="/dashboard-user/*" element={<UserLayout><DashboardUser /></UserLayout>} />
          <Route path="/dashboard-business/*" element={<DashboardBusiness />} />
          <Route path="/subscription-plans" element={<SubscriptionPlans />} />
          
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
          </Route>
          <Route path="/admin/forbidden" element={<AdminForbidden />} />
          
          <Route path="/business/:businessId" element={<BusinessProfile />} />
          <Route path="/event/:eventId" element={<EventDetail />} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
        </AnimatePresence>
      </div>
      {!hideBottomNav && <BottomNav />}
    </>
  );
}

// Page transition wrapper component
const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <TooltipProvider>
              {showSplash && (
                <SplashScreen onComplete={() => setShowSplash(false)} />
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
