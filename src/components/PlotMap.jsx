/** Karte (Leaflet + OpenStreetMap) mit Fläche, Punkten und optionalem Tippen-zum-Setzen. */
import { MapContainer, TileLayer, Polygon, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

function ClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick && onClick({ lat: e.latlng.lat, lng: e.latlng.lng, accuracy: null }) });
  return null;
}
function FitTo({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [24, 24], maxZoom: 18, animate: false });
    else if (points.length === 1) map.setView([points[0].lat, points[0].lng], 17, { animate: false });
  }, [points.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function PlotMap({ polygon = [], markers = [], onClick, center = { lat: 49.3, lng: 8.64 }, height = 300 }) {
  const fit = polygon.length ? polygon : markers;
  return (
    <div className="map" style={{ height }}>
      <MapContainer center={[center.lat, center.lng]} zoom={15} style={{ height: '100%' }} scrollWheelZoom={false}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        {polygon.length >= 2 && <Polygon positions={polygon.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#2f7d4a', weight: 2 }} />}
        {polygon.map((p, i) => <CircleMarker key={`v${i}`} center={[p.lat, p.lng]} radius={5} pathOptions={{ color: '#2f7d4a' }} />)}
        {markers.map((m, i) => <CircleMarker key={`m${i}`} center={[m.lat, m.lng]} radius={6} pathOptions={{ color: '#b45309', fillOpacity: 0.7 }} />)}
        <ClickHandler onClick={onClick} />
        {/* Beim Zeichnen nicht neu einpassen – sonst springen die Klickpositionen */}
        {!onClick && <FitTo points={fit} />}
      </MapContainer>
    </div>
  );
}
