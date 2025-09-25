import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Dimensions, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get('window');

interface MapTrackingInfo {
  orderId: string;
  shopName: string;
  customerName: string;
  phoneNumber: string;
  deliveryAddress: string;
  estimatedDelivery: string;
}

export default function MapTrackingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [selectedStep, setSelectedStep] = useState(1); // 0: Đã lấy hàng, 1: Đang giao hàng, 2: Đã giao hàng
  
  // Get tracking info from route params
  const { trackingInfo } = route.params as { trackingInfo: MapTrackingInfo };

  const handleStepPress = (stepIndex: number, stepName: string) => {
    setSelectedStep(stepIndex);
    Alert.alert(
      "Trạng thái giao hàng", 
      `Bạn đã chọn: ${stepName}`,
      [{ text: "OK" }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đã giao hàng</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color="#E95322" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="help-circle-outline" size={24} color="#E95322" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map Area */}
      <View style={styles.mapContainer}>
        {/* Mock Map Background */}
        <View style={styles.mapBackground}>
          {/* Mock Location Markers */}
          <View style={[styles.locationMarker, styles.shopMarker]}>
            <View style={styles.markerIcon}>
              <Text style={styles.markerText}>A</Text>
            </View>
          </View>
          
          <View style={[styles.locationMarker, styles.deliveryMarker]}>
            <View style={[styles.markerIcon, styles.deliveryIcon]}>
              <Ionicons name="location" size={16} color="#fff" />
            </View>
          </View>
          
          {/* Mock Route Line */}
          <View style={styles.routeLine} />
          
          {/* Mock Google Maps Attribution */}
          <View style={styles.googleAttribution}>
            <Text style={styles.attributionText}>Google</Text>
          </View>
        </View>
        
        
        
        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          <TouchableOpacity 
            style={styles.progressStep}
            onPress={() => handleStepPress(0, "Đã lấy hàng")}
          >
            <View style={[
              styles.progressDot, 
              styles.completedDot,
              selectedStep === 0 && styles.selectedDot
            ]} />
            <Text style={[
              styles.progressText,
              styles.activeText,
              selectedStep === 0 && styles.selectedText
            ]}>Đã lấy hàng</Text>
          </TouchableOpacity>
          
          <View style={styles.progressLine} />
          
          <TouchableOpacity 
            style={styles.progressStep}
            onPress={() => handleStepPress(1, "Đang giao hàng")}
          >
            <View style={[
              styles.progressDot, 
              styles.completedDot,
              styles.activeDot,
              selectedStep === 1 && styles.selectedDot
            ]} />
            <Text style={[
              styles.progressText,
              styles.activeText,
              selectedStep === 1 && styles.selectedText
            ]}>Đang giao hàng</Text>
          </TouchableOpacity>
          
          <View style={styles.progressLine} />
          
          <TouchableOpacity 
            style={styles.progressStep}
            onPress={() => handleStepPress(2, "Đã giao hàng")}
          >
            <View style={[
              styles.progressDot, 
              styles.completedDot,
              selectedStep === 2 && styles.selectedDot
            ]} />
            <Text style={[
              styles.progressText, 
              styles.activeText,
              selectedStep === 2 && styles.selectedText
            ]}>Đã giao hàng</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Card */}
      <View style={styles.bottomCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Giao vào {trackingInfo.estimatedDelivery}</Text>
            <Text style={styles.cardSubtitle}>
              {trackingInfo.customerName} {trackingInfo.phoneNumber}
            </Text>
            <Text style={styles.cardAddress}>{trackingInfo.deliveryAddress}</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 4,
    marginLeft: 8,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapBackground: {
    flex: 1,
    backgroundColor: '#E6F3FF',
    position: 'relative',
  },
  locationMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  shopMarker: {
    top: '25%',
    left: '30%',
  },
  deliveryMarker: {
    top: '60%',
    left: '60%',
  },
  markerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  deliveryIcon: {
    backgroundColor: '#E95322',
  },
  markerText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  routeLine: {
    position: 'absolute',
    top: '35%',
    left: '35%',
    width: 120,
    height: 2,
    backgroundColor: '#E95322',
    transform: [{ rotate: '45deg' }],
  },
  googleAttribution: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  attributionText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  deliveryStatusBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  deliveryStatusText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
    marginBottom: 8,
  },
  completedDot: {
    backgroundColor: '#4CAF50',
  },
  activeDot: {
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: '#E8F5E8',
  },
  progressLine: {
    height: 2,
    flex: 0.5,
    backgroundColor: '#4CAF50',
    marginBottom: 20,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  activeText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  selectedDot: {
    backgroundColor: '#FF9800',
    borderWidth: 3,
    borderColor: '#FFF3E0',
  },
  selectedText: {
    color: '#FF9800',
    fontWeight: '600',
  },
  bottomCard: {
    backgroundColor: '#FFF',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  cardAddress: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});