import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function MapWrapper() {
  const [Map, setMap] = useState<any>(null);

  useEffect(() => {
    // Only import on client side
    if (typeof window !== 'undefined') {
      import('./RealMap').then((module) => {
        setMap(() => module.default);
      });
    }
  }, []);

  if (!Map) {
    return (
      <div className="h-[70vh] w-full flex items-center justify-center bg-muted/30 rounded-2xl">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return <Map />;
}
