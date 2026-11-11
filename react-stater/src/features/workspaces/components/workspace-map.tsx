import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import type * as MapLibreGL from 'maplibre-gl';
import {
  RefreshCw,
  LocateFixed,
  Plus,
  Minus,
  MapPin,
  Navigation,
  Star,
  ExternalLink,
  Loader2
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
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveActiveId = hoveredWsId ?? selectedWorkspaceId ?? null;
  const effectiveActiveIdRef = useRef(effectiveActiveId);
  useEffect(() => {
    effectiveActiveIdRef.current = effectiveActiveId;
  }, [effectiveActiveId]);

  const activePopupWorkspace = useMemo(() => {
    if (!effectiveActiveId) return null;
    return workspaces.find((w) => String(w.id) === String(effectiveActiveId)) ?? null;
  }, [effectiveActiveId, workspaces]);

  // Goong Map Keys
  const goongMaptilesKey = (import.meta.env.VITE_GOONG_MAPTILES_KEY as string | undefined)?.trim() || '';
  const isGoongActive = Boolean(goongMaptilesKey);

  // Capture initial coordinate center once on mount
  const initialCenterRef = useRef<[number, number]>(
    userLocation ? [userLocation.lng, userLocation.lat] : [106.7009, 10.7769]
  );

  const resolveStyle = useCallback((mode: 'streets' | 'satellite'): MapLibreGL.StyleSpecification | string => {
    if (mode === 'satellite') return FALLBACK_RASTER_SATELLITE_STYLE;
    if (isGoongActive && goongMaptilesKey) {
      return `https://tiles.goong.io/assets/goong_map_web.json?api_key=${encodeURIComponent(goongMaptilesKey)}`;
    }
    return FALLBACK_RASTER_STREET_STYLE;
  }, [isGoongActive, goongMaptilesKey]);

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

        if (!isMountedRef.current || !mapContainerRef.current) return;

        const initialStyle = resolveStyle('streets');

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
          setIsMapLoaded(true);
          map.resize();
        });

        map.on('error', () => {
          if (!map.isStyleLoaded() && isGoongActive) {
            try {
              map.setStyle(FALLBACK_RASTER_STREET_STYLE);
            } catch {
              // Ignore style fallback errors
            }
          }
        });

        mapInstanceRef.current = map;
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        const msg = err instanceof Error ? err.message : 'Không thể khởi tạo bản đồ Goong';
        setLoadError(msg);
      }
    }

    initMap();

    return () => {
      isMountedRef.current = false;
      const userMarker = userLocationMarkerRef.current;
      if (userMarker) {
        userMarker.remove();
        userLocationMarkerRef.current = null;
      }
      currentWorkspaceMarkers.forEach((marker) => marker.remove());
      currentWorkspaceMarkers.clear();
      const map = mapInstanceRef.current;
      if (map) {
        map.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isGoongActive, resolveStyle]);

  // Switch Layer Mode
  const handleLayerSwitch = (mode: 'streets' | 'satellite') => {
    setLayerMode(mode);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setStyle(resolveStyle(mode));
    }
  };

  // Zoom handlers
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn({ duration: 300 });
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut({ duration: 300 });
    }
  };

  // Fit bounds to all workspaces and user location
  const handleFitBounds = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    let hasPoints = false;

    if (userLocation) {
      minLng = Math.min(minLng, userLocation.lng);
      maxLng = Math.max(maxLng, userLocation.lng);
      minLat = Math.min(minLat, userLocation.lat);
      maxLat = Math.max(maxLat, userLocation.lat);
      hasPoints = true;
    }

    workspaces.forEach((w) => {
      const lat = typeof w.latitude === 'number' ? w.latitude : Number(w.latitude);
      const lng = typeof w.longitude === 'number' ? w.longitude : Number(w.longitude);
      if (!isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0)) {
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        hasPoints = true;
      }
    });

    if (!hasPoints) return;

    const diffLng = Math.abs(maxLng - minLng);
    const diffLat = Math.abs(maxLat - minLat);

    // If points collapse to a single point or narrow proximity (< 500 meters), use smooth flyTo with optimal close-up zoom (16.0)
    if (diffLng < 0.005 && diffLat < 0.005) {
      map.flyTo({
        center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
        zoom: 16.0,
        duration: 700
      });
    } else if (diffLng < 0.02 && diffLat < 0.02) {
      map.flyTo({
        center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
        zoom: 15.0,
        duration: 700
      });
    } else {
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat]
        ],
        { padding: 80, maxZoom: 15.5, duration: 800 }
      );
    }
  }, [userLocation, workspaces]);

  // Stable fingerprint of coordinates to trigger auto fitBounds only when dataset coordinates change
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
      inner.style.cssText = 'position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;';
      inner.innerHTML = `
        <div style="position: absolute; top: -26px; left: 50%; transform: translateX(-50%); background: #1E293B; color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; white-space: nowrap; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25); pointer-events: none; display: flex; align-items: center; gap: 4px; border: 1px solid rgba(255,255,255,0.2);">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #38BDF8; display: inline-block;"></span>
          <span>Vị trí của bạn</span>
        </div>
        <div style="position: absolute; width: 32px; height: 32px; border-radius: 9999px; background-color: rgba(37, 99, 235, 0.25); animation: ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 15px; height: 15px; border-radius: 9999px; background-color: #2563EB; border: 2.5px solid #FFFFFF; box-shadow: 0 3px 6px rgba(0,0,0,0.3);"></div>
      `;
      container.appendChild(inner);

      const marker = new maplibregl.Marker({ element: container, anchor: 'center' })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);

      userLocationMarkerRef.current = marker;
    } else {
      userLocationMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
    }
  }, [isMapLoaded, userLocation]);

  // Update Workspace Markers DOM elements
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
      const isFreeOrUnset = !ws.pricePerHour || ws.pricePerHour <= 0;
      const priceText = isFreeOrUnset ? 'Liên hệ' : `${formatPrice(ws.pricePerHour)}/h`;

      // Outer wrapper element given to MapLibre GL - MapLibre controls position and transform
      const container = document.createElement('div');
      container.className = `nexspace-workspace-marker-wrapper ${isSelected ? 'is-selected' : ''}`;
      container.dataset.wsId = wsIdStr;
      container.style.cssText = `cursor: pointer; user-select: none; pointer-events: auto; z-index: ${isSelected ? 50 : 10};`;

      // Inner card where WE control transform scale, background, colors, shadow, etc.
      const inner = document.createElement('div');
      inner.className = 'nexspace-workspace-marker-inner';
      inner.style.cssText = [
        'display: flex',
        'flex-direction: column',
        'align-items: center',
        'width: max-content',
        'filter: drop-shadow(0 4px 6px rgba(0,0,0,0.16))',
        'transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
        isSelected ? 'transform: scale(1.15);' : 'transform: scale(1);'
      ].join('; ');

      const bgColor = isSelected ? '#4F46E5' : '#FFFFFF';
      const textColor = isSelected ? '#FFFFFF' : '#0F172A';
      const borderColor = isSelected ? '#4338CA' : '#CBD5E1';
      const iconColor = isSelected ? '#FFFFFF' : '#4F46E5';
      const iconBg = isSelected ? 'rgba(255,255,255,0.2)' : '#EEF2FF';
      const shadowStyle = isSelected
        ? '0 10px 25px -3px rgba(79, 70, 229, 0.45)'
        : '0 4px 10px -1px rgba(0,0,0,0.12)';

      inner.innerHTML = `
        <div class="nexspace-marker-pill" style="
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 11px;
          border-radius: 9999px;
          font-size: 11px;
          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          white-space: nowrap;
          width: max-content;
          background-color: ${bgColor};
          color: ${textColor};
          border: 1.5px solid ${borderColor};
          box-shadow: ${shadowStyle};
          transition: background-color 0.18s ease, color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        ">
          <div class="nexspace-marker-icon-circle" style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            border-radius: 9999px;
            background-color: ${iconBg};
            flex-shrink: 0;
            transition: background-color 0.18s ease;
          ">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
              <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
              <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
              <path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
            </svg>
          </div>
          <span class="nexspace-marker-name" style="font-weight: 700; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ws.name || 'Workspace'}</span>
          <span style="opacity: 0.45; font-size: 10px;">•</span>
          <span class="nexspace-marker-price" style="font-weight: 600;">${priceText}</span>
        </div>
        <div class="nexspace-marker-arrow" style="
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 5px solid ${borderColor};
          margin-top: -1px;
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.12));
          transition: border-top-color 0.18s ease;
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
          setHoveredWsId((curr) => (curr === wsIdStr ? null : curr));
          onWorkspaceSelect?.(null);
        }, 120);
      });

      container.addEventListener('click', (e) => {
        e.stopPropagation();
        setHoveredWsId(wsIdStr);
        onWorkspaceSelect?.(wsIdStr);
        map.flyTo({ center: [lng, lat], zoom: 16, duration: 600 });
      });

      const marker = new maplibregl.Marker({ element: container, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(map);

      workspaceMarkersRef.current.set(wsIdStr, marker);
    });
  }, [isMapLoaded, workspaces, formatPrice, onWorkspaceSelect]);

  // Update marker highlight styles in-place without rebuilding DOM
  useEffect(() => {
    workspaceMarkersRef.current.forEach((marker, id) => {
      const container = marker.getElement();
      const isSelected = String(id) === String(effectiveActiveId);
      const inner = container.querySelector('.nexspace-workspace-marker-inner') as HTMLElement | null;
      const pill = container.querySelector('.nexspace-marker-pill') as HTMLElement | null;
      const arrow = container.querySelector('.nexspace-marker-arrow') as HTMLElement | null;
      const iconCircle = container.querySelector('.nexspace-marker-icon-circle') as HTMLElement | null;
      const icon = container.querySelector('svg') as SVGElement | null;

      if (inner) {
        inner.style.transform = isSelected ? 'scale(1.15)' : 'scale(1)';
      }
      if (pill) {
        pill.style.backgroundColor = isSelected ? '#4F46E5' : '#FFFFFF';
        pill.style.color = isSelected ? '#FFFFFF' : '#0F172A';
        pill.style.borderColor = isSelected ? '#4338CA' : '#CBD5E1';
        pill.style.boxShadow = isSelected
          ? '0 10px 25px -3px rgba(79, 70, 229, 0.45)'
          : '0 4px 10px -1px rgba(0,0,0,0.12)';
      }
      if (iconCircle) {
        iconCircle.style.backgroundColor = isSelected ? 'rgba(255,255,255,0.2)' : '#EEF2FF';
      }
      if (arrow) {
        arrow.style.borderTopColor = isSelected ? '#4338CA' : '#CBD5E1';
      }
      if (icon) {
        icon.setAttribute('stroke', isSelected ? '#FFFFFF' : '#4F46E5');
      }
      container.style.zIndex = isSelected ? '50' : '10';
    });
  }, [effectiveActiveId]);

  // Handle selectedWorkspaceId animation from outside (hovering list item)
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedWorkspaceId) return;
    const targetWs = workspaces.find((w) => String(w.id) === String(selectedWorkspaceId));
    if (targetWs) {
      const lat = typeof targetWs.latitude === 'number' ? targetWs.latitude : Number(targetWs.latitude);
      const lng = typeof targetWs.longitude === 'number' ? targetWs.longitude : Number(targetWs.longitude);
      if (!isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0)) {
        mapInstanceRef.current.easeTo({
          center: [lng, lat],
          duration: 400
        });
      }
    }
  }, [selectedWorkspaceId, workspaces]);

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
    <section
      className="hidden h-full w-1/2 relative overflow-hidden border-l border-border bg-[#F8FAFC] lg:block"
      data-location="Goong Map Interactive Canvas"
    >
      {/* MapLibre Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />

      {/* Floating Search This Area / Fit All Pill */}
      <div className="absolute left-1/2 top-5 z-20 -translate-x-1/2">
        <button
          onClick={handleFitBounds}
          className="flex items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 text-xs font-semibold text-foreground shadow-sm backdrop-blur-md transition-all hover:border-[#4b41e1] hover:bg-card cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5 text-[#4b41e1]" />
          <span>Bao quát khu vực này ({workspaces.length})</span>
        </button>
      </div>

      {/* Top Right: Layer Switcher */}
      <div className="absolute right-5 top-5 z-20 flex overflow-hidden rounded-lg border border-border bg-card p-0.5 shadow-sm">
        <button
          onClick={() => handleLayerSwitch('streets')}
          className={`rounded px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            layerMode === 'streets'
              ? 'bg-[#4b41e1] text-white shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Bản đồ
        </button>
        <button
          onClick={() => handleLayerSwitch('satellite')}
          className={`rounded px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            layerMode === 'satellite'
              ? 'bg-[#4b41e1] text-white shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Vệ tinh
        </button>
      </div>

      {/* Bottom Right: Navigation & Zoom Stack */}
      <div className="absolute bottom-6 right-5 z-20 flex flex-col gap-2">
        <button
          onClick={onLocateMe}
          disabled={isLocating}
          aria-label="Vị trí của tôi"
          title="Vị trí của tôi"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-md transition-colors hover:bg-background hover:text-[#4b41e1] cursor-pointer disabled:opacity-50"
        >
          {isLocating ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <LocateFixed className="h-5 w-5 text-[#4b41e1]" />
          )}
        </button>

        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-md">
          <button
            onClick={handleZoomIn}
            aria-label="Phóng to"
            title="Phóng to"
            className="flex h-9 w-10 items-center justify-center border-b border-border text-foreground hover:bg-muted cursor-pointer"
          >
            <Plus className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={handleZoomOut}
            aria-label="Thu nhỏ"
            title="Thu nhỏ"
            className="flex h-9 w-10 items-center justify-center text-foreground hover:bg-muted cursor-pointer"
          >
            <Minus className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* Bottom Left: Map Legend & GIS Telemetry */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 rounded-lg border border-border bg-card/95 px-3.5 py-2 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground">
          <span className="h-2 w-2 rounded-full bg-[#4b41e1] animate-pulse" />
          <span>{isGoongActive ? 'Goong Map' : 'Vietnam GIS'}</span>
        </div>
        {userLocation && (
          <>
            <span className="hidden sm:inline text-[11px] text-muted-foreground/70">•</span>
            <div className="flex items-center gap-1 text-[11px] text-primary font-semibold">
              <Navigation className="h-3 w-3" />
              <span>Định vị GPS đang bật</span>
            </div>
          </>
        )}
      </div>

      {/* Floating Active Workspace Card Popup on Hover / Click */}
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
              onWorkspaceSelect?.(null);
            }, 80);
          }}
          className="absolute top-16 left-6 z-30 w-72 rounded-xl border border-border bg-card p-3 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="relative h-28 w-full overflow-hidden rounded-lg bg-muted mb-2">
            <img
              src={
                activePopupWorkspace.coverImageUrl ||
                'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80'
              }
              alt={activePopupWorkspace.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              <span>{activePopupWorkspace.rating || 5.0}</span>
            </div>
            {activePopupWorkspace.distanceKm !== undefined && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                <MapPin className="h-2.5 w-2.5" />
                <span>
                  {activePopupWorkspace.distanceKm < 1
                    ? `${Math.round(activePopupWorkspace.distanceKm * 1000)} m`
                    : `${activePopupWorkspace.distanceKm.toFixed(1)} km`}
                </span>
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                setHoveredWsId(null);
                onWorkspaceSelect?.(null);
              }}
              className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 cursor-pointer text-xs"
              title="Đóng xem nhanh"
              aria-label="Đóng xem nhanh"
            >
              ✕
            </button>
          </div>
          <h4 className="text-xs font-bold text-foreground line-clamp-1">{activePopupWorkspace.name}</h4>
          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
            {activePopupWorkspace.streetAddress}, {activePopupWorkspace.district}
          </p>
          <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
            <span className="text-xs font-bold text-primary">
              {!activePopupWorkspace.pricePerHour || activePopupWorkspace.pricePerHour <= 0
                ? 'Liên hệ báo giá'
                : `${formatPrice(activePopupWorkspace.pricePerHour)}/hr`}
            </span>
            <a
              href={`/workspaces/${activePopupWorkspace.id}`}
              className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              Chi tiết <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
