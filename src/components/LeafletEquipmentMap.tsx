import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { EquipmentItem } from '../types';

interface Props {
  equipmentList: EquipmentItem[];
  userCoords: { lat: number; lon: number };
  onSelectEquipment: (item: EquipmentItem) => void;
}

export const LeafletEquipmentMap: React.FC<Props> = ({
  equipmentList,
  userCoords,
  onSelectEquipment,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(
        [userCoords.lat || 25.15, userCoords.lon || 76.2],
        8,
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | Khet Mitra Rajasthan',
        maxZoom: 18,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    // User location marker
    const userIcon = L.divIcon({
      className: 'khet-user-marker',
      html: `<div style="background:#1D4ED8;color:#fff;padding:3px 7px;border-radius:999px;font-size:10px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,0.25);white-space:nowrap;">Your Location</div>`,
      iconSize: [90, 24],
      iconAnchor: [45, 12],
    });

    L.marker([userCoords.lat || 25.15, userCoords.lon || 76.2], { icon: userIcon })
      .addTo(layer)
      .bindPopup('<strong>Your Selected Farm Location</strong>');

    // Equipment markers
    equipmentList.forEach((item) => {
      if (!item.latitude || !item.longitude) return;

      const badgeIcon = L.divIcon({
        className: 'khet-equip-marker',
        html: `<div style="background:${
          item.is_available ? '#2E6F40' : '#6B7280'
        };color:#fff;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap;cursor:pointer;">${
          item.category
        } · ₹${item.price_per_day}/d</div>`,
        iconSize: [115, 26],
        iconAnchor: [57, 13],
      });

      const marker = L.marker([item.latitude, item.longitude], { icon: badgeIcon }).addTo(layer);

      const popupEl = document.createElement('div');
      popupEl.style.minWidth = '210px';
      popupEl.style.fontFamily = 'Public Sans, sans-serif';
      popupEl.innerHTML = `
        <div style="font-size:12px;line-height:1.4;color:#1A241B;">
          <div style="font-weight:700;color:#2E6F40;margin-bottom:2px;">${item.category} · ${item.brand}</div>
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${item.equipment_name}</div>
          <div style="color:#4E5D50;font-size:11px;margin-bottom:4px;">Location: <strong>${item.location}</strong></div>
          <div style="color:#4E5D50;font-size:11px;margin-bottom:6px;">Owner: <strong>${item.owner_name}</strong></div>
          <div style="font-weight:700;font-size:12px;margin-bottom:8px;">₹${item.price_per_day}/day · ₹${item.price_per_hour}/hr</div>
          <button type="button" id="open-eq-${item.equipment_id}" style="width:100%;padding:6px 10px;background:#2E6F40;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;">
            Open Equipment Page →
          </button>
        </div>
      `;

      marker.bindPopup(popupEl);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`open-eq-${item.equipment_id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectEquipment(item);
          };
        }
      });
    });
  }, [equipmentList, userCoords, onSelectEquipment]);

  return (
    <div className="bg-white border border-[#DCE2D8] rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-[#F7F8F5] border-b border-[#DCE2D8] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div>
          <span className="font-bold text-[#1A241B]">
            Interactive Equipment Map (Leaflet + OpenStreetMap)
          </span>
          <span className="text-[#4E5D50] ml-2">
            Showing {equipmentList.length} equipment locations across Kota, Baran, Anta, Atru, Sangod, Bundi, Jhalawar &amp; Jaipur
          </span>
        </div>
        <span className="text-[11px] font-semibold text-[#2E6F40]">
          Click any green marker pin to view details &amp; book
        </span>
      </div>
      <div ref={mapContainerRef} className="w-full h-80 sm:h-96 z-0" />
    </div>
  );
};
