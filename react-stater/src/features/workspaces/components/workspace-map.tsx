import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import type * as MapLibreGL from 'maplibre-gl';
import {
  RefreshCw,
  LocateFixed,
  Plus,
  Minus,
  Star,
  ExternalLink,
  Loader2,
  X
} from 'lucide-react';
import { useCurrency } from '@/features/landing/context/currency-context';
import type { PublicWorkspaceSummary } from '../api/types';

interface WorkspaceMapProps {
  workspaces?: PublicWorkspaceSummary[];
  userLocation?: { lat: number; lng: number } | null;
  selectedWorkspaceId?: string | null;
  onWorkspaceSelect?: (id: string | null) => void;
  onLocateMe?: () => void;
  isLocating?: boolean;
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

interface MapLayerItem {
  id: string;
  [key: string]: unknown;
}

// Helper to strip out high-density commercial POIs (food, stores, spas, hotels, parks, trees)
// Leaves clean street lines, highways, place/district labels, rivers, bridges, and essential geography
function filterCleanGoongStyle(rawStyle: MapLibreGL.StyleSpecification): MapLibreGL.StyleSpecification {
  const cloned = JSON.parse(JSON.stringify(rawStyle)) as MapLibreGL.StyleSpecification;
  if (Array.isArray(cloned.layers)) {
    cloned.layers = (cloned.layers as MapLayerItem[]).filter((layer) => {
      const id = layer.id || '';
      // Remove commercial and clutter POIs
      if (id.startsWith('poi-scalerank')) return false;
      if (id.startsWith('poi-park-scalerank')) return false;
      if (id === 'poi-tree') return false;
      return true;
    }) as typeof cloned.layers;
  }
  return cloned;
}

// Runtime cleanup for any residual POI layers
function cleanMapClutter(map: MapLibreGL.Map) {
  try {
    const style = map.getStyle();
    if (!style || !style.layers) return;
    (style.layers as MapLayerItem[]).forEach((layer) => {
      if (
        layer.id.startsWith('poi-scalerank') ||
        layer.id.startsWith('poi-park-scalerank') ||
        layer.id === 'poi-tree'
      ) {
        if (map.getLayer(layer.id)) {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
      }
    });
  } catch (_err) {
    // ignore
  }
}

export function WorkspaceMap({
  workspaces = [],
  userLocation = null,
  selectedWorkspaceId = null,
  onWorkspaceSelect,
  onLocateMe,
  isLocating = false
}: WorkspaceMapProps) {
  const { formatPrice } = useCurrency();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreGL.Map | null>(null);
  const mapLibreModuleRef = useRef<typeof MapLibreGL | null>(null);
  const workspaceMarkersRef = useRef<Map<string, MapLibreGL.Marker>>(new Map());
  const userLocationMarkerRef = useRef<MapLibreGL.Marker | null>(null);
  const isMountedRef = useRef(true);

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [_loadError, setLoadError] = useState<string | null>(null);
  const [layerMode, setLayerMode] = useState<'streets' | 'satellite'>('streets');
  const [hoveredWsId, setHoveredWsId] = useState<string | null>(null);
  const [pinnedWsId, setPinnedWsId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveActiveId = hoveredWsId ?? pinnedWsId ?? selectedWorkspaceId ?? null;
  const effectiveActiveIdRef = useRef(effectiveActiveId);
  useEffect(() => {
    effectiveActiveIdRef.current = effectiveActiveId;
  }, [effectiveActiveId]);

  // Preview card opens only when a workspace marker is clicked/pinned, preventing unwanted popup flashing on hover
  const activePopupWorkspace = useMemo(() => {
    const targetId = pinnedWsId || (effectiveActiveId && !hoveredWsId ? effectiveActiveId : null);
    if (!targetId) return null;
    return workspaces.find((w) => String(w.id) === String(targetId)) ?? null;
  }, [pinnedWsId, effectiveActiveId, hoveredWsId, workspaces]);

  // Goong Map Keys
  const goongMaptilesKey = (import.meta.env.VITE_GOONG_MAPTILES_KEY as string | undefined)?.trim() || '';
  const isGoongActive = Boolean(goongMaptilesKey);
  const cleanedGoongStyleRef = useRef<MapLibreGL.StyleSpecification | null>(null);

  // Capture initial coordinate center once on mount
  const initialCenterRef = useRef<[number, number]>(
    userLocation ? [userLocation.lng, userLocation.lat] : [108.2208, 16.0544] // Da Nang coordinates
  );

  const resolveStyle = useCallback(
    async (mode: 'streets' | 'satellite'): Promise<MapLibreGL.StyleSpecification | string> => {
      if (mode === 'satellite') return FALLBACK_RASTER_SATELLITE_STYLE;
      if (!isGoongActive || !goongMaptilesKey) return FALLBACK_RASTER_STREET_STYLE;

      if (cleanedGoongStyleRef.current) return cleanedGoongStyleRef.current;

      try {
        const url = `https://tiles.goong.io/assets/goong_map_web.json?api_key=${encodeURIComponent(goongMaptilesKey)}`;
        const res = await fetch(url);
        if (res.ok) {
          const raw = (await res.json()) as MapLibreGL.StyleSpecification;
          const cleaned = filterCleanGoongStyle(raw);
          cleanedGoongStyleRef.current = cleaned;
          return cleaned;
        }
      } catch (err) {
        console.warn('[WorkspaceMap] Fetching Goong style JSON failed, falling back to direct URL:', err);
      }

      return `https://tiles.goong.io/assets/goong_map_web.json?api_key=${encodeURIComponent(goongMaptilesKey)}`;
    },
    [isGoongActive, goongMaptilesKey]
  );

  // Initialize MapLibre GL
  useEffect(() => {
    isMountedRef.current = true;
    const currentWorkspaceMarkers = workspaceMarkersRef.current;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      try {
        const maplibregl = await import(/* @vite-ignore */ 'maplibre-gl');
        await import(/* @vite-ignore */ 'maplibre-gl/dist/maplibre-gl.css');
        mapLibreModuleRef.current = maplibregl;

        if (typeof maplibregl.setWorkerUrl === 'function') {
          maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
        }

        if (!isMountedRef.current || !mapContainerRef.current) return;

        const initialStyle = await resolveStyle('streets');

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: initialStyle,
          center: initialCenterRef.current,
          zoom: 13,
          minZoom: 4,
          maxZoom: 19,
          attributionControl: false
        });

        map.on('load', () => {
          if (!isMountedRef.current) return;
          cleanMapClutter(map);
          setIsMapLoaded(true);
          map.resize();
        });

        map.on('styledata', () => {
          cleanMapClutter(map);
        });

        map.on('error', (e) => {
          console.warn('[WorkspaceMap] Style or source load error, falling back:', e);
          if (isMountedRef.current && isGoongActive) {
            setLoadError('Goong map style unavailable, loaded fallback satellite/vector map.');
            try {
              map.setStyle(FALLBACK_RASTER_STREET_STYLE);
            } catch (err) {
              console.error('[WorkspaceMap] Fallback style error:', err);
            }
          }
        });

        // Click on map empty background closes active popup
        map.on('click', () => {
          setHoveredWsId(null);
          setPinnedWsId(null);
          onWorkspaceSelect?.(null);
        });

        mapInstanceRef.current = map;
      } catch (err: unknown) {
        console.error('[WorkspaceMap] Init failed:', err);
        if (isMountedRef.current) {
          setLoadError('Cannot initialize map engine.');
        }
      }
    }

    initMap();

    return () => {
      isMountedRef.current = false;
      currentWorkspaceMarkers.forEach((m) => m.remove());
      currentWorkspaceMarkers.clear();
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [resolveStyle, isGoongActive, onWorkspaceSelect]);

  // Handle Layer Switch
  const handleLayerSwitch = useCallback(
    async (mode: 'streets' | 'satellite') => {
      if (!mapInstanceRef.current || mode === layerMode) return;
      setLayerMode(mode);
      const newStyle = await resolveStyle(mode);
      mapInstanceRef.current.setStyle(newStyle);
    },
    [layerMode, resolveStyle]
  );

  // Zoom Controls
  const handleZoomIn = useCallback(() => {
    mapInstanceRef.current?.zoomIn({ duration: 300 });
  }, []);

  const handleZoomOut = useCallback(() => {
    mapInstanceRef.current?.zoomOut({ duration: 300 });
  }, []);

  // Fit Bounds to all Workspaces + User Location
  const handleFitBounds = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    let hasPoints = false;

    if (userLocation && typeof userLocation.lng === 'number' && typeof userLocation.lat === 'number') {
      minLng = Math.min(minLng, userLocation.lng);
      maxLng = Math.max(maxLng, userLocation.lng);
      minLat = Math.min(minLat, userLocation.lat);
      maxLat = Math.max(maxLat, userLocation.lat);
      hasPoints = true;
    }

    workspaces.forEach((ws) => {
      const lat = typeof ws.latitude === 'number' ? ws.latitude : Number(ws.latitude);
      const lng = typeof ws.longitude === 'number' ? ws.longitude : Number(ws.longitude);
      if (!isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0)) {
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        hasPoints = true;
      }
    });

    if (!hasPoints) return;

    if (minLng === maxLng && minLat === maxLat) {
      map.easeTo({ center: [minLng, minLat], zoom: 14, duration: 600 });
    } else {
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat]
        ],
        {
          padding: { top: 60, bottom: 60, left: 50, right: 50 },
          maxZoom: 16,
          duration: 700
        }
      );
    }
  }, [workspaces, userLocation]);

  const coordinatesFingerprint = useMemo(() => {
    const wsCoords = workspaces
      .map((w) => `${w.id}:${w.latitude ?? 0},${w.longitude ?? 0}`)
      .join('|');
    const uCoords = userLocation ? `${userLocation.lat},${userLocation.lng}` : 'no-user';
    return `${uCoords}__${wsCoords}`;
  }, [workspaces, userLocation]);

  // Auto center and frame map as soon as workspaces or userLocation load/change
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current) return;
    if (coordinatesFingerprint) {
      handleFitBounds();
    }
  }, [isMapLoaded, coordinatesFingerprint, handleFitBounds]);

  // Clean up any pending hover timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Update User Location Marker
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current || !mapLibreModuleRef.current) return;
    const map = mapInstanceRef.current;
    const maplibregl = mapLibreModuleRef.current;

    if (!userLocation) {
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
      return;
    }

    if (!userLocationMarkerRef.current) {
      const container = document.createElement('div');
      container.className = 'user-gps-beacon-wrapper';
      container.style.cssText = 'cursor: pointer; user-select: none; pointer-events: auto;';

      const inner = document.createElement('div');
      inner.className = 'user-gps-beacon-inner';
      inner.style.cssText = 'position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;';

      inner.innerHTML = `
        <div style="position: absolute; inset: 0; border-radius: 9999px; background-color: #4F46E5; opacity: 0.25; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 14px; height: 14px; border-radius: 9999px; background-color: #4F46E5; border: 2.5px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
      `;

      container.appendChild(inner);

      userLocationMarkerRef.current = new maplibregl.Marker({ element: container, anchor: 'center' })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);
    } else {
      userLocationMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
    }
  }, [isMapLoaded, userLocation]);

  // Format compact price for map marker (e.g. "35k/h" or "$1.4/h")
  const getMarkerPriceText = useCallback(
    (price: number | undefined) => {
      if (!price || price <= 0) return 'Liên hệ';
      return `${formatPrice(price, { compact: true })}/h`;
    },
    [formatPrice]
  );

  // Render & Synchronize Compact Price Markers on Map
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current || !mapLibreModuleRef.current) return;
    const map = mapInstanceRef.current;
    const maplibregl = mapLibreModuleRef.current;

    // Clear existing markers
    workspaceMarkersRef.current.forEach((marker) => marker.remove());
    workspaceMarkersRef.current.clear();

    workspaces.forEach((ws) => {
      const lat = typeof ws.latitude === 'number' ? ws.latitude : Number(ws.latitude);
      const lng = typeof ws.longitude === 'number' ? ws.longitude : Number(ws.longitude);
      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

      const wsIdStr = String(ws.id);
      const isSelected = String(effectiveActiveIdRef.current) === wsIdStr;
      const priceText = getMarkerPriceText(ws.pricePerHour);

      // Outer wrapper element given to MapLibre GL
      const container = document.createElement('div');
      container.className = `nexspace-workspace-marker-wrapper ${isSelected ? 'is-selected' : ''}`;
      container.dataset.wsId = wsIdStr;
      container.style.cssText = `cursor: pointer; user-select: none; pointer-events: auto; z-index: ${isSelected ? 60 : 10};`;

      // Inner compact pill: clean, bold, brand-accented
      const inner = document.createElement('div');
      inner.className = 'nexspace-workspace-marker-inner';
      inner.style.cssText = [
        'display: flex',
        'flex-direction: column',
        'align-items: center',
        'width: max-content',
        'filter: drop-shadow(0 3px 6px rgba(15, 23, 42, 0.22))',
        'transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1)',
        isSelected ? 'transform: scale(1.18);' : 'transform: scale(1);'
      ].join('; ');

      const bgColor = isSelected ? '#4F46E5' : '#FFFFFF';
      const textColor = isSelected ? '#FFFFFF' : '#0F172A';
      const borderColor = isSelected ? '#3730A3' : '#CBD5E1';
      const dotColor = isSelected ? '#FFFFFF' : '#4F46E5';
      const dotGlow = isSelected
        ? '0 0 6px rgba(255, 255, 255, 0.95)'
        : '0 0 5px rgba(79, 70, 229, 0.55)';
      const shadowStyle = isSelected
        ? '0 10px 25px -3px rgba(79, 70, 229, 0.55), 0 4px 10px rgba(0,0,0,0.18)'
        : '0 4px 12px -1px rgba(15, 23, 42, 0.22), 0 2px 4px -1px rgba(15, 23, 42, 0.12)';

      inner.innerHTML = `
        <div class="nexspace-marker-pill" style="
          display: inline-flex;
          align-items: center;
          gap: 5.5px;
          padding: 5px 10px 5px 8px;
          border-radius: 9999px;
          font-size: 11.5px;
          font-weight: 800;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          letter-spacing: -0.01em;
          white-space: nowrap;
          width: max-content;
          background-color: ${bgColor};
          color: ${textColor};
          border: 1.5px solid ${borderColor};
          box-shadow: ${shadowStyle};
          transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        ">
          <span class="nexspace-marker-dot" style="
            display: inline-block;
            width: 6.5px;
            height: 6.5px;
            border-radius: 9999px;
            background-color: ${dotColor};
            box-shadow: ${dotGlow};
            flex-shrink: 0;
            transition: background-color 0.15s ease, box-shadow 0.15s ease;
          "></span>
          <span>${priceText}</span>
        </div>
        <div class="nexspace-marker-arrow" style="
          width: 0;
          height: 0;
          border-left: 4.5px solid transparent;
          border-right: 4.5px solid transparent;
          border-top: 5px solid ${borderColor};
          margin-top: -1px;
          filter: drop-shadow(0 2px 2px rgba(15, 23, 42, 0.2));
          transition: border-top-color 0.15s ease;
        "></div>
      `;

      container.appendChild(inner);

      container.addEventListener('mouseenter', () => {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        setHoveredWsId(wsIdStr);
        onWorkspaceSelect?.(wsIdStr);
      });

      container.addEventListener('mouseleave', () => {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = setTimeout(() => {
          setHoveredWsId(null);
          // If not pinned, clear global selection
          setPinnedWsId((currentPinned) => {
            if (!currentPinned) {
              onWorkspaceSelect?.(null);
            }
            return currentPinned;
          });
        }, 120);
      });

      container.addEventListener('click', (e) => {
        e.stopPropagation();
        setPinnedWsId(wsIdStr);
        setHoveredWsId(null);
        onWorkspaceSelect?.(wsIdStr);
      });

      const marker = new maplibregl.Marker({ element: container, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(map);

      workspaceMarkersRef.current.set(wsIdStr, marker);
    });
  }, [isMapLoaded, workspaces, getMarkerPriceText, onWorkspaceSelect]);

  // Update marker highlight styles in-place without rebuilding DOM
  useEffect(() => {
    workspaceMarkersRef.current.forEach((marker, id) => {
      const container = marker.getElement();
      const isSelected = String(id) === String(effectiveActiveId);
      const inner = container.querySelector('.nexspace-workspace-marker-inner') as HTMLElement | null;
      const pill = container.querySelector('.nexspace-marker-pill') as HTMLElement | null;
      const arrow = container.querySelector('.nexspace-marker-arrow') as HTMLElement | null;
      const dot = container.querySelector('.nexspace-marker-dot') as HTMLElement | null;

      if (inner) {
        inner.style.transform = isSelected ? 'scale(1.18)' : 'scale(1)';
      }
      if (pill) {
        pill.style.backgroundColor = isSelected ? '#4F46E5' : '#FFFFFF';
        pill.style.color = isSelected ? '#FFFFFF' : '#0F172A';
        pill.style.borderColor = isSelected ? '#3730A3' : '#CBD5E1';
        pill.style.boxShadow = isSelected
          ? '0 10px 25px -3px rgba(79, 70, 229, 0.55), 0 4px 10px rgba(0,0,0,0.18)'
          : '0 4px 12px -1px rgba(15, 23, 42, 0.22), 0 2px 4px -1px rgba(15, 23, 42, 0.12)';
      }
      if (dot) {
        dot.style.backgroundColor = isSelected ? '#FFFFFF' : '#4F46E5';
        dot.style.boxShadow = isSelected
          ? '0 0 6px rgba(255, 255, 255, 0.95)'
          : '0 0 5px rgba(79, 70, 229, 0.55)';
      }
      if (arrow) {
        arrow.style.borderTopColor = isSelected ? '#3730A3' : '#CBD5E1';
      }
      container.style.zIndex = isSelected ? '60' : '10';
    });
  }, [effectiveActiveId]);

  // ResizeObserver for Map Container
  useEffect(() => {
    if (!mapContainerRef.current || !mapInstanceRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      mapInstanceRef.current?.resize();
    });
    resizeObserver.observe(mapContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      className="h-full w-full relative overflow-hidden bg-[#F8FAFC]"
      data-location="Goong Map Interactive Canvas"
    >
      {/* MapLibre Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />

      {/* Floating Fit All Pill at top center */}
      <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2">
        <button
          type="button"
          onClick={handleFitBounds}
          className="flex items-center gap-1.5 rounded-full border border-border/80 bg-card/95 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur-md transition-all hover:border-primary hover:bg-card cursor-pointer"
        >
          <RefreshCw className="h-3 w-3 text-primary" />
          <span>Bao quát ({workspaces.length})</span>
        </button>
      </div>

      {/* Top Right: Layer Switcher */}
      <div className="absolute right-4 top-4 z-20 flex overflow-hidden rounded-lg border border-border bg-card p-0.5 shadow-sm">
        <button
          type="button"
          onClick={() => handleLayerSwitch('streets')}
          className={`rounded px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
            layerMode === 'streets'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Bản đồ
        </button>
        <button
          type="button"
          onClick={() => handleLayerSwitch('satellite')}
          className={`rounded px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
            layerMode === 'satellite'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Vệ tinh
        </button>
      </div>

      {/* Bottom Right: Navigation & Zoom Stack (lifted to bottom-24 to prevent collision with floating widgets) */}
      <div className="absolute bottom-24 right-4 z-20 flex flex-col gap-2">
        <button
          type="button"
          onClick={onLocateMe}
          disabled={isLocating}
          aria-label="Vị trí của tôi"
          title="Vị trí của tôi"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-md transition-colors hover:bg-background hover:text-primary cursor-pointer disabled:opacity-50"
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <LocateFixed className="h-4 w-4 text-primary" />
          )}
        </button>

        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-md">
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Phóng to"
            title="Phóng to"
            className="flex h-8 w-9 items-center justify-center border-b border-border text-foreground hover:bg-muted cursor-pointer"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Thu nhỏ"
            title="Thu nhỏ"
            className="flex h-8 w-9 items-center justify-center text-foreground hover:bg-muted cursor-pointer"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bottom Left: GIS Provider Badge (Only when preview card is not active) */}
      {!activePopupWorkspace && (
        <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-1.5 rounded-lg border border-border/80 bg-card/90 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-xs backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span>{isGoongActive ? 'Goong Map' : 'Vietnam GIS'}</span>
          {userLocation && (
            <>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">GPS Đang bật</span>
            </>
          )}
        </div>
      )}

      {/* Floating Active Workspace Card Popup on Marker Select */}
      {activePopupWorkspace && (
        <div
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
            }
            hoverTimeoutRef.current = setTimeout(() => {
              setHoveredWsId(null);
            }, 80);
          }}
          className="absolute bottom-4 left-4 right-4 sm:left-4 sm:right-auto sm:w-[340px] z-30 rounded-2xl border border-border/80 bg-card/95 p-3 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex gap-3">
            {/* Thumbnail */}
            <div className="relative h-20 w-22 shrink-0 overflow-hidden rounded-xl bg-muted">
              <img
                src={
                  activePopupWorkspace.coverImageUrl && activePopupWorkspace.coverImageUrl.startsWith('http')
                    ? activePopupWorkspace.coverImageUrl
                    : 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=300&q=80'
                }
                alt=""
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=300&q=80';
                }}
                className="h-full w-full object-cover"
              />
              <div className="absolute top-1 left-1 flex items-center gap-0.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full backdrop-blur-xs">
                <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                <span>{(activePopupWorkspace.rating || 5.0).toFixed(1)}</span>
              </div>
            </div>

            {/* Info */}
            <div className="flex flex-1 flex-col justify-between min-w-0 pr-4">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-1 leading-tight">
                  {activePopupWorkspace.name}
                </h4>
                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                  {activePopupWorkspace.streetAddress || activePopupWorkspace.district || 'Đà Nẵng'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-primary">
                  {!activePopupWorkspace.pricePerHour || activePopupWorkspace.pricePerHour <= 0
                    ? 'Liên hệ'
                    : `${formatPrice(activePopupWorkspace.pricePerHour)}/giờ`}
                </span>
                <a
                  href={`/workspaces/${activePopupWorkspace.id}`}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                >
                  Chi tiết <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
              setHoveredWsId(null);
              setPinnedWsId(null);
              onWorkspaceSelect?.(null);
            }}
            className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer text-xs"
            title="Đóng"
            aria-label="Đóng"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
