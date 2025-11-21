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
import { MAPBOX_CONFIG } from "@/config/mapbox";
import { useLanguage } from "@/hooks/useLanguage";
import { businessTranslations, businessCategories, cities } from "./translations";
import { validationTranslations } from "@/translations/validationTranslations";
import { toastTranslations } from "@/translations/toastTranslations";

const createBusinessProfileSchema = (language: 'el' | 'en') => {
  const v = validationTranslations[language];
  
  return z.object({
    name: z.string().min(2, v.nameRequired),
    description: z.string().max(500, v.descriptionTooLong).optional(),
    phone: z.string().regex(/^[0-9\s\-\+\(\)]+$/, v.invalidPhone).optional().or(z.literal('')),
    website: z.string().url(v.invalidUrl).optional().or(z.literal('')),
    address: z.string().optional(),
    city: z.string().min(1, v.cityRequired),
    category: z.array(z.string()).min(1, v.categoryRequired),
  });
};

type FormValues = z.infer<ReturnType<typeof createBusinessProfileSchema>>;

interface BusinessProfileFormProps {
  businessId: string;
}

export default function BusinessProfileForm({ businessId }: BusinessProfileFormProps) {
  const { language } = useLanguage();
  const t = businessTranslations[language];
  const toastT = toastTranslations[language];
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lng: number; lat: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<FormValues>({
    resolver: zodResolver(createBusinessProfileSchema(language)),
    defaultValues: {
      category: [],
    }
  });

  const selectedCategories = watch("category") || [];
  const address = watch("address");
  const city = watch("city");

  useEffect(() => {
    fetchBusinessData();
  }, [businessId]);

  // Auto-geocode when address or city changes
  useEffect(() => {
    const geocodeAddress = async () => {
      if (!address || !city) return;
      
      const fullAddress = `${address}, ${city}, Cyprus`;
      setGeocoding(true);
      
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${MAPBOX_CONFIG.publicToken}&limit=1`
        );
        
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center;
          setCoordinates({ lng, lat });
          toast.success(toastT.coordinatesUpdated);
        }
      } catch (error) {
        // Silent fail - geocoding is auto-complete, not critical
      } finally {
        setGeocoding(false);
      }
    };

    const timeoutId = setTimeout(geocodeAddress, 1000);
    return () => clearTimeout(timeoutId);
  }, [address, city]);

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
      toast.error(toastT.loadFailed);
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

      // If we have coordinates, use the function to update with PostGIS geometry
      if (coordinates) {
        const { error } = await supabase.rpc('update_business_with_geo', {
          p_business_id: businessId,
          p_name: values.name,
          p_description: values.description || null,
          p_phone: values.phone || null,
          p_website: values.website || null,
          p_address: values.address || null,
          p_city: values.city,
          p_category: values.category,
          p_logo_url: logoUrl,
          p_cover_url: coverUrl,
          p_longitude: coordinates.lng,
          p_latitude: coordinates.lat
        });

        if (error) throw error;
      } else {
        // No coordinates, update without geo
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
      }

      toast.success(toastT.businessUpdated);

      // Refresh data
      setCurrentLogoUrl(logoUrl);
      setCurrentCoverUrl(coverUrl);
      setLogoFile(null);
      setCoverFile(null);

    } catch (error) {
      console.error('Update error:', error);
      toast.error(toastT.businessUpdateFailed);
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
          <CardTitle>{t.images}</CardTitle>
          <CardDescription>{t.imagesDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ImageUploadField
            label={t.businessLogo}
            currentImageUrl={currentLogoUrl}
            onFileSelect={setLogoFile}
            aspectRatio="1/1"
            maxSizeMB={2}
            language={language}
          />
          <ImageUploadField
            label={t.businessCover}
            currentImageUrl={currentCoverUrl}
            onFileSelect={setCoverFile}
            aspectRatio="16/9"
            maxSizeMB={5}
            language={language}
          />
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t.basicInfo}</CardTitle>
          <CardDescription>{t.basicInfoDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">{t.businessName} *</Label>
            <Input id="name" {...register("name")} placeholder={t.businessNamePlaceholder} />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="description">{t.description}</Label>
            <Textarea 
              id="description" 
              {...register("description")} 
              placeholder={t.businessDescPlaceholder}
              rows={4}
            />
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <Label htmlFor="city">{t.city} *</Label>
            <select
              id="city"
              {...register("city")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">{t.selectCity}</option>
              {cities[language].map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            {errors.city && <p className="text-sm text-destructive mt-1">{errors.city.message}</p>}
          </div>

          <div>
            <Label>{t.categories} * ({t.selectAtLeastOne})</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {businessCategories[language].map((category) => (
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
          <CardTitle>{t.contactInfo}</CardTitle>
          <CardDescription>{t.basicInfoDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="phone">{t.phone}</Label>
            <Input id="phone" {...register("phone")} placeholder={t.phonePlaceholder} />
            {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <Label htmlFor="website">{t.website}</Label>
            <Input id="website" {...register("website")} placeholder={t.websitePlaceholder} />
            {errors.website && <p className="text-sm text-destructive mt-1">{errors.website.message}</p>}
          </div>

          <div>
            <Label htmlFor="address">{t.address}</Label>
            <Input id="address" {...register("address")} placeholder={t.addressPlaceholder} />
            {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Submit Buttons */}
      <div className="flex gap-4">
        <Button type="button" variant="outline" className="flex-1">
          {t.cancel}
        </Button>
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.loading}
            </>
          ) : (
            t.saveChanges
          )}
        </Button>
      </div>
    </form>
  );
}
