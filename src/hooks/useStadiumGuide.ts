import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Stadium, Place, CategoryType } from '../types/stadium';
import {
  loadKakaoMapScript,
  searchNearbyPlaces,
  updateMapMarkers,
  type KakaoMapLoadFailureReason,
} from '../utils/kakaoMap';
import { useKakaoMap } from './useKakaoMap';
import {
  AsyncStatus,
  hasValidCoordinates,
  sanitizeStadiumGuideErrorMessage,
} from '../utils/stadiumGuideUtils';
import {
  getStadiumGuidePlacesQueryOptions,
  getStadiumGuideStadiumsQueryOptions,
  isStadiumGuideDbCategory,
} from './stadiumGuideQueryOptions';
import { isUnknownRouteStadium, resolveSelectedStadium } from './stadiumGuideSelection';

const EMPTY_STADIUMS: Stadium[] = [];

export const useStadiumGuide = () => {
  const navigate = useNavigate();
  const params = useParams<{ stadiumId?: string }>();
  const routeStadiumId = params.stadiumId?.trim() || null;
  const [selectedStadium, setSelectedStadium] = useState<Stadium | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('food');
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [nearbyStatus, setNearbyStatus] = useState<AsyncStatus>('idle');
  const [mapStatus, setMapStatus] = useState<AsyncStatus>('idle');
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapFailureReason, setMapFailureReason] = useState<KakaoMapLoadFailureReason | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const stadiumsQuery = useQuery(getStadiumGuideStadiumsQueryOptions());
  const stadiums = stadiumsQuery.data ?? EMPTY_STADIUMS;
  const stadiumId = selectedStadium?.stadiumId ?? '';
  const isDbCategory = isStadiumGuideDbCategory(selectedCategory);
  const placesQuery = useQuery(getStadiumGuidePlacesQueryOptions(stadiumId, selectedCategory));

  const {
    mapContainer,
    map,
    markersRef,
    infowindowsRef,
    clearMarkers,
    initializeMap,
  } = useKakaoMap(selectedStadium);

  const loadMapSdk = useCallback(() => {
    setMapStatus('loading');
    setMapError(null);
    setIsMapReady(false);

    loadKakaoMapScript(
      () => {
        setIsMapReady(true);
        setMapStatus('success');
        setMapFailureReason(null);
      },
      (message, reason) => {
        setMapStatus('error');
        setMapFailureReason(reason ?? 'unavailable');
        setMapError(sanitizeStadiumGuideErrorMessage(
          message,
          '지도를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.',
        ));
      }
    );
  }, []);

  // Kakao 기반 카테고리(store/parking) 주변 검색: 지도 준비 완료 시에만 실행
  const loadNearbyPlaces = useCallback(() => {
    if (!selectedStadium || (selectedCategory !== 'store' && selectedCategory !== 'parking')) {
      return;
    }

    setSelectedPlace(null);
    clearMarkers();

    if (!isMapReady || !map) {
      setPlaces([]);
      setNearbyStatus(mapStatus === 'loading' ? 'loading' : 'error');
      setNearbyError(mapStatus === 'loading' ? null : '지도가 준비되지 않아 주변 검색을 수행할 수 없습니다.');
      return;
    }

    if (!hasValidCoordinates(selectedStadium.lat, selectedStadium.lng)) {
      setPlaces([]);
      setNearbyStatus('error');
      setNearbyError('구장 좌표 정보가 없어 주변 검색을 수행할 수 없습니다.');
      return;
    }

    setNearbyStatus('loading');
    setNearbyError(null);

    searchNearbyPlaces(
      selectedCategory === 'store' ? '편의점' : '주차장',
      selectedCategory,
      selectedStadium,
      map,
      (data) => {
        setPlaces(data);
        setNearbyStatus(data.length > 0 ? 'success' : 'empty');
      },
      (errorMessage) => {
        console.error('주변 시설 검색 실패:', errorMessage);
        setPlaces([]);
        setNearbyStatus('error');
        setNearbyError(`주변 ${selectedCategory === 'store' ? '편의점' : '주차장'} 검색에 실패했습니다.`);
      }
    );
  }, [selectedStadium, selectedCategory, isMapReady, map, mapStatus, clearMarkers]);

  // ========== 카카오맵 스크립트 로드 + 구장 목록 (병렬) ==========
  useEffect(() => {
    loadMapSdk();
  }, [loadMapSdk]);

  // 오프라인이라 실패했다면 연결이 돌아왔을 때 한 번 더 불러옵니다.
  useEffect(() => {
    if (mapFailureReason !== 'offline') return undefined;

    window.addEventListener('online', loadMapSdk);
    return () => window.removeEventListener('online', loadMapSdk);
  }, [mapFailureReason, loadMapSdk]);

  useEffect(() => {
    if (stadiumsQuery.isError) {
      console.error('구장 목록 로드 실패:', stadiumsQuery.error);
      setSelectedStadium(null);
      setPlaces((currentPlaces) => currentPlaces.length === 0 ? currentPlaces : []);
      setSelectedPlace(null);
      return;
    }

    if (!stadiumsQuery.isSuccess) {
      return;
    }

    if (stadiums.length === 0) {
      setSelectedStadium(null);
      setPlaces((currentPlaces) => currentPlaces.length === 0 ? currentPlaces : []);
      setSelectedPlace(null);
      return;
    }

    setSelectedStadium((previousSelected) => (
      resolveSelectedStadium(stadiums, previousSelected, routeStadiumId)
    ));
  }, [routeStadiumId, stadiums, stadiumsQuery.error, stadiumsQuery.isError, stadiumsQuery.isSuccess]);

  // ========== 지도 초기화 ==========
  useEffect(() => {
    if (!selectedStadium || !mapContainer.current || !isMapReady) return;

    try {
      initializeMap();
      setMapStatus('success');
      setMapError(null);
      setMapFailureReason(null);
    } catch (error) {
      console.error('지도 초기화 실패:', error);
      setMapStatus('error');
      setMapFailureReason('unavailable');
      setMapError(sanitizeStadiumGuideErrorMessage(
        error,
        '지도를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.',
      ));
    }
  }, [selectedStadium, isMapReady, mapContainer, initializeMap]);

  // ========== DB 장소 로드 (지도 불필요 — SDK 준비 전에 선행 실행 가능) ==========
  useEffect(() => {
    if (!selectedStadium) {
      setPlaces([]);
      setSelectedPlace(null);
      setNearbyStatus('idle');
      return;
    }

    if (!isDbCategory) {
      return;
    }

    setSelectedPlace(null);
    setNearbyStatus('idle');
    setNearbyError(null);

    if (placesQuery.isPending && !placesQuery.data) {
      setPlaces([]);
      return;
    }

    if (placesQuery.isError) {
      console.error('장소 목록 로드 실패:', placesQuery.error);
      setPlaces([]);
      return;
    }

    if (placesQuery.isSuccess) {
      setPlaces(placesQuery.data);
    }
  }, [
    isDbCategory,
    placesQuery.data,
    placesQuery.error,
    placesQuery.isError,
    placesQuery.isPending,
    placesQuery.isSuccess,
    selectedStadium,
  ]);

  // ========== 주변 검색 (지도 준비 완료 후) ==========
  useEffect(() => {
    loadNearbyPlaces();
  }, [loadNearbyPlaces]);

  // ========== 마커 업데이트 ==========
  useEffect(() => {
    if (!mapContainer.current || !map || !isMapReady) return;

    updateMapMarkers(
      map,
      places,
      selectedPlace,
      markersRef,
      infowindowsRef,
      handleMarkerClick,
      clearMarkers
    );
  }, [places, selectedPlace, map, isMapReady]);

  // ========== Handlers ==========
  const handleMarkerClick = (place: Place) => {
    setSelectedPlace(place);

    const placeElement = document.getElementById(`place-${place.id}`);
    if (placeElement) {
      placeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
    mapContainer.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleStadiumChange = (stadiumId: string) => {
    const stadium = stadiums.find((s) => s.stadiumId === stadiumId);
    if (!stadium) {
      return;
    }
    setSelectedStadium(stadium);
    const nextPath = `/stadium/${stadium.stadiumId}`;
    if (routeStadiumId !== stadium.stadiumId) {
      navigate(nextPath, { replace: Boolean(routeStadiumId) });
    }
  };

  const retryStadiums = useCallback(() => {
    void stadiumsQuery.refetch();
  }, [stadiumsQuery]);

  const retryPlaces = useCallback(() => {
    if (isDbCategory) {
      void placesQuery.refetch();
    }
    loadNearbyPlaces();
  }, [isDbCategory, loadNearbyPlaces, placesQuery]);

  const stadiumsStatus = useMemo<AsyncStatus>(() => {
    if (stadiumsQuery.isPending) return 'loading';
    if (stadiumsQuery.isError) return 'error';
    return stadiums.length > 0 ? 'success' : 'empty';
  }, [stadiums.length, stadiumsQuery.isError, stadiumsQuery.isPending]);

  const placesStatus = useMemo<AsyncStatus>(() => {
    if (!selectedStadium || !isDbCategory) return 'idle';
    if (placesQuery.isPending && !placesQuery.data) return 'loading';
    if (placesQuery.isError) return 'error';
    return (placesQuery.data ?? []).length > 0 ? 'success' : 'empty';
  }, [
    isDbCategory,
    placesQuery.data,
    placesQuery.isError,
    placesQuery.isPending,
    selectedStadium,
  ]);

  const routeStadiumNotFound = stadiumsQuery.isSuccess && isUnknownRouteStadium(stadiums, routeStadiumId);

  const stadiumsError = stadiumsQuery.isError
    ? '구장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
    : null;
  const placesError = placesQuery.isError ? '장소 목록을 불러오지 못했습니다.' : null;

  const retryMap = useCallback(() => {
    loadMapSdk();
  }, [loadMapSdk]);

  const loading = useMemo(
    () =>
      stadiumsStatus === 'loading'
      || placesStatus === 'loading'
      || nearbyStatus === 'loading',
    [stadiumsStatus, placesStatus, nearbyStatus]
  );

  const error = useMemo(
    () => stadiumsError ?? placesError ?? nearbyError ?? mapError,
    [stadiumsError, placesError, nearbyError, mapError]
  );

  return {
    // State
    stadiums,
    selectedStadium,
    selectedCategory,
    setSelectedCategory,
    places,
    selectedPlace,
    loading,
    error,
    isMapReady,
    stadiumsStatus,
    routeStadiumNotFound,
    placesStatus,
    nearbyStatus,
    mapStatus,
    stadiumsError,
    placesError,
    nearbyError,
    mapError,
    mapFailureReason,

    // Map
    mapContainer,
    map,

    // Handlers
    handleStadiumChange,
    handlePlaceClick,
    retryStadiums,
    retryPlaces,
    retryMap,
  };
};
