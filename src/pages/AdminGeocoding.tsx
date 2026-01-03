import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, CheckCircle, XCircle } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { adminTranslations } from "@/translations/adminTranslations";
import { AdminOceanHeader } from "@/components/admin/AdminOceanHeader";

interface GeocodingResult {
  business: string;
  status: string;
  coordinates?: { lng: number; lat: number };
  error?: string;
}

interface GeocodingResponse {
  total: number;
  successful: number;
  failed: number;
  results: GeocodingResult[];
}

const AdminGeocoding = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<GeocodingResponse | null>(null);
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = adminTranslations[language];

  const handleGeocode = async () => {
    setIsProcessing(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('geocode-existing-businesses');

      if (error) throw error;

      setResults(data as GeocodingResponse);
      
      toast({
        title: t.common.success,
        description: language === 'el' 
          ? `Επιτυχής γεωκωδικοποίηση ${data.successful} από ${data.total} επιχειρήσεις`
          : `Successfully geocoded ${data.successful} out of ${data.total} businesses`,
      });
    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.message || t.geocoding.failed,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminOceanHeader
        title={t.geocoding.title}
        subtitle={t.geocoding.subtitle}
      />

      <div className="max-w-4xl mx-auto px-4 pb-8">
        <Card className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-[hsl(var(--seafoam))]/10">
              <MapPin className="h-8 w-8 text-[hsl(var(--seafoam))]" />
            </div>
            <h2 className="text-xl font-semibold">{t.geocoding.batchProcess}</h2>
          </div>

          <p className="text-muted-foreground mb-6">
            {t.geocoding.description}
          </p>

          <Button
            onClick={handleGeocode}
            disabled={isProcessing}
            size="lg"
            className="w-full mb-6 bg-[hsl(var(--ocean))] hover:bg-[hsl(var(--ocean))]/90"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t.geocoding.processing}
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-5 w-5" />
                {t.geocoding.startButton}
              </>
            )}
          </Button>

          {results && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card className="p-4 text-center border-t-2 border-[hsl(var(--aegean))]">
                  <div className="text-2xl font-bold text-[hsl(var(--aegean))]">{results.total}</div>
                  <div className="text-sm text-muted-foreground">{t.geocoding.total}</div>
                </Card>
                <Card className="p-4 text-center border-t-2 border-[hsl(var(--seafoam))]">
                  <div className="text-2xl font-bold text-[hsl(var(--seafoam))]">{results.successful}</div>
                  <div className="text-sm text-muted-foreground">{t.geocoding.successful}</div>
                </Card>
                <Card className="p-4 text-center border-t-2 border-destructive">
                  <div className="text-2xl font-bold text-destructive">{results.failed}</div>
                  <div className="text-sm text-muted-foreground">{t.geocoding.failed}</div>
                </Card>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold mb-3">{t.geocoding.details}:</h3>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {results.results.map((result, index) => (
                    <Card key={index} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {result.status === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-[hsl(var(--seafoam))]" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )}
                          <span className="font-medium">{result.business}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {result.status === 'success' && result.coordinates && (
                            <span>
                              {result.coordinates.lat.toFixed(6)}, {result.coordinates.lng.toFixed(6)}
                            </span>
                          )}
                          {result.status === 'geocoding_failed' && (
                            <span className="text-orange-600">{t.geocoding.couldNotGeocode}</span>
                          )}
                          {result.status === 'failed' && result.error && (
                            <span className="text-destructive">{result.error}</span>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminGeocoding;
