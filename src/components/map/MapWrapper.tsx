"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const MapComponent = dynamic(() => import("./RealMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[60vh] w-full flex items-center justify-center">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
    </div>
  ),
});

export default MapComponent;
