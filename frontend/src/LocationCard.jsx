// Small map preview for a branch or ATM, opening Google Maps on click
function LocationCard({ location }) {
  const { name, latitude, longitude, maps_url: mapsUrl } = location;

  if (latitude == null || longitude == null) return null;

  const url =
    mapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  const embedUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;

  return (
    <div className="location-card">
      <a
        className="location-map"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`فتح موقع ${name || "المكان"} في خرائط Google`}
      >
        <iframe
          title={name || "map"}
          src={embedUrl}
          loading="lazy"
          tabIndex={-1}
          referrerPolicy="no-referrer-when-downgrade"
        />
        <span className="location-map-overlay" />
      </a>

      <a
        className="location-button"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        📍 فتح في خرائط Google
      </a>
    </div>
  );
}

export default LocationCard;
