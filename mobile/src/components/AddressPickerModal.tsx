import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Marker, MapPressEvent, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { MapPin, Search, X, Crosshair } from 'lucide-react-native';
import { Fonts } from '@/constants/Fonts';
import { locationService, PlaceSuggestion, PlaceDetailsResult } from '@/services';

interface AddressPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (result: { address: string; latitude: number; longitude: number }) => void;
  initialAddress?: string;
  initialCoords?: { latitude: number; longitude: number };
}

const DEFAULT_REGION: Region = {
  latitude: 10.762622,
  longitude: 106.660172,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const MIN_QUERY_LENGTH = 3;

export const AddressPickerModal: React.FC<AddressPickerModalProps> = ({
  visible,
  onClose,
  onSelect,
  initialAddress,
  initialCoords,
}) => {
  const mapRef = useRef<MapView | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialAddress || '');
  const [predictions, setPredictions] = useState<PlaceSuggestion[]>([]);
  const [selectedAddress, setSelectedAddress] = useState(initialAddress || '');
  const [selectedCoords, setSelectedCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(initialCoords || null);
  const [region, setRegion] = useState<Region>(
    initialCoords
      ? { ...initialCoords, latitudeDelta: 0.02, longitudeDelta: 0.02 }
      : DEFAULT_REGION
  );
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [locating, setLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      setSearchQuery(initialAddress || '');
      setSelectedAddress(initialAddress || '');
      setSelectedCoords(initialCoords || null);
      setRegion(
        initialCoords
          ? { ...initialCoords, latitudeDelta: 0.02, longitudeDelta: 0.02 }
          : DEFAULT_REGION
      );
      setPredictions([]);
      setErrorMessage(null);
    }
  }, [visible, initialAddress, initialCoords]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const animateToCoords = useCallback((coords: { latitude: number; longitude: number }) => {
    const nextRegion: Region = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    };
    setRegion(nextRegion);
    if (mapRef.current) {
      mapRef.current.animateToRegion(nextRegion, 500);
    }
  }, []);

  const runSearch = useCallback(
    async (query: string) => {
      if (query.trim().length < MIN_QUERY_LENGTH) {
        setPredictions([]);
        return;
      }
      try {
        setLoadingPredictions(true);
        setErrorMessage(null);
        const suggestions = await locationService.autocomplete(query.trim());
        setPredictions(suggestions);
      } catch (error: any) {
        console.error('AddressPickerModal autocomplete error:', error);
        setErrorMessage(error?.message || 'Không thể tìm kiếm địa chỉ.');
      } finally {
        setLoadingPredictions(false);
      }
    },
    []
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => runSearch(text), 350);
  };

  const handlePredictionSelect = async (item: PlaceSuggestion) => {
    try {
      setLoadingPredictions(true);
      setErrorMessage(null);
      const details: PlaceDetailsResult = await locationService.getPlaceDetails(item.placeId);
      setSelectedCoords({ latitude: details.latitude, longitude: details.longitude });
      setSelectedAddress(details.address);
      setSearchQuery(details.address);
      setPredictions([]);
      animateToCoords({ latitude: details.latitude, longitude: details.longitude });
    } catch (error: any) {
      console.error('AddressPickerModal place details error:', error);
      setErrorMessage(error?.message || 'Không thể lấy thông tin địa điểm.');
    } finally {
      setLoadingPredictions(false);
    }
  };

  const handleMapPress = async (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedCoords({ latitude, longitude });
    try {
      const address = await locationService.reverseGeocode(latitude, longitude);
      setSelectedAddress(address);
      setSearchQuery(address);
      setErrorMessage(null);
    } catch (error: any) {
      console.error('AddressPickerModal reverse geocode error:', error);
      setErrorMessage(error?.message || 'Không thể xác định địa chỉ.');
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setErrorMessage('Ứng dụng cần quyền truy cập vị trí để tiếp tục.');
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
      animateToCoords(coords);
      setSelectedCoords(coords);
      const address = await locationService.reverseGeocode(coords.latitude, coords.longitude);
      setSelectedAddress(address);
      setSearchQuery(address);
      setErrorMessage(null);
    } catch (error: any) {
      console.error('AddressPickerModal current location error:', error);
      setErrorMessage(error?.message || 'Không thể lấy vị trí hiện tại.');
    } finally {
      setLocating(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedCoords || !selectedAddress) {
      setErrorMessage('Vui lòng chọn một địa chỉ hợp lệ.');
      return;
    }
    onSelect({
      address: selectedAddress,
      latitude: selectedCoords.latitude,
      longitude: selectedCoords.longitude,
    });
  };

  const renderPrediction = ({ item }: { item: PlaceSuggestion }) => (
    <TouchableOpacity style={styles.predictionItem} onPress={() => handlePredictionSelect(item)}>
      <MapPin size={18} color="#e95322" />
      <View style={styles.predictionTextWrapper}>
        <Text style={styles.predictionPrimary} numberOfLines={1}>
          {item.description}
        </Text>
        {item.secondaryText && (
          <Text style={styles.predictionSecondary} numberOfLines={1}>
            {item.secondaryText}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <X size={20} color="#e95322" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Chọn địa chỉ trên bản đồ</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Search size={18} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm địa điểm, đường, phường..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoFocus={false}
              autoCorrect={false}
            />
            {loadingPredictions && <ActivityIndicator size="small" color="#e95322" />}
          </View>
          <TouchableOpacity
            style={styles.currentLocationButton}
            onPress={handleUseCurrentLocation}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator size="small" color="#e95322" />
            ) : (
              <Crosshair size={18} color="#e95322" />
            )}
            <Text style={styles.currentLocationText}>Sử dụng vị trí hiện tại</Text>
          </TouchableOpacity>
        </View>

        {predictions.length > 0 && (
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.id}
            renderItem={renderPrediction}
            keyboardShouldPersistTaps="handled"
            style={styles.predictionList}
          />
        )}

        <MapView
          ref={mapRef}
          style={styles.map}
          region={region}
          onRegionChangeComplete={(nextRegion) => setRegion(nextRegion)}
          onPress={handleMapPress}
        >
          {selectedCoords && <Marker coordinate={selectedCoords} />}
        </MapView>

        <View style={styles.footer}>
          {selectedAddress ? (
            <View style={styles.addressPreview}>
              <MapPin size={18} color="#e95322" />
              <Text style={styles.addressPreviewText} numberOfLines={2}>
                {selectedAddress}
              </Text>
            </View>
          ) : (
            <Text style={styles.addressPlaceholder}>Chạm vào bản đồ để chọn địa chỉ</Text>
          )}

          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          <TouchableOpacity
            style={[styles.confirmButton, (!selectedCoords || !selectedAddress) && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={!selectedCoords || !selectedAddress}
          >
            <Text style={styles.confirmButtonText}>Xác nhận địa chỉ này</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#333',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 15,
    color: '#333',
  },
  currentLocationButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  currentLocationText: {
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanMedium,
    color: '#e95322',
  },
  predictionList: {
    maxHeight: 180,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    gap: 12,
  },
  predictionTextWrapper: {
    flex: 1,
  },
  predictionPrimary: {
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 15,
    color: '#333',
  },
  predictionSecondary: {
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  map: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
    gap: 12,
  },
  addressPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  addressPreviewText: {
    flex: 1,
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 15,
    color: '#333',
  },
  addressPlaceholder: {
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 14,
    color: '#999',
  },
  errorText: {
    color: '#e95322',
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  confirmButton: {
    backgroundColor: '#e95322',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: '#fff',
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 16,
  },
});
