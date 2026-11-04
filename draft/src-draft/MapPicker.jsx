import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useState } from "react";

function LocationMarker({ onLocationSelect }) {
  const [position, setPosition] = useState(null);

  useMapEvents({
    click(e) {
      const newPosition = {
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      };

      setPosition(e.latlng);
      onLocationSelect(newPosition);
    },
  });

  return position === null ? null : <Marker position={position} />;
}

function MapPicker({ onLocationSelect }) {
  return (
    <div style={{ height: "400px", width: "100%" }}>
      <MapContainer
        center={[24.4539, 54.3773]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <LocationMarker onLocationSelect={onLocationSelect} />
      </MapContainer>
    </div>
  );
}

export default MapPicker;