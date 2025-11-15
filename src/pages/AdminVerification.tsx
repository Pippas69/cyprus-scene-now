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
import { CheckCircle, XCircle, Eye, Filter, Search } from "lucide-react";
const CITIES = ["Όλες", "Λευκωσία", "Λεμεσός", "Λάρνακα", "Πάφος", "Παραλίμνι", "Αγία Νάπα"];
const STATUSES = ["Όλες", "Εκκρεμεί", "Εγκρίθηκε", "Απορρίφθηκε"];
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
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("Όλες");
  const [statusFilter, setStatusFilter] = useState("Όλες");
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
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Παρακαλώ συνδεθείτε");
      navigate("/login");
      return;
    }
    const {
      data: profile
    } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) {
      toast.error("Μόνο οι διαχειριστές μπορούν να έχουν πρόσβαση σε αυτή τη σελίδα.");
      navigate("/");
    }
  };
  const fetchBusinesses = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("businesses").select(`
          *,
          profiles:user_id (
            email
          )
        `).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      console.error("Error fetching businesses:", error);
      toast.error("Σφάλμα φόρτωσης επιχειρήσεων");
    } finally {
      setLoading(false);
    }
  };
  const filterBusinesses = () => {
    let filtered = [...businesses];
    if (searchTerm) {
      filtered = filtered.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()) || b.profiles?.email && b.profiles.email.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (cityFilter !== "Όλες") {
      filtered = filtered.filter(b => b.city === cityFilter);
    }
    if (statusFilter !== "Όλες") {
      if (statusFilter === "Εκκρεμεί") {
        filtered = filtered.filter(b => !b.verified);
      } else if (statusFilter === "Εγκρίθηκε") {
        filtered = filtered.filter(b => b.verified === true);
      } else if (statusFilter === "Απορρίφθηκε") {
        filtered = filtered.filter(b => b.verified === false && b.verification_notes);
      }
    }
    setFilteredBusinesses(filtered);
  };
  const handleApprove = async (businessId: string) => {
    try {
      const {
        error
      } = await supabase.from("businesses").update({
        verified: true,
        verified_at: new Date().toISOString()
      }).eq("id", businessId);
      if (error) throw error;

      // Send approval email
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
          // Don't fail the approval if email fails
        }
      }
      toast.success("Η επιχείρηση εγκρίθηκε!");
      fetchBusinesses();
    } catch (error) {
      console.error("Error approving business:", error);
      toast.error("Σφάλμα έγκρισης επιχείρησης");
    }
  };
  const handleReject = async (businessId: string, rejectionNotes: string) => {
    try {
      const {
        error
      } = await supabase.from("businesses").update({
        verified: false,
        verification_notes: rejectionNotes
      }).eq("id", businessId);
      if (error) throw error;

      // Send rejection email
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
          console.error('Failed to send rejection email:', emailError);
          // Don't fail the rejection if email fails
        }
      }
      toast.success("Η επιχείρηση απορρίφθηκε");
      fetchBusinesses();
      setSelectedBusiness(null);
    } catch (error) {
      console.error("Error rejecting business:", error);
      toast.error("Σφάλμα απόρριψης επιχείρησης");
    }
  };
  const handleUpdateNotes = async (businessId: string, newNotes: string) => {
    try {
      const {
        error
      } = await supabase.from("businesses").update({
        verification_notes: newNotes
      }).eq("id", businessId);
      if (error) throw error;
      toast.success("Οι σημειώσεις ενημερώθηκαν");
      fetchBusinesses();
    } catch (error) {
      console.error("Error updating notes:", error);
      toast.error("Σφάλμα ενημέρωσης σημειώσεων");
    }
  };
  const getStatusBadge = (business: Business) => {
    if (business.verified) {
      return <Badge className="bg-green-500">Εγκρίθηκε</Badge>;
    } else if (business.verification_notes) {
      return <Badge className="bg-red-500">Απορρίφθηκε</Badge>;
    } else {
      return <Badge className="bg-yellow-500">Εκκρεμεί</Badge>;
    }
  };
  if (loading) {
    return <div className="min-h-screen gradient-hero flex items-center justify-center">
        <p className="text-white text-xl">Φόρτωση...</p>
      </div>;
  }
  return <div className="min-h-screen bg-sand-light">
      <div className="bg-midnight text-white py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-cinzel text-4xl font-bold mb-2 text-[#000048]">
            Πίνακας Επαλήθευσης Επιχειρήσεων ΦΟΜΟ
          </h1>
          <p className="font-inter text-seafoam">
            Ελέγξτε, εγκρίνετε ή απορρίψτε τις νέες εγγραφές επιχειρήσεων.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="bg-white rounded-2xl shadow-elegant p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input placeholder="Αναζήτηση επιχείρησης ή email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 rounded-xl" />
            </div>
            
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-full md:w-48 rounded-xl">
                <SelectValue placeholder="Πόλη" />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48 rounded-xl">
                <SelectValue placeholder="Κατάσταση" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-elegant overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Επιχείρηση</TableHead>
                <TableHead>Κατηγορία</TableHead>
                <TableHead>Πόλη</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Τηλέφωνο</TableHead>
                <TableHead>Κατάσταση</TableHead>
                <TableHead>Ενέργειες</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBusinesses.map(business => <TableRow key={business.id}>
                  <TableCell className="font-semibold">{business.name}</TableCell>
                  <TableCell>{business.category?.join(", ")}</TableCell>
                  <TableCell>{business.city}</TableCell>
                  <TableCell>{business.profiles?.email || "N/A"}</TableCell>
                  <TableCell>{business.phone}</TableCell>
                  <TableCell>{getStatusBadge(business)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {!business.verified && !business.verification_notes && <Button size="sm" onClick={() => handleApprove(business.id)} className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="h-4 w-4" />
                        </Button>}
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => {
                        setSelectedBusiness(business);
                        setNotes(business.verification_notes || "");
                      }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{business.name}</DialogTitle>
                            <DialogDescription>
                              Πλήρη στοιχεία επιχείρησης
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            {business.cover_url && (
                              <div>
                                <p className="font-semibold mb-2">Εικόνα Εξωφύλλου:</p>
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
                                <p className="font-semibold mb-2">Λογότυπο:</p>
                                <img src={business.logo_url} alt={business.name} className="w-32 h-32 object-contain rounded-lg border p-2" />
                              </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="font-semibold">Κατηγορία:</p>
                                <p>{business.category?.join(", ")}</p>
                              </div>
                              <div>
                                <p className="font-semibold">Πόλη:</p>
                                <p>{business.city}</p>
                              </div>
                              <div>
                                <p className="font-semibold">Email:</p>
                                <p>{business.profiles?.email || "N/A"}</p>
                              </div>
                              <div>
                                <p className="font-semibold">Τηλέφωνο:</p>
                                <p>{business.phone}</p>
                              </div>
                            </div>

                            {business.address && <div>
                                <p className="font-semibold">Διεύθυνση:</p>
                                <p>{business.address}</p>
                              </div>}

                            {business.website && <div>
                                <p className="font-semibold">Ιστοσελίδα:</p>
                                <p>{business.website}</p>
                              </div>}

                            {business.description && <div>
                                <p className="font-semibold">Περιγραφή:</p>
                                <p>{business.description}</p>
                              </div>}

                            <div>
                              <p className="font-semibold mb-2">Σημειώσεις Διαχειριστή:</p>
                              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Προσθέστε σημειώσεις..." rows={4} />
                              <Button onClick={() => {
                            handleUpdateNotes(business.id, notes);
                          }} className="mt-2" size="sm">
                                Αποθήκευση Σημειώσεων
                              </Button>
                            </div>

                            <div className="flex gap-2 pt-4">
                              {!business.verified && <>
                                  <Button onClick={() => {
                              handleApprove(business.id);
                              setSelectedBusiness(null);
                            }} className="bg-green-600 hover:bg-green-700">
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Έγκριση
                                  </Button>
                                  <Button onClick={() => handleReject(business.id, notes)} variant="destructive">
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Απόρριψη
                                  </Button>
                                </>}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>

          {filteredBusinesses.length === 0 && <div className="text-center py-12 text-gray-500">
              Δεν βρέθηκαν επιχειρήσεις
            </div>}
        </div>
      </div>
    </div>;
};
export default AdminVerification;