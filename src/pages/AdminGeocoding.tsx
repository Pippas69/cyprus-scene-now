import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, CheckCircle, XCircle } from "lucide-react";

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

  const handleGeocode = async () => {
    setIsProcessing(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('geocode-existing-businesses');

      if (error) throw error;

      setResults(data as GeocodingResponse);
      
      toast({
        title: "Geocoding Complete",
        description: `Successfully geocoded ${data.successful} out of ${data.total} businesses`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to geocode businesses",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-cinzel font-bold">Geocode Existing Businesses</h1>
          </div>

          <p className="text-muted-foreground mb-6">
            This tool will automatically geocode all existing businesses that have an address and city but no geo coordinates.
            This is needed for their events to appear on the map.
          </p>

          <Button
            onClick={handleGeocode}
            disabled={isProcessing}
            size="lg"
            className="w-full mb-6"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-5 w-5" />
                Start Geocoding
              </>
            )}
          </Button>

          {results && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold">{results.total}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </Card>
                <Card className="p-4 text-center bg-green-50 dark:bg-green-950">
                  <div className="text-2xl font-bold text-green-600">{results.successful}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </Card>
                <Card className="p-4 text-center bg-red-50 dark:bg-red-950">
                  <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </Card>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold mb-3">Details:</h3>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {results.results.map((result, index) => (
                    <Card key={index} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {result.status === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
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
                            <span className="text-orange-600">Could not geocode address</span>
                          )}
                          {result.status === 'failed' && result.error && (
                            <span className="text-red-600">{result.error}</span>
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
