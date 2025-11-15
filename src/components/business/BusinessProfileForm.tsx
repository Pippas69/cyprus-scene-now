import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUploadField } from "./ImageUploadField";
import { Loader2 } from "lucide-react";

const categories = [
  "Καφετέριες & Εστιατόρια",
  "Νυχτερινή Διασκέδαση",
  "Τέχνη & Πολιτισμός",
  "Fitness & Wellness",
  "Οικογένεια & Κοινότητα",
  "Επιχειρηματικότητα & Networking",
  "Εξωτερικές Δραστηριότητες",
  "Αγορές & Lifestyle"
];

const cities = ["Λευκωσία", "Λεμεσός", "Λάρνακα", "Πάφος", "Παραλίμνι", "Αγία Νάπα"];

const businessProfileSchema = z.object({
  name: z.string().min(2, "Το όνομα πρέπει να έχει τουλάχιστον 2 χαρακτήρες"),
  description: z.string().max(500, "Η περιγραφή δεν μπορεί να υπερβαίνει τους 500 χαρακτήρες").optional(),
  phone: z.string().regex(/^[0-9\s\-\+\(\)]+$/, "Μη έγκυρος αριθμός τηλεφώνου").optional().or(z.literal('')),
  website: z.string().url("Μη έγκυρο URL").optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().min(1, "Επιλέξτε πόλη"),
  category: z.array(z.string()).min(1, "Επιλέξτε τουλάχιστον μία κατηγορία"),
});

type FormValues = z.infer<typeof businessProfileSchema>;

interface BusinessProfileFormProps {
  businessId: string;
}

export default function BusinessProfileForm({ businessId }: BusinessProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<FormValues>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      category: [],
    }
  });

  const selectedCategories = watch("category") || [];

  useEffect(() => {
    fetchBusinessData();
  }, [businessId]);

  const fetchBusinessData = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error) throw error;

      if (data) {
        reset({
          name: data.name,
          description: data.description || '',
          phone: data.phone || '',
          website: data.website || '',
          address: data.address || '',
          city: data.city,
          category: data.category || [],
        });
        setCurrentLogoUrl(data.logo_url);
        setCurrentCoverUrl(data.cover_url);
      }
    } catch (error) {
      console.error('Error fetching business:', error);
      toast.error("Αποτυχία φόρτωσης δεδομένων");
    } finally {
      setInitialLoading(false);
    }
  };

  const handleLogoUpload = async (file: File): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${user.id}-logo-${Date.now()}.${fileExt}`;

    // Delete old logo if exists
    if (currentLogoUrl) {
      const oldPath = currentLogoUrl.split('/').slice(-2).join('/');
      await supabase.storage.from('business-logos').remove([oldPath]);
    }

    const { error: uploadError } = await supabase.storage
      .from('business-logos')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('business-logos')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleCoverUpload = async (file: File): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${user.id}-cover-${Date.now()}.${fileExt}`;

    // Delete old cover if exists
    if (currentCoverUrl) {
      const oldPath = currentCoverUrl.split('/').slice(-2).join('/');
      await supabase.storage.from('business-covers').remove([oldPath]);
    }

    const { error: uploadError } = await supabase.storage
      .from('business-covers')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('business-covers')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);

    try {
      let logoUrl = currentLogoUrl;
      let coverUrl = currentCoverUrl;

      // Upload logo if changed
      if (logoFile) {
        logoUrl = await handleLogoUpload(logoFile);
      }

      // Upload cover if changed
      if (coverFile) {
        coverUrl = await handleCoverUpload(coverFile);
      }

      // Update database
      const { error } = await supabase
        .from('businesses')
        .update({
          name: values.name,
          description: values.description || null,
          phone: values.phone || null,
          website: values.website || null,
          address: values.address || null,
          city: values.city,
          category: values.category,
          logo_url: logoUrl,
          cover_url: coverUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (error) throw error;

      toast.success("Το προφίλ ενημερώθηκε επιτυχώς!");

      // Refresh data
      setCurrentLogoUrl(logoUrl);
      setCurrentCoverUrl(coverUrl);
      setLogoFile(null);
      setCoverFile(null);

    } catch (error) {
      console.error('Update error:', error);
      toast.error("Αποτυχία ενημέρωσης προφίλ");
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category: string, checked: boolean) => {
    const current = selectedCategories;
    if (checked) {
      setValue("category", [...current, category]);
    } else {
      setValue("category", current.filter(c => c !== category));
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Images Section */}
      <Card>
        <CardHeader>
          <CardTitle>Εικόνες</CardTitle>
          <CardDescription>Ενημερώστε το λογότυπο και την εικόνα εξωφύλλου της επιχείρησής σας</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ImageUploadField
            label="Λογότυπο"
            currentImageUrl={currentLogoUrl}
            onFileSelect={setLogoFile}
            aspectRatio="1/1"
            maxSizeMB={2}
          />
          <ImageUploadField
            label="Εικόνα Εξωφύλλου"
            currentImageUrl={currentCoverUrl}
            onFileSelect={setCoverFile}
            aspectRatio="16/9"
            maxSizeMB={5}
          />
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Βασικές Πληροφορίες</CardTitle>
          <CardDescription>Ενημερώστε τα βασικά στοιχεία της επιχείρησής σας</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Όνομα Επιχείρησης *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="description">Περιγραφή</Label>
            <Textarea 
              id="description" 
              {...register("description")} 
              placeholder="Περιγράψτε την επιχείρησή σας..."
              rows={4}
            />
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <Label htmlFor="city">Πόλη *</Label>
            <select
              id="city"
              {...register("city")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Επιλέξτε πόλη</option>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            {errors.city && <p className="text-sm text-destructive mt-1">{errors.city.message}</p>}
          </div>

          <div>
            <Label>Κατηγορίες *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {categories.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={category}
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                  />
                  <Label htmlFor={category} className="text-sm font-normal cursor-pointer">
                    {category}
                  </Label>
                </div>
              ))}
            </div>
            {errors.category && <p className="text-sm text-destructive mt-1">{errors.category.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Στοιχεία Επικοινωνίας</CardTitle>
          <CardDescription>Ενημερώστε τα στοιχεία επικοινωνίας σας</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="phone">Τηλέφωνο</Label>
            <Input id="phone" {...register("phone")} placeholder="+357 99 123456" />
            {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <Label htmlFor="website">Ιστοσελίδα</Label>
            <Input id="website" {...register("website")} placeholder="https://example.com" />
            {errors.website && <p className="text-sm text-destructive mt-1">{errors.website.message}</p>}
          </div>

          <div>
            <Label htmlFor="address">Διεύθυνση</Label>
            <Input id="address" {...register("address")} placeholder="Οδός, Αριθμός" />
            {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => fetchBusinessData()}>
          Ακύρωση
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Αποθήκευση...
            </>
          ) : (
            "Αποθήκευση Αλλαγών"
          )}
        </Button>
      </div>
    </form>
  );
}
