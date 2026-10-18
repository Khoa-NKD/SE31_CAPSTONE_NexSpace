import React, { useState, useEffect, useRef } from 'react';
import type * as MapLibreGL from 'maplibre-gl';
import {
  Search,
  Plus,
  Minus,
  Compass,
  Navigation,
  MapPin,
  Globe,
  Loader2,
  X,
  LocateFixed,
  Building2,
  MapPinned,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { searchLandmarks } from '../data/vietnam-locations';

interface RealInteractiveMapProps {
  venueName: string;
  streetAddress: string;
  latitude: number;
  longitude: number;
  onCoordinatesChange: (lat: number, lng: number) => void;
  onAddressSelect?: (address: {
    street?: string;
    ward?: string;
    city?: string;
    formattedAddress?: string;
  }) => void;
}

type MapLayerType = 'map' | 'satellite';

interface SearchSuggestion {
  id: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  placeId?: string;
  type: 'building' | 'street' | 'place';
  source: 'goong' | 'photon' | 'landmark';
}

// Fallback high-resolution raster styles for MapLibre GL (used when Goong Key is not configured)
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

function resolveMapStyle(
  layer: MapLayerType,
  isGoongActive: boolean,
  goongKey: string
): MapLibreGL.StyleSpecification | string {
  if (layer === 'satellite') {
    return FALLBACK_RASTER_SATELLITE_STYLE;
  }
  if (isGoongActive && goongKey) {
    return `https://tiles.goong.io/assets/goong_map_web.json?api_key=${encodeURIComponent(goongKey)}`;
  }
  return FALLBACK_RASTER_STREET_STYLE;
}



function buildMarkerElement(name: string, address: string) {
  const container = document.createElement('div');
  container.className = 'nexspace-maplibre-marker';
  container.style.cssText = 'position: relative; display: flex; flex-direction: column; align-items: center; pointer-events: auto; cursor: grab; user-select: none;';

  container.innerHTML = `
    <div style="margin-bottom: 6px; background-color: #0F172A; color: #FFFFFF; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; font-family: 'DM Sans', sans-serif; white-space: nowrap; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25); border: 1px solid #334155; display: flex; align-items: center; gap: 6px; pointer-events: none;">
      <span style="display: inline-block; width: 6px; height: 6px; border-radius: 9999px; background-color: #10B981;"></span>
      <span class="marker-venue-name">${name || 'NexSpace Venue Hub'}</span>
      <span class="marker-venue-address" style="color: #94A3B8; font-size: 10px; font-weight: normal; margin-left: 2px;">${address || 'Vietnam Location'}</span>
    </div>
    <div style="position: relative; width: 36px; height: 36px; border-radius: 9999px; background-color: #4F46E5; border: 2.5px solid #FFFFFF; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4); display: flex; align-items: center; justify-content: center; color: #FFFFFF; pointer-events: none;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
      <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 7px solid #4F46E5;"></div>
    </div>
    <div style="width: 20px; height: 4px; background-color: rgba(15, 23, 42, 0.35); border-radius: 9999px; filter: blur(1px); margin-top: 4px; pointer-events: none;"></div>
  `;

  return container;
}

export function RealInteractiveMap({
  venueName,
  streetAddress,
  latitude,
  longitude,
  onCoordinatesChange,
  onAddressSelect
}: RealInteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreGL.Map | null>(null);
  const markerInstanceRef = useRef<MapLibreGL.Marker | null>(null);
  const mapLibreModuleRef = useRef<typeof MapLibreGL | null>(null);

  const onCoordinatesChangeRef = useRef(onCoordinatesChange);
  const onAddressSelectRef = useRef(onAddressSelect);
  const initialCoordsRef = useRef({ lat: latitude, lng: longitude });
  const venueNameRef = useRef(venueName);
  const streetAddressRef = useRef(streetAddress);

  // Goong Map Keys from environment
  const goongMaptilesKey = (import.meta.env.VITE_GOONG_MAPTILES_KEY as string | undefined)?.trim() || '';
  const goongApiKey = (import.meta.env.VITE_GOONG_API_KEY as string | undefined)?.trim() || '';
  const isGoongTilesActive = Boolean(goongMaptilesKey);
  const isGoongApiActive = Boolean(goongApiKey);

  useEffect(() => {
    onCoordinatesChangeRef.current = onCoordinatesChange;
  }, [onCoordinatesChange]);

  useEffect(() => {
    onAddressSelectRef.current = onAddressSelect;
  }, [onAddressSelect]);

  useEffect(() => {
    venueNameRef.current = venueName;
    if (markerInstanceRef.current) {
      const el = markerInstanceRef.current.getElement();
      const nameEl = el.querySelector('.marker-venue-name');
      if (nameEl) nameEl.textContent = venueName || 'NexSpace Venue Hub';
    }
  }, [venueName]);

  useEffect(() => {
    streetAddressRef.current = streetAddress;
    if (markerInstanceRef.current) {
      const el = markerInstanceRef.current.getElement();
      const addrEl = el.querySelector('.marker-venue-address');
      if (addrEl) addrEl.textContent = streetAddress || 'Vietnam Location';
    }
  }, [streetAddress]);

  const [activeLayer, setActiveLayer] = useState<MapLayerType>('map');
  const [mapSearch, setMapSearch] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Google Maps-like Autocomplete Suggestions State
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Initialize MapLibre GL map on client mount
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      try {
        const maplibregl = await import(/* @vite-ignore */ 'maplibre-gl');
        await import(/* @vite-ignore */ 'maplibre-gl/dist/maplibre-gl.css');
        mapLibreModuleRef.current = maplibregl;

        try {
          const workerUrl = (await import(/* @vite-ignore */ 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url')).default;
          if (workerUrl) {
            maplibregl.setWorkerUrl(workerUrl);
          }
        } catch {
          maplibregl.setWorkerUrl('https://unpkg.com/maplibre-gl@6.14.0/dist/maplibre-gl-worker.js');
        }

        if (!isMounted || !mapContainerRef.current) return;

        const { lat: initLat, lng: initLng } = initialCoordsRef.current;
        const initialStyle = resolveMapStyle('map', isGoongTilesActive, goongMaptilesKey);

        // Initialize MapLibre Map with street-level zoom (16)
        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: initialStyle,
          center: [initLng, initLat],
          zoom: 16,
          minZoom: 5,
          maxZoom: 19,
          attributionControl: false
        });

        map.on('load', () => {
          if (!isMounted) return;
          setIsLoaded(true);
        });

        // Click map to reposition marker
        map.on('click', (e: { lngLat: { lng: number; lat: number } }) => {
          const { lng, lat } = e.lngLat;
          const roundedLat = Number(lat.toFixed(4));
          const roundedLng = Number(lng.toFixed(4));

          if (markerInstanceRef.current) {
            markerInstanceRef.current.setLngLat([roundedLng, roundedLat]);
          }
          onCoordinatesChangeRef.current(roundedLat, roundedLng);
        });

        // Create Custom Draggable Marker
        const markerEl = buildMarkerElement(venueNameRef.current, streetAddressRef.current);
        const marker = new maplibregl.Marker({
          element: markerEl,
          draggable: true,
          anchor: 'bottom'
        })
          .setLngLat([initLng, initLat])
          .addTo(map);

        marker.on('drag', () => {
          const lngLat = marker.getLngLat();
          onCoordinatesChangeRef.current(
            Number(lngLat.lat.toFixed(4)),
            Number(lngLat.lng.toFixed(4))
          );
        });

        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          onCoordinatesChangeRef.current(
            Number(lngLat.lat.toFixed(4)),
            Number(lngLat.lng.toFixed(4))
          );
        });

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;
      } catch (err) {
        console.error('Failed to initialize MapLibre / Goong map:', err);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerInstanceRef.current = null;
    };
  }, [isGoongTilesActive, goongMaptilesKey]);

  // Synchronize external coordinate changes to marker position
  useEffect(() => {
    if (!markerInstanceRef.current || !mapInstanceRef.current) return;
    const currentLngLat = markerInstanceRef.current.getLngLat();
    const diffLat = Math.abs(currentLngLat.lat - latitude);
    const diffLng = Math.abs(currentLngLat.lng - longitude);

    if (diffLat > 0.0001 || diffLng > 0.0001) {
      markerInstanceRef.current.setLngLat([longitude, latitude]);
    }
  }, [latitude, longitude]);

  // Switch Layer (Street vs Satellite)
  const handleLayerChange = (layer: MapLayerType) => {
    if (!mapInstanceRef.current || layer === activeLayer) return;
    setActiveLayer(layer);
    const nextStyle = resolveMapStyle(layer, isGoongTilesActive, goongMaptilesKey);
    mapInstanceRef.current.setStyle(nextStyle);
  };

  // Zoom In
  const handleZoomIn = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.zoomIn({ duration: 300 });
  };

  // Zoom Out
  const handleZoomOut = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.zoomOut({ duration: 300 });
  };

  // Recenter to Current Venue Pin
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo({
      center: [longitude, latitude],
      zoom: 17,
      essential: true
    });
    toast.info('Đã căn giữa vị trí ghim của mặt bằng');
  };

  // Panoramic National Overview of Vietnam
  const handleOverviewVietnam = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo({
      center: [106.5, 16.0],
      zoom: 5.5,
      pitch: 0,
      bearing: 0,
      essential: true
    });
    toast.success('Toàn cảnh lãnh thổ Việt Nam', {
      description: 'Lãnh thổ toàn vẹn bao gồm đất liền, vùng biển và các quần đảo Hoàng Sa, Trường Sa.'
    });
  };

  // Reset North Orientation
  const handleResetOrientation = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.resetNorthPitch({ duration: 500 });
    toast.info('Đã đặt lại hướng Bắc chuẩn');
  };

  // Locate Current GPS Location Feature
  const handleLocateCurrentPosition = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ định vị GPS');
      return;
    }

    setIsLocating(true);
    toast.info('Đang xác định tọa độ GPS của bạn...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const userLat = Number(pos.coords.latitude.toFixed(4));
        const userLng = Number(pos.coords.longitude.toFixed(4));

        if (mapInstanceRef.current && markerInstanceRef.current) {
          mapInstanceRef.current.flyTo({
            center: [userLng, userLat],
            zoom: 17,
            essential: true
          });
          markerInstanceRef.current.setLngLat([userLng, userLat]);
          onCoordinatesChangeRef.current(userLat, userLng);
          toast.success('Đã xác định vị trí hiện tại của bạn', {
            description: `${userLat}° N, ${userLng}° E (Độ chính xác: ±${Math.round(pos.coords.accuracy)}m)`
          });
        }
      },
      (err) => {
        setIsLocating(false);
        let desc = 'Không thể xác định vị trí hiện tại.';
        if (err.code === err.PERMISSION_DENIED) {
          desc = 'Bạn đã từ chối cấp quyền truy cập vị trí cho trình duyệt.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          desc = 'Tín hiệu GPS/Vị trí hiện không khả dụng.';
        } else if (err.code === err.TIMEOUT) {
          desc = 'Quá thời gian yêu cầu định vị GPS.';
        }
        toast.error('Định vị thất bại', { description: desc });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Autocomplete search: Goong Places API (if key present) OR Photon Vietnam API + Landmark Atlas
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setMapSearch(query);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!query.trim()) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      return;
    }

    setIsSearching(true);
    setIsDropdownOpen(true);

    searchDebounceRef.current = setTimeout(async () => {
      const trimmed = query.trim();
      const results: SearchSuggestion[] = [];
      const seenNames = new Set<string>();

      try {
        // Priority 1: If Goong REST API Key is configured, use official Goong Autocomplete V2 API
        if (isGoongApiActive) {
          const goongUrl = `https://rsapi.goong.io/v2/place/autocomplete?api_key=${encodeURIComponent(
            goongApiKey
          )}&input=${encodeURIComponent(trimmed)}&location=${latitude},${longitude}&limit=6`;

          const res = await fetch(goongUrl);
          const data = await res.json();

          if (data && data.status === 'OK' && Array.isArray(data.predictions)) {
            data.predictions.forEach((p: {
              place_id: string;
              description: string;
              structured_formatting?: { main_text?: string; secondary_text?: string };
              types?: string[];
            }) => {
              const title = p.structured_formatting?.main_text || p.description;
              const subtitle = p.structured_formatting?.secondary_text || p.description;
              const isBuilding = p.types?.includes('establishment') || p.types?.includes('premise');

              results.push({
                id: `goong-${p.place_id}`,
                title,
                subtitle,
                lat: 0, // will be resolved via Place/Detail on selection
                lng: 0,
                placeId: p.place_id,
                type: isBuilding ? 'building' : 'street',
                source: 'goong'
              });
            });
          }
        } else {
          // Priority 2: High-priority local landmark matches
          const localMatches = searchLandmarks(trimmed, 3);
          localMatches.forEach((lm) => {
            seenNames.add(lm.name.toLowerCase());
            results.push({
              id: `landmark-${lm.name}`,
              title: lm.name,
              subtitle: `${lm.address}, ${lm.city}`,
              lat: lm.lat,
              lng: lm.lng,
              type: 'building',
              source: 'landmark'
            });
          });

          // Priority 3: Photon Vietnam Geocoding API
          const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
            trimmed
          )}&limit=6&lat=${latitude}&lon=${longitude}`;
          const res = await fetch(photonUrl);
          const data = await res.json();

          if (data && Array.isArray(data.features)) {
            data.features.forEach((feature: {
              geometry: { coordinates: [number, number] };
              properties: {
                name?: string;
                street?: string;
                housenumber?: string;
                district?: string;
                city?: string;
                country?: string;
                countrycode?: string;
                osm_key?: string;
                type?: string;
              };
            }) => {
              const props = feature.properties;
              if (props.countrycode && props.countrycode.toUpperCase() !== 'VN') return;

              const name = props.name || props.street || '';
              if (!name) return;

              const nameKey = name.toLowerCase();
              if (seenNames.has(nameKey)) return;
              seenNames.add(nameKey);

              const addressParts = [
                props.housenumber ? `Số ${props.housenumber}` : null,
                props.street && props.street !== name ? props.street : null,
                props.district,
                props.city,
                'Việt Nam'
              ].filter(Boolean);

              const subtitle = addressParts.join(', ');
              const [lng, lat] = feature.geometry.coordinates;

              const isBuilding =
                props.osm_key === 'building' ||
                props.osm_key === 'amenity' ||
                props.type === 'house';
              const isStreet = props.osm_key === 'highway' || props.type === 'street';

              results.push({
                id: `photon-${lat}-${lng}-${name}`,
                title: name,
                subtitle: subtitle || 'Địa điểm tại Việt Nam',
                lat: Number(lat.toFixed(4)),
                lng: Number(lng.toFixed(4)),
                type: isBuilding ? 'building' : isStreet ? 'street' : 'place',
                source: 'photon'
              });
            });
          }
        }
      } catch (err) {
        console.error('Error fetching address suggestions:', err);
      } finally {
        setSuggestions(results);
        setIsSearching(false);
      }
    }, 280);
  };

  // Select suggestion from dropdown
  const handleSelectSuggestion = async (item: SearchSuggestion) => {
    setIsDropdownOpen(false);
    setMapSearch(item.title);

    let targetLat = item.lat;
    let targetLng = item.lng;
    let selectedStreet = item.title;

    // If source is Goong with placeId, fetch exact coordinates and detail
    if (item.source === 'goong' && item.placeId && isGoongApiActive) {
      try {
        const detailUrl = `https://rsapi.goong.io/Place/Detail?place_id=${encodeURIComponent(
          item.placeId
        )}&api_key=${encodeURIComponent(goongApiKey)}`;
        const res = await fetch(detailUrl);
        const data = await res.json();

        if (data && data.status === 'OK' && data.result?.geometry?.location) {
          targetLat = Number(data.result.geometry.location.lat.toFixed(4));
          targetLng = Number(data.result.geometry.location.lng.toFixed(4));
          selectedStreet = data.result.name || item.title;

          if (onAddressSelectRef.current) {
            onAddressSelectRef.current({
              street: selectedStreet,
              ward: data.result.compound?.commune,
              city: data.result.compound?.province,
              formattedAddress: data.result.formatted_address
            });
          }
        }
      } catch (err) {
        console.error('Error fetching Goong place detail:', err);
      }
    } else if (onAddressSelectRef.current) {
      onAddressSelectRef.current({
        street: selectedStreet,
        formattedAddress: `${item.title}, ${item.subtitle}`
      });
    }

    if (mapInstanceRef.current && markerInstanceRef.current && targetLat && targetLng) {
      mapInstanceRef.current.flyTo({
        center: [targetLng, targetLat],
        zoom: 17,
        essential: true
      });
      markerInstanceRef.current.setLngLat([targetLng, targetLat]);
      onCoordinatesChangeRef.current(targetLat, targetLng);

      toast.success(`Đã định vị "${item.title}"`, {
        description: item.subtitle
      });
    }
  };

  // Handle Search Form Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0]);
    } else if (mapSearch.trim()) {
      toast.info(`Đang tìm "${mapSearch}"`, {
        description: 'Vui lòng chọn từ danh sách gợi ý hoặc kéo ghim trực tiếp trên bản đồ.'
      });
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle container resizing
  useEffect(() => {
    if (!mapInstanceRef.current || !mapContainerRef.current) return;
    const map = mapInstanceRef.current;
    const container = mapContainerRef.current;

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className='relative w-full h-full rounded-xl border border-border overflow-hidden bg-card shadow-2xs flex flex-col select-none min-h-[500px]'>
      {/* Map Subheader Toolbar */}
      <div className='flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card/95 backdrop-blur z-20 shrink-0'>
        {/* Google Maps-style Search Bar with Dropdown */}
        <div ref={searchContainerRef} className='relative w-full sm:w-80 md:w-96'>
          <form onSubmit={handleSearchSubmit} className='relative'>
            <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none' />
            <Input
              value={mapSearch}
              onChange={handleSearchInputChange}
              onFocus={() => {
                if (suggestions.length > 0) setIsDropdownOpen(true);
              }}
              placeholder='Tìm kiếm địa chỉ, tòa nhà, đường phố...'
              className='h-9 pl-8 pr-16 text-xs sm:text-sm bg-muted/60 focus:bg-background transition-colors'
              aria-label='Tìm kiếm địa chỉ hoặc tòa nhà'
            />
            <div className='absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground'>
              {isSearching && <Loader2 className='size-3.5 animate-spin text-indigo-600' />}
              {mapSearch && (
                <button
                  type='button'
                  onClick={() => {
                    setMapSearch('');
                    setSuggestions([]);
                    setIsDropdownOpen(false);
                  }}
                  className='p-1 hover:text-foreground transition-colors'
                  title='Xóa tìm kiếm'
                >
                  <X className='size-3.5' />
                </button>
              )}
            </div>
          </form>

          {/* Autocomplete Suggestions Dropdown Menu */}
          {isDropdownOpen && suggestions.length > 0 && (
            <div className='absolute top-full left-0 right-0 mt-1.5 bg-card/98 backdrop-blur-md border border-border rounded-xl shadow-2xl z-50 overflow-hidden text-xs max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-1'>
              <div className='px-3 py-1.5 bg-muted/60 border-b border-border/80 flex items-center justify-between text-[11px] text-muted-foreground font-medium'>
                <span className='flex items-center gap-1.5'>
                  <MapPinned className='size-3 text-indigo-600' />
                  <span>
                    {isGoongApiActive ? 'GỢI Ý TỪ GOONG MAP' : 'GỢI Ý ĐỊA CHỈ & ĐỊA DANH'}
                  </span>
                </span>
                <span className='font-mono text-indigo-600 dark:text-indigo-400'>{suggestions.length} kết quả</span>
              </div>
              <ul className='divide-y divide-border/40'>
                {suggestions.map((item) => (
                  <li key={item.id}>
                    <button
                      type='button'
                      onClick={() => handleSelectSuggestion(item)}
                      className='w-full text-left px-3 py-2.5 hover:bg-muted/80 transition-colors flex items-start gap-3 group cursor-pointer'
                    >
                      <div className='size-6 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform'>
                        {item.type === 'building' ? (
                          <Building2 className='size-3.5' />
                        ) : (
                          <MapPin className='size-3.5' />
                        )}
                      </div>
                      <div className='min-w-0 flex-1'>
                        <p className='font-semibold text-foreground text-xs sm:text-[13px] truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors'>
                          {item.title}
                        </p>
                        <p className='text-[11px] text-muted-foreground truncate mt-0.5'>{item.subtitle}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Map Layer Toggle (Đường phố vs Vệ tinh) & Provider Badge */}
        <div className='flex items-center gap-2'>
          {isGoongTilesActive && (
            <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 text-[11px] font-medium'>
              <CheckCircle2 className='size-3 text-emerald-600' />
              <span>Goong Map Active</span>
            </span>
          )}
          <div className='inline-flex rounded-lg bg-muted p-1 border border-border text-xs font-medium'>
            <button
              type='button'
              onClick={() => handleLayerChange('map')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeLayer === 'map'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isGoongTilesActive ? 'Bản đồ Goong' : 'Bản đồ đường phố'}
            </button>
            <button
              type='button'
              onClick={() => handleLayerChange('satellite')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeLayer === 'satellite'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Vệ tinh
            </button>
          </div>
        </div>
      </div>

      {/* Real Map Canvas Container (Full-Bleed Main Viewport - No bottom status line) */}
      <div className='relative flex-1 w-full min-h-[460px] overflow-hidden'>
        <div ref={mapContainerRef} className='absolute inset-0 size-full z-10' />

        {/* Loading Spinner Skeleton */}
        {!isLoaded && (
          <div className='absolute inset-0 bg-muted/40 backdrop-blur-xs flex items-center justify-center z-15'>
            <div className='flex items-center gap-2.5 px-4 py-2 rounded-lg bg-card border border-border shadow-md text-xs font-medium text-foreground'>
              <div className='size-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin' />
              <span>Đang tải bản đồ tương tác...</span>
            </div>
          </div>
        )}

        {/* Floating Map Controls: Top-Right Zoom, Reset North & GPS Locate */}
        <div className='absolute top-3 right-3 z-20 flex flex-col gap-1.5'>
          <div className='bg-card rounded-lg shadow-sm border border-border flex flex-col overflow-hidden'>
            <Button
              variant='ghost'
              size='icon'
              onClick={handleZoomIn}
              className='size-8 rounded-none border-b border-border'
              title='Phóng to (Zoom in)'
            >
              <Plus className='size-4' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              onClick={handleZoomOut}
              className='size-8 rounded-none'
              title='Thu nhỏ (Zoom out)'
            >
              <Minus className='size-4' />
            </Button>
          </div>

          {/* GPS Locate Me Button */}
          <Button
            variant='outline'
            size='icon'
            onClick={handleLocateCurrentPosition}
            disabled={isLocating}
            className={`size-8 bg-card shadow-sm border border-border transition-colors ${
              isLocating
                ? 'text-indigo-600 animate-pulse'
                : 'text-blue-600 dark:text-blue-400 hover:text-blue-700'
            }`}
            title='Định vị vị trí hiện tại của tôi (GPS)'
          >
            {isLocating ? (
              <Loader2 className='size-4 animate-spin text-indigo-600' />
            ) : (
              <LocateFixed className='size-4' />
            )}
          </Button>

          {/* Compass / Reset North */}
          <Button
            variant='outline'
            size='icon'
            onClick={handleResetOrientation}
            className='size-8 bg-card shadow-sm border border-border text-indigo-600 dark:text-indigo-400'
            title='Đặt lại hướng Bắc chuẩn'
          >
            <Compass className='size-4' />
          </Button>
        </div>

        {/* Floating Map Controls: Bottom-Left Quick Action Buttons */}
        <div className='absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-2'>
          {/* GPS Current Location Quick Button */}
          <Button
            variant='outline'
            size='sm'
            onClick={handleLocateCurrentPosition}
            disabled={isLocating}
            className='h-8 bg-card/95 backdrop-blur shadow-sm border border-border text-xs font-medium gap-1.5 hover:bg-card text-foreground px-2.5'
            title='Định vị vị trí hiện tại của bạn qua GPS'
          >
            {isLocating ? (
              <Loader2 className='size-3.5 animate-spin text-blue-600' />
            ) : (
              <LocateFixed className='size-3.5 text-blue-600 dark:text-blue-400' />
            )}
            <span>Vị trí của tôi</span>
          </Button>

          {/* Recenter Venue Pin Button */}
          <Button
            variant='outline'
            size='sm'
            onClick={handleRecenter}
            className='h-8 bg-card/95 backdrop-blur shadow-sm border border-border text-xs font-medium gap-1.5 hover:bg-card text-foreground px-2.5'
            title='Quay lại vị trí ghim của mặt bằng'
          >
            <Navigation className='size-3 text-indigo-600 dark:text-indigo-400 fill-indigo-600/20' />
            <span>Vị trí ghim</span>
          </Button>

          {/* Panoramic Vietnam Overview Button */}
          <Button
            variant='outline'
            size='sm'
            onClick={handleOverviewVietnam}
            className='h-8 bg-card/95 backdrop-blur shadow-sm border border-border text-xs font-medium gap-1.5 hover:bg-card text-foreground px-2.5'
            title='Xem toàn cảnh lãnh thổ Việt Nam'
          >
            <Globe className='size-3.5 text-emerald-600 dark:text-emerald-400' />
            <span>Toàn cảnh VN</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
