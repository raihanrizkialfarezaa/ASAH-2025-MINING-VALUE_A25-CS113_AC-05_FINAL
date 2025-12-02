import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MiningMap = ({ sites = [], loadingPoints = [], dumpingPoints = [], roads = [], trucks = [] }) => {
  // Helper to safely get coordinates
  const getPosition = (item) => {
    if (item.latitude && item.longitude) {
      return [parseFloat(item.latitude), parseFloat(item.longitude)];
    }
    // Fallback for mock data structure if mixed
    if (item.lat && item.lng) {
      return [item.lat, item.lng];
    }
    return null;
  };

  // Calculate center based on data or default
  const defaultCenter = [-2.48, 115.52];
  const [center, setCenter] = useState(defaultCenter);

  useEffect(() => {
    if (sites.length > 0) {
      const validSite = sites.find((s) => getPosition(s));
      if (validSite) setCenter(getPosition(validSite));
    }
  }, [sites]);

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden shadow-lg border border-gray-200">
      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Mining Sites */}
        {sites.map((site) => {
          const pos = getPosition(site);
          if (!pos) return null;
          return (
            <Marker key={`site-${site.id}`} position={pos}>
              <Popup>
                <div className="font-bold">{site.name}</div>
                <div className="text-sm text-gray-600">{site.siteType || 'Mining Site'}</div>
              </Popup>
            </Marker>
          );
        })}

        {/* Loading Points */}
        {loadingPoints.map((lp) => {
          const pos = getPosition(lp);
          if (!pos) return null;
          return (
            <Marker key={`lp-${lp.id}`} position={pos}>
              <Popup>
                <div className="font-bold">{lp.name}</div>
                <div className="text-sm text-gray-600">Loading Point</div>
                <div className="text-xs">Seam: {lp.coalSeam}</div>
              </Popup>
            </Marker>
          );
        })}

        {/* Dumping Points */}
        {dumpingPoints.map((dp) => {
          const pos = getPosition(dp);
          if (!pos) return null;
          return (
            <Marker key={`dp-${dp.id}`} position={pos}>
              <Popup>
                <div className="font-bold">{dp.name}</div>
                <div className="text-sm text-gray-600">Dumping Point</div>
                <div className="text-xs">Type: {dp.dumpingType}</div>
              </Popup>
            </Marker>
          );
        })}

        {/* Roads */}
        {roads.map((road) => {
          // Assuming road has start/end coordinates or a path
          // If road data structure is complex, we might need more logic here.
          // For now, let's assume it might have 'path' array of coords, or we skip if no geo data.
          if (road.path && Array.isArray(road.path)) {
            return <Polyline key={`road-${road.id}`} positions={road.path} color="blue" />;
          }
          return null;
        })}

        {/* Trucks */}
        {trucks.map((truck) => {
          const pos = getPosition(truck);
          if (!pos) return null;
          return (
            <Marker
              key={`truck-${truck.id}`}
              position={pos}
              icon={
                new L.Icon({
                  iconUrl: 'https://cdn-icons-png.flaticon.com/512/233/233086.png', // Truck icon
                  iconSize: [25, 25],
                })
              }
            >
              <Popup>
                <div className="font-bold">{truck.code}</div>
                <div className="text-sm">{truck.status}</div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MiningMap;
