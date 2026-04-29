'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: ['https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [{ id: 'background-tiles', type: 'raster', source: 'carto-dark' }],
};

export default function MapBackdrop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: DARK_STYLE,
      center: [2.3522, 48.8566],
      zoom: 11.6,
      pitch: 38,
      bearing: -12,
      attributionControl: false,
      interactive: false,
    });

    let raf = 0;
    let t = 0;
    const drift = () => {
      t += 0.0006;
      map.setBearing(-12 + Math.sin(t) * 6);
      raf = requestAnimationFrame(drift);
    };
    map.on('load', () => {
      raf = requestAnimationFrame(drift);
    });

    return () => {
      cancelAnimationFrame(raf);
      map.remove();
    };
  }, []);

  return <div ref={ref} className="absolute inset-0" />;
}
