import React, { useEffect, useRef, useState, useMemo } from 'react';
import type * as MapLibreGL from 'maplibre-gl';
import {
  MapPin,
  Plus,
  Minus,
  LocateFixed,
  Layers,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkspaceGoongMapProps {
  latitude?: number | null;
  longitude?: number | null;
  venueName?: string;
  streetAddress?: string;
  className?: string;
  height?: string | number;
}

// Fallback high-resolution raster styles for MapLibre GL
const FALLBACK_RASTER_STREET_STYLE: MapLibreGL.StyleSpecification = {
  version: 8,
  sources: {
    'esri-street-tiles': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: '&copy; Esri & OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'esri-street-layer',
      type: 'raster',
      source: 'esri-street-tiles',
      minzoom: 0,
      maxzoom: 19
    }
  ]
};

const FALLBACK_RASTER_SATELLITE_STYLE: MapLibreGL.StyleSpecification = {
  version: 8,
  sources: {
    'esri-satellite-tiles': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: '&copy; Esri, Maxar, Earthstar Geographics'
    }
  },
  layers: [
    {
      id: 'esri-satellite-layer',
      type: 'raster',
      source: 'esri-satellite-tiles',
      minzoom: 0,
      maxzoom: 19
    }
  ]
};

function buildVenueMarkerElement(name: string, address: string) {
  const container = document.createElement('div');
  container.className = 'nexspace-goong-marker';
  container.style.cssText =
    'position: relative; display: flex; flex-direction: column; align-items: center; pointer-events: auto; user-select: none;';

  container.innerHTML = `
    <div style="margin-bottom: 6px; background-color: #0F172A; color: #FFFFFF; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; white-space: nowrap; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25); border: 1px solid #334155; display: flex; align-items: center; gap: 6px; pointer-events: none;">
      <span style="display: inline-block; width: 6px; height: 6px; border-radius: 9999px; background-color: #10B981; animation: pulse 2s infinite;"></span>
      <span class="marker-venue-name" style="max-width: 180px; overflow: hidden; text-overflow: ellipsis;">${name || 'NexSpace Venue'}</span>
      <span class="marker-venue-address" style="color: #94A3B8; font-size: 10px; font-weight: normal; margin-left: 2px; max-width: 140px; overflow: hidden; text-overflow: ellipsis;">${address ? address.split(',')[0] : 'Vietnam'}</span>
    </div>
    <div style="position: relative; width: 34px; height: 34px; border-radius: 9999px; background-color: #4F46E5; border: 2.5px solid #FFFFFF; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4); display: flex; align-items: center; justify-content: center; color: #FFFFFF; pointer-events: none;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
      <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 7px solid #4F46E5;"></div>
    </div>
    <div style="width: 18px; height: 4px; background-color: rgba(15, 23, 42, 0.35); border-radius: 9999px; filter: blur(1px); margin-top: 4px; pointer-events: none;"></div>
  `;

  return container;
}

export function WorkspaceGoongMap({
  latitude,
  longitude,
  venueName = 'NexSpace Venue',
  streetAddress = '',
  className = '',
  height = 240
}: WorkspaceGoongMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreGL.Map | null>(null);
  const markerRef = useRef<MapLibreGL.Marker | null>(null);
  const mapLibreModuleRef = useRef<typeof MapLibreGL | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [layerMode, setLayerMode] = useState<'streets' | 'satellite'>('streets');

  // Goong Map Keys
  const goongMaptilesKey = (import.meta.env.VITE_GOONG_MAPTILES_KEY as string | undefined)?.trim() || '';
  const isGoongActive = Boolean(goongMaptilesKey);

  // Validate and parse coordinates
  const validLat = typeof latitude === 'number' && !isNaN(latitude) && latitude !== 0 ? latitude : null;
  const validLng = typeof longitude === 'number' && !isNaN(longitude) && longitude !== 0 ? longitude : null;

  const defaultCoords = useMemo(() => {
    return {
      lat: validLat ?? 10.7769, // Default Ho Chi Minh City
      lng: validLng ?? 106.7009
    };
  }, [validLat, validLng]);

  const hasExplicitCoordinates = validLat !== null && validLng !== null;

  // Resolve vector vs raster style
  const resolveStyle = React.useCallback((mode: 'streets' | 'satellite'): MapLibreGL.StyleSpecification | string => {
    if (mode === 'satellite') {
      return FALLBACK_RASTER_SATELLITE_STYLE;
    }
    if (isGoongActive && goongMaptilesKey) {
      return `https://tiles.goong.io/assets/goong_map_web.json?api_key=${encodeURIComponent(goongMaptilesKey)}`;
    }
    return FALLBACK_RASTER_STREET_STYLE;
  }, [isGoongActive, goongMaptilesKey]);

  // Initialize Map
  useEffect(() => {
    const isMounted = { current: true };

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      try {
        const maplibregl = await import(/* @vite-ignore */ 'maplibre-gl');
        await import(/* @vite-ignore */ 'maplibre-gl/dist/maplibre-gl.css');
        mapLibreModuleRef.current = maplibregl;

        if (!isMounted.current || !mapContainerRef.current) return;

        const initialStyle = resolveStyle('streets');

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: initialStyle,
          center: [defaultCoords.lng, defaultCoords.lat],
          zoom: hasExplicitCoordinates ? 16 : 13,
          minZoom: 4,
          maxZoom: 19,
          attributionControl: false
        });

        map.on('load', () => {
          if (!isMounted.current) return;
          setIsLoaded(true);
          map.resize();
        });

        map.on('error', () => {
          // If Goong vector tile style fails (e.g. rate limit / network), fallback to raster street style
          if (!map.isStyleLoaded() && isGoongActive) {
            try {
              map.setStyle(FALLBACK_RASTER_STREET_STYLE);
            } catch {
              // Ignore style fallback errors
            }
          }
        });

        // Add Venue Marker if coordinates exist
        const markerEl = buildVenueMarkerElement(venueName, streetAddress);
        const marker = new maplibregl.Marker({
          element: markerEl,
          anchor: 'bottom'
        })
          .setLngLat([defaultCoords.lng, defaultCoords.lat])
          .addTo(map);

        markerRef.current = marker;
        mapInstanceRef.current = map;
      } catch (err: unknown) {
        if (!isMounted.current) return;
        const msg = err instanceof Error ? err.message : 'Failed to initialize Goong map';
        setLoadError(msg);
      }
    }

    initMap();

    return () => {
      isMounted.current = false;
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [defaultCoords, hasExplicitCoordinates, isGoongActive, venueName, streetAddress, resolveStyle]);

  // Update marker position & popup when props change
  useEffect(() => {
    if (mapInstanceRef.current && validLat !== null && validLng !== null) {
      mapInstanceRef.current.flyTo({
        center: [validLng, validLat],
        zoom: 16,
        essential: true
      });
      if (markerRef.current) {
        markerRef.current.setLngLat([validLng, validLat]);
      }
    }
  }, [validLat, validLng]);

  // Handle Container Resize (drawer opening, tab switches)
  useEffect(() => {
    if (!mapContainerRef.current || !mapInstanceRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.resize();
      }
    });

    resizeObserver.observe(mapContainerRef.current);

    // Initial delayed resize after slide-over drawer animation completes
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.resize();
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, []);

  // Map Controls Handlers
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [defaultCoords.lng, defaultCoords.lat],
        zoom: 16,
        essential: true
      });
    }
  };

  const toggleLayer = () => {
    const nextMode = layerMode === 'streets' ? 'satellite' : 'streets';
    setLayerMode(nextMode);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setStyle(resolveStyle(nextMode));
    }
  };

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${defaultCoords.lat},${defaultCoords.lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`relative rounded-xl border border-border bg-slate-950 overflow-hidden shadow-inner group ${className}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      {/* Map Container */}
      <div ref={mapContainerRef} className='w-full h-full' />

      {/* Loading Skeleton */}
      {!isLoaded && !loadError && (
        <div className='absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-2 text-white z-10'>
          <Loader2 className='size-5 animate-spin text-primary' />
          <span className='text-xs font-medium text-slate-300'>Đang tải bản đồ Goong Map...</span>
        </div>
      )}

      {/* Error Fallback */}
      {loadError && (
        <div className='absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 text-center z-10'>
          <MapPin className='size-6 text-amber-400 mb-1.5' />
          <p className='text-xs font-medium text-white'>Không thể hiển thị bản đồ trực tuyến</p>
          <p className='text-[10px] text-slate-400 mt-0.5'>{loadError}</p>
          <Button
            variant='outline'
            size='sm'
            onClick={openInGoogleMaps}
            className='mt-2.5 h-7 text-xs gap-1 border-slate-700 bg-slate-900 text-white hover:bg-slate-800'
          >
            <ExternalLink className='size-3' />
            Mở trên Google Maps
          </Button>
        </div>
      )}

      {/* Floating Header Badges */}
      <div className='absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 pointer-events-none'>
        <div className='px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-white text-[10px] font-semibold flex items-center gap-1.5 shadow-sm'>
          <span className='size-1.5 rounded-full bg-emerald-400 animate-pulse' aria-hidden='true'></span>
          <span>{isGoongActive ? 'Goong Vector Map' : 'Esri Street Map'}</span>
        </div>
        {hasExplicitCoordinates && (
          <div className='px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-slate-300 text-[10px] font-mono shadow-sm hidden sm:inline-flex'>
            {defaultCoords.lat.toFixed(4)}°N, {defaultCoords.lng.toFixed(4)}°E
          </div>
        )}
      </div>

      {/* Floating Map Controls */}
      <div className='absolute top-2.5 right-2.5 z-20 flex flex-col gap-1.5'>
        <div className='flex flex-col rounded-lg bg-card/90 backdrop-blur-md border border-border shadow-md overflow-hidden'>
          <button
            type='button'
            onClick={handleZoomIn}
            className='p-1.5 hover:bg-muted text-foreground transition-colors border-b border-border/50'
            title='Phóng to'
            aria-label='Zoom in'
          >
            <Plus className='size-3.5' />
          </button>
          <button
            type='button'
            onClick={handleZoomOut}
            className='p-1.5 hover:bg-muted text-foreground transition-colors'
            title='Thu nhỏ'
            aria-label='Zoom out'
          >
            <Minus className='size-3.5' />
          </button>
        </div>

        <button
          type='button'
          onClick={handleRecenter}
          className='p-1.5 rounded-lg bg-card/90 backdrop-blur-md border border-border text-foreground hover:bg-muted transition-colors shadow-md'
          title='Đưa về vị trí không gian'
          aria-label='Recenter map'
        >
          <LocateFixed className='size-3.5' />
        </button>

        <button
          type='button'
          onClick={toggleLayer}
          className={`p-1.5 rounded-lg backdrop-blur-md border shadow-md transition-colors ${
            layerMode === 'satellite'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card/90 border-border text-foreground hover:bg-muted'
          }`}
          title={layerMode === 'streets' ? 'Chuyển sang ảnh Vệ tinh' : 'Chuyển sang bản đồ Đường phố'}
          aria-label='Toggle map layer'
        >
          <Layers className='size-3.5' />
        </button>

        <button
          type='button'
          onClick={openInGoogleMaps}
          className='p-1.5 rounded-lg bg-card/90 backdrop-blur-md border border-border text-foreground hover:bg-muted transition-colors shadow-md'
          title='Mở vị trí ngoài Google Maps'
          aria-label='Open in Google Maps'
        >
          <ExternalLink className='size-3.5' />
        </button>
      </div>

      {/* Bottom Coordinates & Geofence Status */}
      <div className='absolute bottom-2 left-2 right-2 z-20 pointer-events-none flex items-center justify-between text-[10px]'>
        <div className='px-2 py-0.5 rounded bg-slate-950/85 backdrop-blur-sm text-slate-300 border border-slate-800 shadow-sm font-mono truncate max-w-[280px]'>
          📍 {streetAddress || `${defaultCoords.lat.toFixed(4)}, ${defaultCoords.lng.toFixed(4)}`}
        </div>
        <div className='px-2 py-0.5 rounded bg-emerald-950/80 backdrop-blur-sm text-emerald-300 border border-emerald-800/80 shadow-sm font-semibold flex items-center gap-1'>
          <span className='size-1.5 rounded-full bg-emerald-400'></span>
          <span>Geofence 50m</span>
        </div>
      </div>
    </div>
  );
}
