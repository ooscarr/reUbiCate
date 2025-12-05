import React, { useCallback, useEffect, useState } from "react";

import { Button } from "@/app/components/ui/button"; // Assuming you want to use the app's button
import { recyclingFilter } from "@/app/components/features/filters/pills/placeFilters";
import { useSidebar } from "@/app/context/sidebarCtx";
import CameraSearch from "../../search/CameraSearch"; // Importing the camera component

// Define your static buttons here
const RECYCLING_TYPES = [
  { label: "Papel (PAP)", code: "PAP" },
  { label: "Plástico (PET)", code: "PET" },
  { label: "Polietileno (HDPE)", code: "HDPE" },
  { label: "Aluminio (ALU)", code: "ALU" },
  // Add others as needed: VIDRIO, LATA, etc.
];

export default function RecyclingFilter() {
  const [placesGeoJson, setPlacesGeoJson] = useState<{ type: string; features: any[] } | null>(null);
  const { setPlaces } = useSidebar();
  const [activeCode, setActiveCode] = useState<string | null>(null);

  // Load data independently (same pattern as PillFilter)
  useEffect(() => {
    const loadGeoJson = async () => {
      const { default: data } = await import("@/lib/places/data");
      setPlacesGeoJson(data);
    };
    loadGeoJson();
  }, []);

  const handleFilter = useCallback(
    (code: string) => {
      if (!placesGeoJson) return;

      // Toggle off if clicking the same button
      if (activeCode === code) {
        setActiveCode(null);
        setPlaces([]); // Or reset to default view if needed
        return;
      }

      const results = recyclingFilter(placesGeoJson, code);
      setPlaces(results);
      setActiveCode(code);
    },
    [placesGeoJson, setPlaces, activeCode]
  );

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {RECYCLING_TYPES.map((type) => (
        <Button
          key={type.code}
          variant={activeCode === type.code ? "default" : "outline"} // Visual feedback for active state
          size="sm"
          onClick={() => handleFilter(type.code)}
          className="text-xs px-3 h-8"
        >
          {type.label}
        </Button>
      ))}
      <CameraSearch />
    </div>
  );
}