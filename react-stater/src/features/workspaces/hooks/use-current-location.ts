import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface UseCurrentLocationResult {
  location: LocationCoordinates | null;
  isLoading: boolean;
  error: string | null;
  getCurrentLocation: () => Promise<LocationCoordinates>;
  clearLocation: () => void;
}

// Fallback landmark: District 1 Central Business District, Ho Chi Minh City
export const DEFAULT_FALLBACK_LOCATION: LocationCoordinates = {
  lat: 10.7769,
  lng: 106.7009
};

export function useCurrentLocation(): UseCurrentLocationResult {
  const [location, setLocation] = useState<LocationCoordinates | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = useCallback(async (): Promise<LocationCoordinates> => {
    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        const errMsg = 'Trình duyệt của bạn không hỗ trợ định vị GPS.';
        setError(errMsg);
        setIsLoading(false);
        toast.warning(errMsg, {
          description: 'Sử dụng vị trí trung tâm TP. Hồ Chí Minh làm mặc định.'
        });
        setLocation(DEFAULT_FALLBACK_LOCATION);
        resolve(DEFAULT_FALLBACK_LOCATION);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: LocationCoordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(coords);
          setIsLoading(false);
          setError(null);
          toast.success('Đã xác định vị trí của bạn thành công!', {
            description: `Tọa độ: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
          });
          resolve(coords);
        },
        (geoError) => {
          let errMsg = 'Không thể lấy được vị trí GPS của bạn.';
          if (geoError.code === geoError.PERMISSION_DENIED) {
            errMsg = 'Quyền truy cập vị trí bị từ chối.';
          } else if (geoError.code === geoError.TIMEOUT) {
            errMsg = 'Quá thời gian chờ lấy tín hiệu GPS.';
          }

          setError(errMsg);
          setIsLoading(false);
          toast.info(errMsg, {
            description: 'Đang dùng vị trí trung tâm Quận 1, TP.HCM để tìm kiếm không gian gần bạn.'
          });
          setLocation(DEFAULT_FALLBACK_LOCATION);
          resolve(DEFAULT_FALLBACK_LOCATION);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    location,
    isLoading,
    error,
    getCurrentLocation,
    clearLocation
  };
}

