import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Eye, Search } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { adminTranslations } from "@/translations/adminTranslations";
import { toastTranslations } from "@/translations/toastTranslations";
import { AdminOceanHeader } from "@/components/admin/AdminOceanHeader";

const CITIES = ["Λεμεσός", "Λευκωσία", "Λάρνακα", "Πάφος", "Παραλίμνι", "Αγία Νάπα"];

interface Business {
  id: string;
  name: string;
  category: string[];
  city: string;
  phone: string;
  address: string;
  website: string;
  description: string;
  logo_url: string;
  cover_url: string;
  verified: boolean;
  verified_at: string;
  verification_notes: string;
  user_id: string;
  profiles?: {
    email: string;
  };
}

const AdminVerification = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = adminTranslations[language];
  const toastT = toastTranslations[language];
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    checkAdminAccess();
    fetchBusinesses();
  }, []);

  useEffect(() => {
    filterBusinesses();
  }, [businesses, searchTerm, cityFilter, statusFilter]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error(toastT.mustLogin);
      navigate("/login");
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) {
      toast.error(toastT.adminOnly);
      navigate("/");
    }
  };

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase.from("businesses").select(`
          *,
          profiles:user_id (
            email
          )
        `).order("created_at", { ascending: false });
      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      console.error("Error fetching businesses:", error);
      toast.error(toastT.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  const filterBusinesses = () => {
    let filtered = [...businesses];
    if (searchTerm) {
      filtered = filtered.filter(b => 
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (b.profiles?.email && b.profiles.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (cityFilter !== "all") {
      filtered = filtered.filter(b => b.city === cityFilter);
    }
    if (statusFilter !== "all") {
      if (statusFilter === "pending") {
        filtered = filtered.filter(b => !b.verified && !b.verification_notes);
      } else if (statusFilter === "verified") {
        filtered = filtered.filter(b => b.verified === true);
      } else if (statusFilter === "rejected") {
        filtered = filtered.filter(b => b.verified === false && b.verification_notes);
      }
    }
    setFilteredBusinesses(filtered);
  };

  const handleApprove = async (businessId: string) => {
    try {
      const { error } = await supabase.from("businesses").update({
        verified: true,
        verified_at: new Date().toISOString()
      }).eq("id", businessId);
      if (error) throw error;

      const business = businesses.find(b => b.id === businessId);
      if (business?.profiles?.email) {
        try {
          await supabase.functions.invoke('send-business-notification', {
            body: {
              businessEmail: business.profiles.email,
              businessName: business.name,
              type: 'approval'
            }
          });
        } catch (emailError) {
          console.error('Failed to send approval email:', emailError);
        }
      }
      toast.success(toastT.businessApproved);
      fetchBusinesses();
    } catch (error) {
      console.error("Error approving business:", error);
      toast.error(toastT.businessUpdateFailed);
    }
  };

  const handleReject = async (businessId: string, rejectionNotes: string) => {
    try {
      const { error } = await supabase.from("businesses").update({
        verified: false,
        verification_notes: rejectionNotes
      }).eq("id", businessId);
      if (error) throw error;

      const business = businesses.find(b => b.id === businessId);
      if (business?.profiles?.email) {
        try {
          await supabase.functions.invoke('send-business-notification', {
            body: {
              businessEmail: business.profiles.email,
              businessName: business.name,
              type: 'rejection',
              notes: rejectionNotes
            }
          });
        } catch (emailError) {
          // Silent fail
        }
      }
      toast.success(toastT.businessRejected);
      fetchBusinesses();
      setSelectedBusiness(null);
    } catch (error) {
      toast.error(toastT.businessUpdateFailed);
    }
  };

  const handleUpdateNotes = async (businessId: string, newNotes: string) => {
    try {
      const { error } = await supabase.from("businesses").update({
        verification_notes: newNotes
      }).eq("id", businessId);
      if (error) throw error;
      toast.success(toastT.notesSaved);
      fetchBusinesses();
    } catch (error) {
      toast.error(toastT.updateFailed);
    }
  };

  const getStatusBadge = (business: Business) => {
    if (business.verified) {
      return <Badge className="bg-[hsl(var(--seafoam))] hover:bg-[hsl(var(--seafoam))]/90 text-white">{t.verification.status.approved}</Badge>;
    } else if (business.verification_notes) {
      return <Badge className="bg-destructive hover:bg-destructive/90 text-white">{t.verification.status.rejected}</Badge>;
    } else {
      return <Badge className="bg-[hsl(var(--soft-aegean))] hover:bg-[hsl(var(--soft-aegean))]/90 text-white">{t.verification.status.pending}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground text-xl">{t.common.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminOceanHeader
        title={t.verification.title}
        subtitle={t.verification.subtitle}
      />

      <div className="max-w-7xl mx-auto py-6 px-4">
        {/* Filters */}
        <div className="bg-card rounded-2xl shadow-elegant p-6 mb-6 border-t-2 border-[hsl(var(--seafoam))]">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input 
                placeholder={t.verification.filters.search} 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="pl-10 rounded-xl" 
              />
            </div>
            
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-full md:w-48 rounded-xl">
                <SelectValue placeholder={t.verification.filters.city} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.verification.filters.all}</SelectItem>
                {CITIES.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48 rounded-xl">
                <SelectValue placeholder={t.verification.filters.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.verification.filters.all}</SelectItem>
                <SelectItem value="pending">{t.verification.filters.pending}</SelectItem>
                <SelectItem value="verified">{t.verification.filters.verified}</SelectItem>
                <SelectItem value="rejected">{t.verification.filters.rejected}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-2xl shadow-elegant overflow-hidden">
          <Table>
            <TableHeader className="bg-[hsl(var(--aegean))]/5">
              <TableRow>
                <TableHead>{t.verification.table.business}</TableHead>
                <TableHead>{t.verification.table.category}</TableHead>
                <TableHead>{t.verification.table.city}</TableHead>
                <TableHead>{t.verification.table.email}</TableHead>
                <TableHead>{t.verification.table.phone}</TableHead>
                <TableHead>{t.verification.table.status}</TableHead>
                <TableHead>{t.verification.table.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBusinesses.map(business => (
                <TableRow key={business.id}>
                  <TableCell className="font-semibold">{business.name}</TableCell>
                  <TableCell>{business.category?.join(", ")}</TableCell>
                  <TableCell>{business.city}</TableCell>
                  <TableCell>{business.profiles?.email || t.common.na}</TableCell>
                  <TableCell>{business.phone}</TableCell>
                  <TableCell>{getStatusBadge(business)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {!business.verified && !business.verification_notes && (
                        <Button 
                          size="sm" 
                          onClick={() => handleApprove(business.id)} 
                          className="bg-[hsl(var(--seafoam))] hover:bg-[hsl(var(--seafoam))]/90"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-[hsl(var(--ocean))] text-[hsl(var(--ocean))]"
                            onClick={() => {
                              setSelectedBusiness(business);
                              setNotes(business.verification_notes || "");
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{business.name}</DialogTitle>
                            <DialogDescription>
                              {t.verification.preview.details}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            {business.cover_url && (
                              <div>
                                <p className="font-semibold mb-2">{t.verification.preview.coverImage}:</p>
                                <div className="relative h-48 rounded-lg overflow-hidden border">
                                  <img 
                                    src={business.cover_url} 
                                    alt={`${business.name} cover`} 
                                    className="w-full h-full object-cover" 
                                  />
                                </div>
                              </div>
                            )}
                            
                            {business.logo_url && (
                              <div>
                                <p className="font-semibold mb-2">{t.verification.preview.logo}:</p>
                                <img src={business.logo_url} alt={business.name} className="w-32 h-32 object-contain rounded-lg border p-2" />
                              </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="font-semibold">{t.verification.preview.categories}:</p>
                                <p>{business.category?.join(", ")}</p>
                              </div>
                              <div>
                                <p className="font-semibold">{t.verification.filters.city}:</p>
                                <p>{business.city}</p>
                              </div>
                              <div>
                                <p className="font-semibold">{t.verification.table.email}:</p>
                                <p>{business.profiles?.email || t.common.na}</p>
                              </div>
                              <div>
                                <p className="font-semibold">{t.verification.table.phone}:</p>
                                <p>{business.phone}</p>
                              </div>
                            </div>

                            {business.address && (
                              <div>
                                <p className="font-semibold">{t.verification.preview.address}:</p>
                                <p>{business.address}</p>
                              </div>
                            )}

                            {business.website && (
                              <div>
                                <p className="font-semibold">{t.verification.preview.website}:</p>
                                <p>{business.website}</p>
                              </div>
                            )}

                            {business.description && (
                              <div>
                                <p className="font-semibold">{t.verification.preview.description}:</p>
                                <p>{business.description}</p>
                              </div>
                            )}

                            <div>
                              <p className="font-semibold mb-2">{t.verification.preview.notes}:</p>
                              <Textarea 
                                value={notes} 
                                onChange={e => setNotes(e.target.value)} 
                                placeholder={t.verification.preview.notesPlaceholder} 
                                rows={4} 
                              />
                              <Button 
                                onClick={() => handleUpdateNotes(business.id, notes)} 
                                className="mt-2 bg-[hsl(var(--ocean))] hover:bg-[hsl(var(--ocean))]/90" 
                                size="sm"
                              >
                                {t.verification.actions.saveNotes}
                              </Button>
                            </div>

                            <div className="flex gap-2 pt-4">
                              {!business.verified && (
                                <>
                                  <Button 
                                    onClick={() => {
                                      handleApprove(business.id);
                                      setSelectedBusiness(null);
                                    }} 
                                    className="bg-[hsl(var(--seafoam))] hover:bg-[hsl(var(--seafoam))]/90"
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    {t.verification.actions.approve}
                                  </Button>
                                  <Button 
                                    onClick={() => handleReject(business.id, notes)} 
                                    variant="destructive"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    {t.verification.actions.reject}
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredBusinesses.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {t.verification.noResults}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminVerification;
