'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LiveDriver, DeliveryPoint } from '@/types/vrp';

interface MapViewProps {
  drivers: LiveDriver[];
  deliveries: DeliveryPoint[];
  focusDriverId: string | null;
  onDeliveryClick?: (delivery: DeliveryPoint) => void;
}

const STATUS_COLORS: Record<DeliveryPoint['status'], string> = {
  pending: '#6b7280',
  assigned: '#3b82f6',
  done: '#10b981',
  at_risk: '#ef4444',
};

const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [{ id: 'background-tiles', type: 'raster', source: 'carto-dark' }],
};

function createDriverMarkerEl(driver: LiveDriver): HTMLElement {
  const el = document.createElement('div');
  el.className = 'driver-marker';
  el.dataset.driverId = driver.id;
  el.style.cssText = `
    width: 36px; height: 36px;
    border-radius: 50%;
    border: 3px solid ${driver.routeColor};
    background: #18181b;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    box-shadow: 0 0 12px ${driver.routeColor}66;
    transition: transform 0.4s ease;
    transform: rotate(${driver.position.heading}deg);
  `;
  const arrow = document.createElement('div');
  arrow.style.cssText = `
    width: 0; height: 0;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-bottom: 14px solid ${driver.routeColor};
  `;
  el.appendChild(arrow);
  return el;
}

function createDeliveryMarkerEl(delivery: DeliveryPoint): HTMLElement {
  const color = STATUS_COLORS[delivery.status];
  const el = document.createElement('div');
  el.style.cssText = `
    width: 24px; height: 24px;
    border-radius: 50%;
    background: ${color};
    border: 2px solid #18181b;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    font-size: 10px; font-weight: 700; color: white;
    font-family: sans-serif;
    box-shadow: 0 2px 6px rgba(0,0,0,0.5);
  `;
  el.textContent = delivery.label;
  return el;
}

export default function MapView({ drivers, deliveries, focusDriverId, onDeliveryClick }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapReadyRef = useRef(false);
  const driverMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const deliveryMarkersRef = useRef<Record<string, maplibregl.Marker>>({});

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [2.3522, 48.8566],
      zoom: 12,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapRef.current = map;

    map.on('load', () => {
      mapReadyRef.current = true;

      // Route polylines
      drivers.forEach((driver) => {
        if (driver.routeCoordinates.length < 2) return;
        map.addSource(`route-${driver.id}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: driver.routeCoordinates },
          },
        });
        map.addLayer({
          id: `route-${driver.id}`,
          type: 'line',
          source: `route-${driver.id}`,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': driver.routeColor,
            'line-width': 3,
            'line-opacity': 0.75,
            'line-dasharray': [2, 1],
          },
        });
      });

      // Driver markers
      drivers.forEach((driver) => {
        const el = createDriverMarkerEl(driver);
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([driver.position.lng, driver.position.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 20 }).setHTML(driverPopupHTML(driver)),
          )
          .addTo(map);
        driverMarkersRef.current[driver.id] = marker;
      });

      // Delivery markers
      deliveries.forEach((delivery) => {
        const el = createDeliveryMarkerEl(delivery);
        el.addEventListener('click', () => onDeliveryClick?.(delivery));
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(delivery.location)
          .setPopup(new maplibregl.Popup({ offset: 16 }).setHTML(deliveryPopupHTML(delivery)))
          .addTo(map);
        deliveryMarkersRef.current[delivery.id] = marker;
      });
    });

    return () => {
      mapReadyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live position updates — imperatively move markers without recreating map
  useEffect(() => {
    if (!mapReadyRef.current) return;
    drivers.forEach((driver) => {
      const marker = driverMarkersRef.current[driver.id];
      if (!marker) return;
      marker.setLngLat([driver.position.lng, driver.position.lat]);
      const el = marker.getElement();
      el.style.transform = `rotate(${driver.position.heading}deg)`;
    });
  }, [drivers]);

  // Update route source data when routes change (after optimization)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    drivers.forEach((driver) => {
      const source = map.getSource(`route-${driver.id}`) as maplibregl.GeoJSONSource | undefined;
      if (!source || driver.routeCoordinates.length < 2) return;
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: driver.routeCoordinates },
      });
    });
  }, [drivers]);

  // Focus on driver
  useEffect(() => {
    if (!mapRef.current || !focusDriverId) return;
    const driver = drivers.find((d) => d.id === focusDriverId);
    if (!driver) return;
    mapRef.current.flyTo({
      center: [driver.position.lng, driver.position.lat],
      zoom: 14,
      duration: 800,
    });
    driverMarkersRef.current[focusDriverId]?.togglePopup();
  }, [focusDriverId, drivers]);

  return <div ref={containerRef} className="w-full h-full" />;
}

function driverPopupHTML(driver: LiveDriver) {
  const eta = driver.eta
    ? new Date(driver.eta).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null;
  return `
    <div style="background:#18181b;color:white;padding:8px 12px;border-radius:8px;font-family:sans-serif;min-width:160px;">
      <div style="font-weight:700;margin-bottom:4px;">${driver.name}</div>
      <div style="font-size:12px;color:#9ca3af;">${driver.nextStop ?? 'Pas de prochain arrêt'}</div>
      ${eta ? `<div style="font-size:12px;margin-top:4px;color:#60a5fa;">ETA : ${eta}</div>` : ''}
    </div>
  `;
}

function deliveryPopupHTML(delivery: DeliveryPoint) {
  const statusLabel =
    delivery.status === 'at_risk' ? '⚠ Risque de retard'
    : delivery.status === 'done' ? '✓ Livré'
    : delivery.status === 'assigned' ? 'Assigné'
    : 'En attente';
  return `
    <div style="background:#18181b;color:white;padding:8px 12px;border-radius:8px;font-family:sans-serif;min-width:180px;">
      <div style="font-weight:700;margin-bottom:2px;">${delivery.address}</div>
      <div style="font-size:11px;color:#9ca3af;">Créneau : ${delivery.timeWindowStart} – ${delivery.timeWindowEnd}</div>
      <div style="font-size:11px;margin-top:4px;color:${STATUS_COLORS[delivery.status]};">${statusLabel}</div>
    </div>
  `;
}
