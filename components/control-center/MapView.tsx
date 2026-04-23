'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LiveDriver, DeliveryPoint, DriverStatus } from '@/types/vrp';

interface MapViewProps {
  drivers: LiveDriver[];
  deliveries: DeliveryPoint[];
  focusDriverId: string | null;
  visibleDriverIds?: string[];
  visibleDeliveryIds?: string[];
  onDriverClick?: (driverId: string) => void;
  onDeliveryClick?: (delivery: DeliveryPoint) => void;
}

type LngLatTuple = [number, number];

const STATUS_COLORS: Record<DeliveryPoint['status'], string> = {
  pending: '#6b7280',
  assigned: '#3b82f6',
  done: '#10b981',
  at_risk: '#ef4444',
};

const STATUS_CHIP: Record<DriverStatus, { color: string; label: string; pulse: boolean }> = {
  on_route: { color: '#3b82f6', label: 'En route', pulse: false },
  paused:   { color: '#eab308', label: 'En pause', pulse: false },
  delayed:  { color: '#ef4444', label: 'Retard',   pulse: true },
  idle:     { color: '#22c55e', label: 'Disponible', pulse: false },
  offline:  { color: '#52525b', label: 'Hors ligne', pulse: false },
};

const DRIVER_MOVE_DURATION_MS = 2200;
const DRIVER_MARKER_OFFSET: [number, number] = [0, -2];
const DELIVERY_MARKER_OFFSET: [number, number] = [0, -2];

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

function deliveryBubbleBackground(color: string) {
  return `linear-gradient(180deg, rgba(255,255,255,0.24), rgba(255,255,255,0.04)), ${color}30`;
}

function deliveryBubbleShadow(color: string) {
  return `0 10px 24px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.24), 0 0 0 1px ${color}22`;
}

function driverGlassBackground(color: string) {
  return `linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.04)), ${color}24`;
}

function driverGlassShadow(color: string) {
  return `0 10px 20px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.18), 0 0 0 1px ${color}20`;
}

function enableSubpixelPositioning(marker: maplibregl.Marker) {
  const preciseMarker = marker as maplibregl.Marker & {
    setSubpixelPositioning?: (value: boolean) => maplibregl.Marker;
  };

  preciseMarker.setSubpixelPositioning?.(true);
  return marker;
}

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function interpolateLngLat(start: LngLatTuple, end: LngLatTuple, progress: number): LngLatTuple {
  return [
    start[0] + (end[0] - start[0]) * progress,
    start[1] + (end[1] - start[1]) * progress,
  ];
}

function vehicleIconSVG(type: 'car' | 'bike' | 'truck', color: string): string {
  const c = color;
  switch (type) {
    case 'car':
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H3v-4l2.5-6h13l2.5 6v4h-2"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M7 11h10"/></svg>`;
    case 'bike':
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3"/><circle cx="18.5" cy="17.5" r="3"/><path d="M5.5 14.5L9 8h6l3.5 4.5M12 17.5l-2-9.5"/></svg>`;
    case 'truck':
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 4v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/></svg>`;
  }
}

// Inject keyframes once for status pulse animation
function ensureStyles() {
  if (document.getElementById('dm-styles')) return;
  const s = document.createElement('style');
  s.id = 'dm-styles';
  s.textContent = `@keyframes dm-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}`;
  document.head.appendChild(s);
}

function createDriverMarkerEl(driver: LiveDriver): HTMLElement {
  ensureStyles();

  // Outer wrap — MapLibre sets its translate() transform on this element.
  // We must NOT set transform here ourselves or it will break positioning on zoom/pan.
  const wrap = document.createElement('div');
  wrap.className = 'dm-wrap';
  wrap.dataset.driverId = driver.id;
  wrap.style.cssText = 'position:relative;width:34px;height:34px;box-sizing:border-box;cursor:pointer;transition:opacity 0.25s ease;will-change:transform,opacity';

  const shell = document.createElement('div');
  shell.className = 'dm-shell';
  shell.style.cssText = `
    position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
    width:28px;height:28px;border-radius:999px;
    background:${driverGlassBackground(driver.routeColor)};
    border:1px solid ${driver.routeColor}33;
    box-shadow:${driverGlassShadow(driver.routeColor)};
    backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
    pointer-events:none;
  `;

  const status = document.createElement('div');
  status.className = 'dm-status';
  status.title = STATUS_CHIP[driver.status].label;
  status.style.cssText = `
    position:absolute;right:1px;bottom:2px;
    width:10px;height:10px;border-radius:999px;
    background:${STATUS_CHIP[driver.status].color};
    border:1.5px solid rgba(24,24,27,0.95);
    box-shadow:0 0 0 1px rgba(255,255,255,0.06);
    ${STATUS_CHIP[driver.status].pulse ? 'animation:dm-pulse 1.5s ease-in-out infinite;' : ''}
    pointer-events:none;
  `;

  // Vehicle icon — centered and rendered without any outer badge.
  const icon = document.createElement('div');
  icon.className = 'dm-icon';
  icon.title = `${driver.name} - ${STATUS_CHIP[driver.status].label}`;
  icon.style.cssText = `
    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    display:flex;align-items:center;justify-content:center;pointer-events:none;
    transform-origin:center center;
    line-height:0;
    filter:drop-shadow(0 0 10px ${driver.routeColor}88) drop-shadow(0 4px 10px rgba(0,0,0,0.3));
  `;
  icon.innerHTML = vehicleIconSVG(driver.vehicleType, driver.routeColor);

  wrap.appendChild(shell);
  wrap.appendChild(icon);
  wrap.appendChild(status);
  return wrap;
}

function createDeliveryMarkerEl(delivery: DeliveryPoint): HTMLElement {
  const color = STATUS_COLORS[delivery.status];
  const wrap = document.createElement('div');
  wrap.className = 'mission-wrap';
  wrap.style.cssText = 'position:relative;width:34px;height:34px;box-sizing:border-box;cursor:pointer;transition:opacity 0.25s ease;will-change:transform,opacity';

  const bubble = document.createElement('div');
  bubble.className = 'mission-bubble';
  bubble.style.cssText = `
    position:absolute;inset:0;
    box-sizing:border-box;
    border-radius:50%;
    background:${deliveryBubbleBackground(color)};
    border:1px solid rgba(255,255,255,0.16);
    display:flex;align-items:center;justify-content:center;
    font-size:11px;font-weight:800;color:white;letter-spacing:-0.5px;
    line-height:1;
    font-family:sans-serif;
    backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
    box-shadow:${deliveryBubbleShadow(color)};
    transition:transform 0.15s ease, box-shadow 0.15s ease;
    transform-origin:center center;
    pointer-events:none;
  `;
  bubble.textContent = delivery.label;

  wrap.appendChild(bubble);
  return wrap;
}

function applyDeliveryMarkerState(marker: maplibregl.Marker, delivery: DeliveryPoint) {
  marker.setLngLat(delivery.location);

  const bubble = marker.getElement().querySelector('.mission-bubble') as HTMLElement | null;
  if (!bubble) return;

  const color = STATUS_COLORS[delivery.status];
  bubble.textContent = delivery.label;
  bubble.style.background = deliveryBubbleBackground(color);
  bubble.style.boxShadow = deliveryBubbleShadow(color);
}

function clearDeliveryHoverLayers(map: maplibregl.Map) {
  const empty = { type: 'FeatureCollection' as const, features: [] };
  (map.getSource('hover-link') as maplibregl.GeoJSONSource | undefined)?.setData(empty);
  (map.getSource('hover-pickup') as maplibregl.GeoJSONSource | undefined)?.setData(empty);
}

export default function MapView({ drivers, deliveries, focusDriverId, visibleDriverIds, visibleDeliveryIds, onDriverClick, onDeliveryClick }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapReadyRef = useRef(false);
  const driverMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const driverPositionsRef = useRef<Record<string, LngLatTuple>>({});
  const driverAnimationFramesRef = useRef<Record<string, number>>({});
  const deliveryMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const deliveriesRef = useRef<Record<string, DeliveryPoint>>({});
  const onDeliveryClickRef = useRef(onDeliveryClick);

  useEffect(() => {
    deliveriesRef.current = Object.fromEntries(deliveries.map((delivery) => [delivery.id, delivery]));
  }, [deliveries]);

  useEffect(() => {
    onDeliveryClickRef.current = onDeliveryClick;
  }, [onDeliveryClick]);

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

      // Pickup↔delivery hover link layer
      map.addSource('hover-link', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'hover-link',
        type: 'line',
        source: 'hover-link',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#f97316',
          'line-width': 2,
          'line-dasharray': [4, 3],
          'line-opacity': 0.9,
        },
      });

      // Pickup endpoint marker layer
      map.addSource('hover-pickup', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'hover-pickup',
        type: 'circle',
        source: 'hover-pickup',
        paint: {
          'circle-radius': 6,
          'circle-color': '#f97316',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#18181b',
          'circle-opacity': 0.9,
        },
      });

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
        const initialPosition: LngLatTuple = [driver.position.lng, driver.position.lat];
        el.addEventListener('click', () => onDriverClick?.(driver.id));
        const marker = enableSubpixelPositioning(new maplibregl.Marker({ element: el, anchor: 'center', offset: DRIVER_MARKER_OFFSET }))
          .setLngLat(initialPosition)
          .addTo(map);
        driverMarkersRef.current[driver.id] = marker;
        driverPositionsRef.current[driver.id] = initialPosition;
      });

      // Delivery markers
      deliveries.forEach((delivery) => {
        const el = createDeliveryMarkerEl(delivery);
        const bubble = el.querySelector('.mission-bubble') as HTMLElement | null;

        el.addEventListener('click', () => {
          const currentDelivery = deliveriesRef.current[delivery.id];
          if (currentDelivery) onDeliveryClickRef.current?.(currentDelivery);
        });

        el.addEventListener('mouseenter', () => {
          const currentDelivery = deliveriesRef.current[delivery.id];
          if (!currentDelivery || !bubble) return;

          const color = STATUS_COLORS[currentDelivery.status];
          bubble.style.transform = 'scale(1.25)';
          bubble.style.boxShadow = `0 14px 28px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.28), 0 0 0 1px ${color}44`;

          if (!currentDelivery.pickupLocation) {
            clearDeliveryHoverLayers(map);
            return;
          }

          (map.getSource('hover-link') as maplibregl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: [currentDelivery.pickupLocation, currentDelivery.location] },
            }],
          });
          (map.getSource('hover-pickup') as maplibregl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              properties: {},
              geometry: { type: 'Point', coordinates: currentDelivery.pickupLocation },
            }],
          });
        });

        el.addEventListener('mouseleave', () => {
          const currentDelivery = deliveriesRef.current[delivery.id];
          if (bubble) {
            const color = currentDelivery ? STATUS_COLORS[currentDelivery.status] : STATUS_COLORS.pending;
            bubble.style.transform = '';
            bubble.style.boxShadow = deliveryBubbleShadow(color);
          }
          clearDeliveryHoverLayers(map);
        });

        const marker = enableSubpixelPositioning(new maplibregl.Marker({ element: el, anchor: 'center', offset: DELIVERY_MARKER_OFFSET }))
          .setLngLat(delivery.location)
          .addTo(map);
        deliveryMarkersRef.current[delivery.id] = marker;
      });
    });

    return () => {
      mapReadyRef.current = false;
      Object.values(driverAnimationFramesRef.current).forEach((frameId) => cancelAnimationFrame(frameId));
      driverAnimationFramesRef.current = {};
      driverPositionsRef.current = {};
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync delivery marker visibility with mission panel filters
  useEffect(() => {
    if (!mapReadyRef.current) return;
    Object.entries(deliveryMarkersRef.current).forEach(([deliveryId, marker]) => {
      const visible = !visibleDeliveryIds || visibleDeliveryIds.includes(deliveryId);
      const el = marker.getElement();
      el.style.opacity = visible ? '1' : '0.1';
      el.style.pointerEvents = visible ? 'auto' : 'none';
    });
  }, [visibleDeliveryIds]);

  // Live delivery updates — keep mission markers in sync without recreating the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;

    const nextIds = new Set(deliveries.map((delivery) => delivery.id));

    Object.entries(deliveryMarkersRef.current).forEach(([deliveryId, marker]) => {
      if (nextIds.has(deliveryId)) return;
      marker.remove();
      delete deliveryMarkersRef.current[deliveryId];
    });

    deliveries.forEach((delivery) => {
      const existingMarker = deliveryMarkersRef.current[delivery.id];
      if (existingMarker) {
        applyDeliveryMarkerState(existingMarker, delivery);
        return;
      }

      const el = createDeliveryMarkerEl(delivery);
      const bubble = el.querySelector('.mission-bubble') as HTMLElement | null;

      el.addEventListener('click', () => {
        const currentDelivery = deliveriesRef.current[delivery.id];
        if (currentDelivery) onDeliveryClickRef.current?.(currentDelivery);
      });

      el.addEventListener('mouseenter', () => {
        const currentDelivery = deliveriesRef.current[delivery.id];
        if (!currentDelivery || !bubble) return;

        const color = STATUS_COLORS[currentDelivery.status];
        bubble.style.transform = 'scale(1.25)';
        bubble.style.boxShadow = `0 14px 28px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.28), 0 0 0 1px ${color}44`;

        if (!currentDelivery.pickupLocation) {
          clearDeliveryHoverLayers(map);
          return;
        }

        (map.getSource('hover-link') as maplibregl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: [currentDelivery.pickupLocation, currentDelivery.location] },
          }],
        });
        (map.getSource('hover-pickup') as maplibregl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: { type: 'Point', coordinates: currentDelivery.pickupLocation },
          }],
        });
      });

      el.addEventListener('mouseleave', () => {
        const currentDelivery = deliveriesRef.current[delivery.id];
        if (bubble) {
          const color = currentDelivery ? STATUS_COLORS[currentDelivery.status] : STATUS_COLORS.pending;
          bubble.style.transform = '';
          bubble.style.boxShadow = deliveryBubbleShadow(color);
        }
        clearDeliveryHoverLayers(map);
      });

      const marker = enableSubpixelPositioning(new maplibregl.Marker({ element: el, anchor: 'center', offset: DELIVERY_MARKER_OFFSET }))
        .setLngLat(delivery.location)
        .addTo(map);

      deliveryMarkersRef.current[delivery.id] = marker;
    });
  }, [deliveries]);

  // Sync driver marker visibility with sidebar filters (no map recreation needed)
  useEffect(() => {
    if (!mapReadyRef.current) return;
    Object.entries(driverMarkersRef.current).forEach(([driverId, marker]) => {
      const visible = !visibleDriverIds || visibleDriverIds.includes(driverId);
      const el = marker.getElement();
      el.style.opacity = visible ? '1' : '0.12';
      el.style.pointerEvents = visible ? 'auto' : 'none';
    });
  }, [visibleDriverIds]);

  // Live position + status updates — animate driver movement and keep markers synchronized
  useEffect(() => {
    if (!mapReadyRef.current) return;

    const nextIds = new Set(drivers.map((driver) => driver.id));

    Object.keys(driverMarkersRef.current).forEach((driverId) => {
      if (nextIds.has(driverId)) return;

      const frameId = driverAnimationFramesRef.current[driverId];
      if (frameId) {
        cancelAnimationFrame(frameId);
        delete driverAnimationFramesRef.current[driverId];
      }

      driverMarkersRef.current[driverId]?.remove();
      delete driverMarkersRef.current[driverId];
      delete driverPositionsRef.current[driverId];
    });

    drivers.forEach((driver) => {
      let marker = driverMarkersRef.current[driver.id];
      const targetPosition: LngLatTuple = [driver.position.lng, driver.position.lat];

      if (!marker) {
        const el = createDriverMarkerEl(driver);
        el.addEventListener('click', () => onDriverClick?.(driver.id));
        marker = enableSubpixelPositioning(new maplibregl.Marker({ element: el, anchor: 'center', offset: DRIVER_MARKER_OFFSET }))
          .setLngLat(targetPosition)
          .addTo(mapRef.current!);
        driverMarkersRef.current[driver.id] = marker;
        driverPositionsRef.current[driver.id] = targetPosition;
      }

      const frameId = driverAnimationFramesRef.current[driver.id];
      if (frameId) cancelAnimationFrame(frameId);

      const startPosition = driverPositionsRef.current[driver.id] ?? targetPosition;
      const startTime = performance.now();

      const animate = (timestamp: number) => {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / DRIVER_MOVE_DURATION_MS, 1);
        const easedProgress = easeInOutCubic(progress);
        const currentPosition = interpolateLngLat(startPosition, targetPosition, easedProgress);

        marker.setLngLat(currentPosition);
        driverPositionsRef.current[driver.id] = currentPosition;

        if (progress < 1) {
          driverAnimationFramesRef.current[driver.id] = requestAnimationFrame(animate);
          return;
        }

        marker.setLngLat(targetPosition);
        driverPositionsRef.current[driver.id] = targetPosition;
        delete driverAnimationFramesRef.current[driver.id];
      };

      if (startPosition[0] === targetPosition[0] && startPosition[1] === targetPosition[1]) {
        marker.setLngLat(targetPosition);
        driverPositionsRef.current[driver.id] = targetPosition;
      } else {
        driverAnimationFramesRef.current[driver.id] = requestAnimationFrame(animate);
      }

      const el = marker.getElement();
      const shell = el.querySelector('.dm-shell') as HTMLElement | null;
      const icon = el.querySelector('.dm-icon') as HTMLElement | null;
      const status = el.querySelector('.dm-status') as HTMLElement | null;
      if (shell) {
        shell.style.background = driverGlassBackground(driver.routeColor);
        shell.style.borderColor = `${driver.routeColor}33`;
        shell.style.boxShadow = driverGlassShadow(driver.routeColor);
      }
      if (icon) {
        icon.innerHTML = vehicleIconSVG(driver.vehicleType, driver.routeColor);
        icon.title = `${driver.name} - ${STATUS_CHIP[driver.status].label}`;
        icon.style.filter = `drop-shadow(0 0 10px ${driver.routeColor}88)`;
      }
      if (status) {
        const chip = STATUS_CHIP[driver.status];
        status.style.background = chip.color;
        status.style.animation = chip.pulse ? 'dm-pulse 1.5s ease-in-out infinite' : '';
        status.title = chip.label;
      }
    });
  }, [drivers]);

  // Update route polylines after optimization
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
  }, [focusDriverId, drivers]);

  return <div ref={containerRef} className="w-full h-full" />;
}

