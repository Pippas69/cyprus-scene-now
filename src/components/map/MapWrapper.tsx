import { Suspense, lazy, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const RealMap = lazy(() => import("./RealMap"));

export default function MapWrapper() {
  const [isClient, setIsClient] = useState(false);

  // Prevent SSR errors: only render map on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="h-[60vh] w-full flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="h-[60vh] w-full flex items-center justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      }
    >
      <RealMap />
    </Suspense>
  );
}
