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

const MiningMap = () => {
  const [sites, setSites] = useState([]);
  const [roads, setRoads] = useState([]);
  const [trucks, setTrucks] = useState([]);

  // Mock Data for now - in real implementation, fetch from API
  useEffect(() => {
    setSites([
      { id: 1, name: 'Pit A', lat: -2.5, lng: 115.5, type: 'PIT' },
      { id: 2, name: 'Port B', lat: -2.45, lng: 115.55, type: 'PORT' },
      { id: 3, name: 'Stockpile C', lat: -2.48, lng: 115.52, type: 'STOCKPILE' },
    ]);

    setRoads([
      { id: 1, from: [-2.5, 115.5], to: [-2.48, 115.52], color: 'blue' },
      { id: 2, from: [-2.48, 115.52], to: [-2.45, 115.55], color: 'green' },
    ]);

    setTrucks([
      { id: 'DT-01', lat: -2.49, lng: 115.51, status: 'HAULING' },
      { id: 'DT-02', lat: -2.46, lng: 115.54, status: 'RETURN' },
    ]);
  }, []);

  return (
    <div className="h-96 w-full rounded-lg overflow-hidden shadow-lg border border-gray-700">
      <MapContainer center={[-2.48, 115.52]} zoom={12} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {sites.map((site) => (
          <Marker key={site.id} position={[site.lat, site.lng]}>
            <Popup>
              <div className="text-gray-900 font-bold">{site.name}</div>
              <div className="text-gray-700 text-sm">{site.type}</div>
            </Popup>
          </Marker>
        ))}

        {roads.map((road) => (
          <Polyline key={road.id} positions={[road.from, road.to]} color={road.color} />
        ))}

        {trucks.map((truck) => (
          <Marker
            key={truck.id}
            position={[truck.lat, truck.lng]}
            icon={
              new L.Icon({
                iconUrl: 'https://cdn-icons-png.flaticon.com/512/233/233086.png', // Truck icon
                iconSize: [25, 25],
              })
            }
          >
            <Popup>
              <div className="text-gray-900 font-bold">{truck.id}</div>
              <div className="text-gray-700 text-sm">{truck.status}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MiningMap;
