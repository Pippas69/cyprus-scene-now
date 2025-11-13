"use client";

import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function RealMap() {
  return (
    <MapContainer
      center={[35.1264, 33.4299]}
      zoom={9}
      scrollWheelZoom={true}
      className="rounded-2xl shadow-lg"
      style={{ height: "70vh", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  );
}
