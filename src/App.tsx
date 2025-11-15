import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import AdminVerification from "./pages/AdminVerification";
import AdminGeocoding from "./pages/AdminGeocoding";
import BusinessProfile from "./pages/BusinessProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/ekdiloseis" element={<Ekdiloseis />} />
          <Route path="/xartis" element={<Xartis />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/signup-business" element={<SignupBusiness />} />
          <Route path="/dashboard" element={<DashboardUser />} />
          <Route path="/dashboard-business" element={<DashboardBusiness />} />
          <Route path="/admin/verification" element={<AdminVerification />} />
          <Route path="/admin/geocoding" element={<AdminGeocoding />} />
          <Route path="/business/:businessId" element={<BusinessProfile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
