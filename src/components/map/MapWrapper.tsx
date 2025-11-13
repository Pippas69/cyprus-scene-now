"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// Correct path — same folder
const RealMap = lazy(() => import("./RealMap"));

export default function MapWrapper() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="h-[70vh] w-full flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="h-[70vh] w-full flex items-center justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      }
    >
      <RealMap />
    </Suspense>
  );
}
