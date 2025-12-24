import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Image, LayoutAnimation, Platform, UIManager, Modal, Dimensions } from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { addressEmitter } from '@/utils/AddressEventEmitter';
import { API_CONFIG } from '@/constants';
import { Fonts } from '@/constants/Fonts';

interface TrackingInfo {
  orderId: string;
  shopName: string;
  foodItems: {
    name: string;
    quantity: number;
    price: string;
    image?: string; // Thêm thuộc tính image cho mỗi món ăn
    food?: any; // Thêm thuộc tính food object cho fallback
    unitPrice?: string; // Giá đơn vị
    totalPrice?: string; // Tổng giá của item này
    food_note?: string; // Ghi chú cho món ăn
  }[];
  totalAmount: string; // Thành tiền (đã tính giảm giá)
  subtotalAmount: string; // Tổng tiền hàng (chưa giảm giá)
  shippingFee: number;
  shippingDiscount: number;
  voucherDiscount: number;
  paymentMethod: string;
  trackingCode: string;
  phoneNumber: string;
  deliveryAddress: string;
  customerName: string;
  estimatedDelivery: string;
  orderDate: string;
  orderTime: string;
  note?: string; // Ghi chú cho toàn đơn hàng
  status?: string; // Order status
  // Refund info
  refund_requested?: boolean;
  refund_status?: 'Không' | 'Chờ xử lý' | 'Đã hoàn thành';
  bank_name?: string | null;
  bank_account?: string | null;
  proof_image?: string | null;
}

export default function TrackingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [proofViewerVisible, setProofViewerVisible] = useState(false);
  const [updatedAddress, setUpdatedAddress] = useState<{
    customerName: string;
    phoneNumber: string;
    deliveryAddress: string;
  } | null>(null);
  
  // Enable LayoutAnimation for Android
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
  
  // Get tracking info from route params
  const { trackingInfo } = route.params as { trackingInfo: TrackingInfo };

  // Helper to resolve proof image URL
  const resolveProofUrl = (path?: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = API_CONFIG.BASE_URL.replace(/\/?api\/?$/, '');
    const normalized = path.replace(/^\//, '');
    const needsMedia = !normalized.startsWith('media/');
    const finalPath = needsMedia ? `media/${normalized}` : normalized;
    return `${baseUrl.replace(/\/$/, '')}/${finalPath}`;
  };

  // Get status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Chờ xác nhận': return '#3b82f6';
      case 'Đã xác nhận': return '#8b5cf6';
      case 'Đang chuẩn bị': return '#f97316';
      case 'Sẵn sàng': return '#06b6d4';
      case 'Đã giao': return '#10b981';
      case 'Đã huỷ':
      case 'Đã hủy': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Get refund status style
  const getRefundStatusStyle = (status?: string) => {
    switch (status) {
      case 'Chờ xử lý': return { bg: '#fef3c7', text: '#b45309', border: '#f59e0b' };
      case 'Đã hoàn thành': return { bg: '#d1fae5', text: '#047857', border: '#10b981' };
      default: return { bg: '#e5e7eb', text: '#374151', border: '#9ca3af' };
    }
  };

  // Check if order is cancelled
  const isCancelled = trackingInfo.status === 'Đã huỷ' || trackingInfo.status === 'Đã hủy';
  
  // Debug information for data validation
  React.useEffect(() => {
    console.log('=== TRACKING INFO DEBUG ===');
    console.log('Total Amount:', trackingInfo.totalAmount);
    console.log('Subtotal Amount:', trackingInfo.subtotalAmount); 
    console.log('Raw tracking info:', JSON.stringify(trackingInfo, null, 2));
    console.log('Food Items:');
    trackingInfo.foodItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.name}`);
      console.log(`     Quantity: ${item.quantity}`);
      console.log(`     Price: ${item.price}`);
      console.log(`     Image: ${item.image || 'undefined'}`);
      console.log(`     Image URL: ${(item as any).image_url || 'undefined'}`);
      console.log(`     Food object:`, (item as any).food || 'undefined');
      console.log(`     Full item data:`, JSON.stringify(item, null, 2));
      console.log(`     Expected: ${item.name.includes('Cá viên') ? '18,000đ' : '15,000đ'} × ${item.quantity}`);
    });
    console.log('=== END DEBUG ===');
  }, []);

  // Listen for address selection from AddressSelectionScreen
  React.useEffect(() => {
    const handleAddressFromSelection = (selectedAddressData: any) => {
      console.log('Address selected from AddressSelection:', selectedAddressData);
      setUpdatedAddress({
        customerName: selectedAddressData.name,
        phoneNumber: selectedAddressData.phone,
        deliveryAddress: selectedAddressData.fullAddress,
      });
    };

    addressEmitter.on('addressFromSelectionSelected', handleAddressFromSelection);

    return () => {
      addressEmitter.off('addressFromSelectionSelected', handleAddressFromSelection);
    };
  }, []);

  // Function to calculate estimated delivery time (order time + 30 minutes)
  const calculateEstimatedDelivery = (orderDate: string, orderTime: string) => {
    try {
      // Parse the time string (e.g., "01:20 pm")
      const timeParts = orderTime.toLowerCase().split(' ');
      const time = timeParts[0]; // "01:20"
      const period = timeParts[1]; // "pm" or "am"
      
      const [hours, minutes] = time.split(':').map(Number);
      
      // Convert to 24-hour format
      let hour24 = hours;
      if (period === 'pm' && hours !== 12) {
        hour24 = hours + 12;
      } else if (period === 'am' && hours === 12) {
        hour24 = 0;
      }
      
      // Parse the order date (e.g., "12 Th9" or "13 Th9")
      const dateMatch = orderDate.match(/(\d+)\s+Th(\d+)/);
      if (!dateMatch) throw new Error('Invalid date format');
      
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]);
      const year = new Date().getFullYear(); // Current year
      
      // Create a date object with the actual order date
      const orderDateTime = new Date(year, month - 1, day, hour24, minutes, 0, 0);
      
      // Add 30 minutes for delivery
      const deliveryDateTime = new Date(orderDateTime.getTime() + 30 * 60 * 1000);
      
      // Format back to readable format
      const deliveryHours = deliveryDateTime.getHours();
      const deliveryMinutes = deliveryDateTime.getMinutes();
      
      // Convert back to 12-hour format
      const period12 = deliveryHours >= 12 ? 'pm' : 'AM';
      const hours12 = deliveryHours > 12 ? deliveryHours - 12 : (deliveryHours === 0 ? 12 : deliveryHours);
      
      const formattedTime = `${hours12.toString().padStart(2, '0')}:${deliveryMinutes.toString().padStart(2, '0')} ${period12}`;
      
      // Format date properly - Vietnamese style
      const deliveryDay = deliveryDateTime.getDate();
      const deliveryMonth = deliveryDateTime.getMonth() + 1;
      const monthNames = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
      const formattedDate = `${deliveryDay} ${monthNames[deliveryMonth - 1]}`;
      
      return `${formattedTime} - ${formattedDate}`;
    } catch (error) {
      // Fallback if parsing fails
      return `${trackingInfo.orderTime} + 30 phút - ${trackingInfo.orderDate}`;
    }
  };

  // Function to calculate pickup time (order time + 5 minutes)
  const calculatePickupTime = (orderDate: string, orderTime: string) => {
    try {
      // Parse the time string (e.g., "01:20 pm")
      const timeParts = orderTime.toLowerCase().split(' ');
      const time = timeParts[0]; // "01:20"
      const period = timeParts[1]; // "pm" or "am"
      
      const [hours, minutes] = time.split(':').map(Number);
      
      // Convert to 24-hour format
      let hour24 = hours;
      if (period === 'pm' && hours !== 12) {
        hour24 = hours + 12;
      } else if (period === 'am' && hours === 12) {
        hour24 = 0;
      }
      
      // Parse the order date (e.g., "12 Th9" or "13 Th9")
      const dateMatch = orderDate.match(/(\d+)\s+Th(\d+)/);
      if (!dateMatch) throw new Error('Invalid date format');
      
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]);
      const year = new Date().getFullYear(); // Current year
      
      // Create a date object with the actual order date
      const orderDateTime = new Date(year, month - 1, day, hour24, minutes, 0, 0);
      
      // Add 5 minutes for pickup
      const pickupDateTime = new Date(orderDateTime.getTime() + 5 * 60 * 1000);
      
      // Format back to readable format
      const pickupHours = pickupDateTime.getHours();
      const pickupminutes = pickupDateTime.getMinutes();
      
      // Convert back to 12-hour format
      const period12 = pickupHours >= 12 ? 'pm' : 'AM';
      const hours12 = pickupHours > 12 ? pickupHours - 12 : (pickupHours === 0 ? 12 : pickupHours);
      
      const formattedTime = `${hours12.toString().padStart(2, '0')}:${pickupminutes.toString().padStart(2, '0')} ${period12}`;
      
      // Format date properly - Vietnamese style
      const pickupDay = pickupDateTime.getDate();
      const pickupmonth = pickupDateTime.getMonth() + 1;
      const monthNames = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
      const formattedDate = `${pickupDay} ${monthNames[pickupmonth - 1]}`;
      
      return `${formattedTime} - ${formattedDate}`;
    } catch (error) {
      // Fallback if parsing fails
      return `${trackingInfo.orderTime} + 5 phút - ${trackingInfo.orderDate}`;
    }
  };

  const estimatedDeliveryTime = calculateEstimatedDelivery(trackingInfo.orderDate, trackingInfo.orderTime);
  const estimatedPickupTime = calculatePickupTime(trackingInfo.orderDate, trackingInfo.orderTime);

  // Function to calculate cost breakdown based on total amount
  const calculateCostBreakdown = () => {
    const subtotal = parseInt(trackingInfo.subtotalAmount.replace(/[₫,.đ]/g, ''));
    const finalAmount = parseInt(trackingInfo.totalAmount.replace(/[₫,.đ]/g, ''));
    
    return {
      subtotal: `${subtotal.toLocaleString()}đ`,
      shippingFee: trackingInfo.shippingFee > 0 ? `${trackingInfo.shippingFee.toLocaleString()}đ` : '0đ',
      shippingDiscount: trackingInfo.shippingDiscount < 0 ? `-${Math.abs(trackingInfo.shippingDiscount).toLocaleString()}đ` : '0đ',
      voucherDiscount: trackingInfo.voucherDiscount < 0 ? `-${Math.abs(trackingInfo.voucherDiscount).toLocaleString()}đ` : '0đ',
      finalAmount: `${finalAmount.toLocaleString()}đ`
    };
  };

  const costBreakdown = calculateCostBreakdown();

  // Callback function to handle address selection
  const handleAddressSelected = (selectedAddress: any) => {
    setUpdatedAddress({
      customerName: selectedAddress.name,
      phoneNumber: selectedAddress.phone,
      deliveryAddress: `${selectedAddress.address}, ${selectedAddress.district}`,
    });
  };

  // Listen for address selection events
  useFocusEffect(
    React.useCallback(() => {
      const handleAddressEvent = (addressData: any) => {
        handleAddressSelected(addressData);
      };

      const handleSelectionAddressEvent = (addressData: any) => {
        setUpdatedAddress({
          customerName: addressData.name,
          phoneNumber: addressData.phone,
          deliveryAddress: addressData.fullAddress,
        });
      };

      addressEmitter.on('addressSelected', handleAddressEvent);
      addressEmitter.on('addressFromSelectionSelected', handleSelectionAddressEvent);

      return () => {
        addressEmitter.off('addressSelected', handleAddressEvent);
        addressEmitter.off('addressFromSelectionSelected', handleSelectionAddressEvent);
      };
    }, [])
  );

  // Get current address info (use updated address if available)
  const currentAddress = updatedAddress || {
    customerName: trackingInfo.customerName,
    phoneNumber: trackingInfo.phoneNumber,
    deliveryAddress: trackingInfo.deliveryAddress,
  };

  // Helper function to get correct image URL
  const getImageUrl = (item: any) => {
    console.log('getImageUrl called with item:', item);

    // First try food.image_url (if item has nested food object) - this should be the primary source
    if (item.food && item.food.image_url) {
      console.log('Using food.image:', item.food.image);
      return item.food.image;
    }
  };

  // Smart placeholder image function based on food name
  const getPlaceholderImage = (foodName: string) => {
    const name = foodName.toLowerCase();
    
    // Map different food types to appropriate placeholder
    if (name.includes('cá') || name.includes('fish') || name.includes('viên')) {
      return require('@/assets/images/placeholder-logo.png'); // Fish/meatball
    } 
    else if (name.includes('khoai tây') || name.includes('potato') || name.includes('fries')) {
      return require('@/assets/images/placeholder-logo.png'); // Potato/fries
    }
    else if (name.includes('pizza')) {
      return require('@/assets/images/placeholder-logo.png'); // Pizza
    }
    else if (name.includes('burger') || name.includes('bánh mì')) {
      return require('@/assets/images/placeholder-logo.png'); // Burger
    }
    else if (name.includes('chicken') || name.includes('gà')) {
      return require('@/assets/images/placeholder-logo.png'); // Chicken
    }
    else if (name.includes('beef') || name.includes('bò')) {
      return require('@/assets/images/placeholder-logo.png'); // Beef
    }
    else if (name.includes('drink') || name.includes('nước') || name.includes('coca')) {
      return require('@/assets/images/placeholder-logo.png'); // Drinks
    }
    
    // Default placeholder
    return require('@/assets/images/placeholder-logo.png');
  };

  // Enhanced price calculation function with fallback for specific items
  const calculateItemPrice = (item: any, allItems: any[], subtotalAmount: string) => {
    try {
      // First, try to use actual price if valid
      if (item.price && item.price !== '0đ' && item.price !== '0') {
        const numericValue = item.price.replace(/[^\d]/g, '');
        if (numericValue && parseInt(numericValue) > 0) {
          return parseInt(numericValue);
        }
      }

      // Fallback: Calculate based on known prices for specific items
      const itemName = item.name.toLowerCase();
      let unitPrice = 0;
      
      if (itemName.includes('cá viên')) {
        unitPrice = 18000; // 18,000 VND per cá viên
      } else if (itemName.includes('khoai tây')) {
        unitPrice = 15000; // 15,000 VND per khoai tây
      } else if (itemName.includes('pizza')) {
        unitPrice = 50000; // Example price for pizza
      } else {
        // General fallback: distribute subtotal evenly
        const subtotal = parseInt(subtotalAmount.replace(/[^\d]/g, ''));
        const totalQuantity = allItems.reduce((sum, foodItem) => sum + foodItem.quantity, 0);
        
        if (subtotal > 0 && totalQuantity > 0) {
          unitPrice = Math.floor(subtotal / totalQuantity);
        }
      }
      
      return unitPrice * item.quantity;
    } catch (error) {
      console.error('Price calculation error:', error);
      return null;
    }
  };

  // Format currency helper with smart price calculation
  const formatPrice = (price: string, item?: any, totalAmount?: string) => {
    // First, try to use the actual price if it's valid
    if (price && price !== '0đ' && price !== '0' && price !== '0₫' && price !== '0 đ') {
      const numericValue = price.replace(/[^\d]/g, '');
      if (numericValue && parseInt(numericValue) > 0) {
        const formattedNumber = parseInt(numericValue).toLocaleString('vi-VN');
        return `${formattedNumber}đ`;
      }
    }
    
    // If price is 0 or invalid, calculate estimated price
    if (item && totalAmount && trackingInfo?.foodItems) {
      const calculatedPrice = calculateItemPrice(item, trackingInfo.foodItems, totalAmount);
      
      if (calculatedPrice && calculatedPrice > 0) {
        return `${calculatedPrice.toLocaleString('vi-VN')}đ`;
      }
    }
    
    // Last resort: show placeholder
    return 'Chờ cập nhật';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#E95322" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin đơn hàng</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Status Section */}
        <View style={styles.orderStatusSection}>
          <View style={styles.orderStatusRow}>
            <Text style={styles.orderStatusLabel}>Trạng thái đơn hàng</Text>
            <View style={[styles.orderStatusBadge, { backgroundColor: getStatusColor(trackingInfo.status) }]}>
              <Text style={styles.orderStatusText}>{trackingInfo.status || 'Chờ xác nhận'}</Text>
            </View>
          </View>
        </View>

        {/* Refund Info Section - Only show for cancelled orders with refund request */}
        {isCancelled && trackingInfo.refund_status && trackingInfo.refund_status !== 'Không' && (
          <View style={styles.refundSection}>
            <Text style={styles.refundSectionTitle}>Thông tin hoàn tiền</Text>
            
            {/* Refund Status */}
            <View style={styles.refundInfoRow}>
              <Text style={styles.refundInfoLabel}>Trạng thái hoàn tiền</Text>
              <View style={[
                styles.refundStatusBadge,
                { 
                  backgroundColor: getRefundStatusStyle(trackingInfo.refund_status).bg,
                  borderColor: getRefundStatusStyle(trackingInfo.refund_status).border,
                }
              ]}>
                <Text style={[
                  styles.refundStatusText,
                  { color: getRefundStatusStyle(trackingInfo.refund_status).text }
                ]}>
                  {trackingInfo.refund_status}
                </Text>
              </View>
            </View>

            {/* Bank Name */}
            {trackingInfo.bank_name && (
              <View style={styles.refundInfoRow}>
                <Text style={styles.refundInfoLabel}>Ngân hàng</Text>
                <Text style={styles.refundInfoValue}>{trackingInfo.bank_name}</Text>
              </View>
            )}

            {/* Bank Account */}
            {trackingInfo.bank_account && (
              <View style={styles.refundInfoRow}>
                <Text style={styles.refundInfoLabel}>Số tài khoản</Text>
                <Text style={styles.refundInfoValue}>{trackingInfo.bank_account}</Text>
              </View>
            )}

            {/* Proof Image - Only show when refund is completed */}
            {trackingInfo.refund_status === 'Đã hoàn thành' && trackingInfo.proof_image && (
              <View style={styles.proofImageSection}>
                <Text style={styles.refundInfoLabel}>Minh chứng chuyển khoản</Text>
                <TouchableOpacity 
                  style={styles.viewProofBtn}
                  onPress={() => setProofViewerVisible(true)}
                >
                  <Ionicons name="image-outline" size={18} color="#ea580c" />
                  <Text style={styles.viewProofText}>Xem ảnh minh chứng</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Status Banner - chỉ hiển thị khi không phải đã huỷ */}
        {!isCancelled && (
          <>
            {trackingInfo.status !== 'Chờ xác nhận' ? (
              <TouchableOpacity 
                style={styles.statusBanner}
                onPress={() => (navigation as any).navigate('MapTracking', { 
                  trackingInfo: {
                    orderId: trackingInfo.orderId,
                    shopName: trackingInfo.shopName,
                    customerName: trackingInfo.customerName,
                    phoneNumber: trackingInfo.phoneNumber,
                    deliveryAddress: trackingInfo.deliveryAddress,
                    estimatedDelivery: estimatedDeliveryTime,
                  }
                })}
              >
                <Text style={styles.statusText}>Thời gian giao hàng dự kiến: {estimatedDeliveryTime}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.pendingStatusBanner}>
                <Text style={styles.pendingStatusText}>Đơn hàng đang chờ xác nhận</Text>
              </View>
            )}
          </>
        )}        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Địa chỉ nhận hàng</Text>
          <View style={styles.addressContainer}>
            <View style={styles.addressHeader}>
              <View style={styles.addressIcon}>
                <Ionicons name="location-outline" size={16} color="#666" />
              </View>
              <View style={styles.addressInfo}>
                <Text style={styles.recipientName}>{currentAddress.customerName} {currentAddress.phoneNumber}</Text>
                <Text style={styles.addressText}>{currentAddress.deliveryAddress}</Text>
              </View>
              {(trackingInfo as any).status === 'Chờ xác nhận' && (
                <TouchableOpacity 
                  style={styles.updateButton}
                  onPress={() => (navigation as any).navigate('AddressSelection')}
                >
                  <Text style={styles.updateButtonText}>Cập nhật</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Shop Info */}
        <View style={styles.shopSection}>
          <View style={styles.shopHeader}>
            <Ionicons name="storefront-outline" size={16} color="#666" />
            <Text style={styles.shopName}>{trackingInfo.shopName}</Text>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </View>
        </View>

        {/* Product Items */}
        <View style={styles.productSection}>
          {trackingInfo.foodItems.map((item, index) => {
            return (
              <View key={`${item.name}_${index}_${item.quantity}`} style={styles.productItem}>
                {(() => {
                  // const imageUrl = getImageUrl(item);
                  const baseUrl = API_CONFIG.BASE_URL.replace("/api", "");
                  const imageUrl = `${baseUrl}/media/${getImageUrl(item)}`;
                  const placeholderImage = getPlaceholderImage(item.name);
                  console.log(`Rendering image for ${item.name}:`, { imageUrl, placeholderImage });
                  return (
                    <Image
                      source={imageUrl ? { uri: imageUrl } : placeholderImage}
                      style={styles.productImage}
                      resizeMode="cover"
                      defaultSource={placeholderImage}
                      onError={(error) => {
                        console.log(`Image load error for ${item.name}:`, error.nativeEvent);
                        console.log('Failed URL:', imageUrl);
                      }}
                      onLoadStart={() => {
                        console.log(`Image load start for ${item.name}:`, imageUrl);
                      }}
                      onLoadEnd={() => {
                        console.log(`Image load end for ${item.name}:`, imageUrl);
                      }}
                      onLoad={() => {
                        console.log(`Image loaded successfully for ${item.name}:`, imageUrl);
                      }}
                    />
                  );
                })()}
                <View style={styles.productInfo}>
                  <View style={styles.productNameContainer}>
                    {/* Hiển thị tên món */}
                    <View style={styles.nameSection}>
                      {(() => {
                        const lines = item.name.split('\n');
                        const firstLine = lines[0] || '';
                        
                        // Extract food name from "Coke 15,000đ"
                        const nameMatch = firstLine.match(/^(.+?)\s+[0-9,]+đ$/);
                        const foodName = nameMatch ? nameMatch[1] : firstLine;
                        
                        return (
                          <>
                            <Text style={styles.productName} numberOfLines={1}>
                              {foodName}
                            </Text>
                            {lines.length > 1 && (
                              <Text style={styles.sizeInfo} numberOfLines={1}>
                                {lines[1].replace(/:\s*\+[0-9,]+đ$/, '')}
                              </Text>
                            )}
                          </>
                        );
                      })()}
                      <Text style={styles.productQuantity}>x{item.quantity}</Text>
                    </View>
                    
                    {/* Hiển thị giá tiền */}
                    <View style={styles.priceSection}>
                      {(() => {
                        const lines = item.name.split('\n');
                        const prices = [];
                        
                        // Extract price from first line: "Coke 15,000đ"
                        const firstLineMatch = lines[0]?.match(/([0-9,]+đ)$/);
                        if (firstLineMatch) {
                          prices.push(firstLineMatch[1]);
                        }
                        
                        // Extract price from size line: "Size L: +5,000đ"
                        if (lines[1]) {
                          const sizeMatch = lines[1].match(/\+([0-9,]+đ)$/);
                          if (sizeMatch) {
                            prices.push(`+${sizeMatch[1]}`);
                          }
                        }
                        
                        return prices.map((price, idx) => (
                          <Text key={idx} style={styles.itemPrice}>
                            {price}
                          </Text>
                        ));
                      })()}
                    </View>
                  </View>
                  
                  {/* Hiển thị ghi chú món ăn */}
                  {item.food_note && item.food_note.trim() !== '' && (
                    <View style={styles.foodNoteContainer}>
                      <Text style={styles.foodNoteLabel}>Ghi chú:</Text>
                      <Text style={styles.foodNoteText}>{item.food_note}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
          
          {isExpanded && (
            <View style={styles.costBreakdown}>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Tổng tiền hàng</Text>
                <Text style={styles.costValue}>{costBreakdown.subtotal}</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Phí vận chuyển</Text>
                <Text style={styles.costValue}>{costBreakdown.shippingFee}</Text>
              </View>
              {trackingInfo.shippingDiscount < 0 && (
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Giảm giá phí vận chuyển</Text>
                  <Text style={[styles.costValue, styles.discountText]}>{costBreakdown.shippingDiscount}</Text>
                </View>
              )}
              {trackingInfo.voucherDiscount < 0 && (
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Giảm giá khuyến mãi</Text>
                  <Text style={[styles.costValue, styles.discountText]}>{costBreakdown.voucherDiscount}</Text>
                </View>
              )}
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.totalSection}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setIsExpanded(!isExpanded);
            }}
          >
            <Text style={styles.totalLabel}>Thành tiền</Text>
            <Text style={styles.totalAmount}>{trackingInfo.totalAmount}</Text>
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={16} 
              color="#666" 
            />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>Bạn cần hỗ trợ?</Text>
          
          <TouchableOpacity style={styles.supportItem}>
            <View style={styles.supportIcon}>
              <Ionicons name="chatbubble-outline" size={20} color="#666" />
            </View>
            <Text style={styles.supportText}>Liên hệ Shop</Text>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.supportItem}>
            <View style={styles.supportIcon}>
              <Ionicons name="help-circle-outline" size={20} color="#666" />
            </View>
            <Text style={styles.supportText}>Trung tâm Hỗ trợ</Text>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Order ID Section */}
        <View style={styles.orderIdSection}>
          <View style={styles.orderIdRow}>
            <Text style={styles.orderIdLabel}>Mã đơn hàng</Text>
            <Text style={styles.orderIdValue}>#{trackingInfo.orderId}</Text>
            <TouchableOpacity style={styles.copyButton}>
              <Text style={styles.copyButtonText}>SAO CHÉP</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.costRow}>
                <Text style={styles.costLabel}>Phương thức Thanh toán</Text>
                <Text style={styles.paymentMethodText}>{trackingInfo.paymentMethod}</Text>
              </View>
          
          

          {isDetailsExpanded && (
            <View style={styles.orderDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Thời gian đặt hàng</Text>
                <Text style={styles.detailValue}>{trackingInfo.orderTime} - {trackingInfo.orderDate}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Thời gian lấy hàng</Text>
                <Text style={styles.detailValue}>{estimatedPickupTime}</Text>
              </View>
              
              {trackingInfo.paymentMethod.toLowerCase().includes('chuyển khoản') && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Thời gian chuyển khoản</Text>
                  <Text style={styles.detailValue}>{trackingInfo.orderTime} - {trackingInfo.orderDate}</Text>
                </View>
              )}
              
              {/* Hiển thị ghi chú đơn hàng */}
              {trackingInfo.note && trackingInfo.note.trim() !== '' && (
                <View style={styles.orderNoteContainer}>
                  <Text style={styles.orderNoteLabel}>Ghi chú đơn hàng:</Text>
                  <Text style={styles.orderNoteText}>{trackingInfo.note}</Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity 
            style={styles.detailsButton}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setIsDetailsExpanded(!isDetailsExpanded);
            }}
          >
            <Text style={styles.detailsText}>{isDetailsExpanded ? "Thu gọn" : "Xem chi tiết"}</Text>
            <Ionicons 
              name={isDetailsExpanded ? "chevron-up" : "chevron-down"} 
              size={16} 
              color="#666" 
            />
          </TouchableOpacity>

          
        </View>
      </ScrollView>

      {/* Proof Image Viewer Modal */}
      <Modal
        visible={proofViewerVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setProofViewerVisible(false)}
      >
        <View style={styles.proofModalOverlay}>
          <View style={styles.proofModalContent}>
            <View style={styles.proofModalHeader}>
              <Text style={styles.proofModalTitle}>Ảnh minh chứng</Text>
              <TouchableOpacity
                onPress={() => setProofViewerVisible(false)}
                style={styles.proofModalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.proofImageContainer}>
              {trackingInfo.proof_image ? (
                <Image
                  source={{ uri: resolveProofUrl(trackingInfo.proof_image) || '' }}
                  style={{
                    width: Dimensions.get('window').width - 72,
                    height: 280,
                  }}
                  resizeMode="contain"
                  onError={(e) => {
                    console.log('Proof image load error:', e.nativeEvent);
                  }}
                />
              ) : (
                <Text style={{ color: '#6b7280', textAlign: 'center' }}>Không có hình ảnh</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.proofCloseButton}
              onPress={() => setProofViewerVisible(false)}
            >
              <Text style={styles.proofCloseButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    color: '#333',
    marginLeft: 16,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  content: {
    flex: 1,
    paddingVertical: 8,
  },
  
  // Order Status Section
  orderStatusSection: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  orderStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderStatusLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  orderStatusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  orderStatusText: {
    fontSize: 13,
    color: '#fff',
    fontFamily: Fonts.LeagueSpartanBold,
  },

  // Refund Section
  refundSection: {
    backgroundColor: '#FFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fef3c7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  refundSectionTitle: {
    fontSize: 15,
    color: '#ea580c',
    fontFamily: Fonts.LeagueSpartanBold,
    marginBottom: 12,
  },
  refundInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  refundInfoLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  refundInfoValue: {
    fontSize: 14,
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  refundStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  refundStatusText: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  proofImageSection: {
    paddingTop: 12,
    marginTop: 4,
  },
  viewProofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fff7ed',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginTop: 8,
  },
  viewProofText: {
    fontSize: 14,
    color: '#ea580c',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  // Proof Modal Styles
  proofModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  proofModalContent: {
    width: Dimensions.get('window').width - 40,
    maxHeight: Dimensions.get('window').height * 0.8,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  proofModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  proofModalTitle: {
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#111827',
  },
  proofModalCloseBtn: {
    padding: 4,
  },
  proofImageContainer: {
    width: '100%',
    minHeight: 280,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proofCloseButton: {
    marginTop: 16,
    backgroundColor: '#ea580c',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  proofCloseButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanBold,
  },

  statusBanner: {
    backgroundColor: '#E95322',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'left',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  pendingStatusBanner: {
    backgroundColor: '#E95322',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  pendingStatusText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  paymentSection: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  section: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  addressContainer: {
    marginTop: 8,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  addressInfo: {
    flex: 1,
    marginRight: 12,
  },
  recipientName: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  updateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  updateButtonText: {
    fontSize: 12,
    color: '#666',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  shopSection: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopName: {
    fontSize: 15,
    color: '#333',
    marginLeft: 8,
    flex: 1,
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  productSection: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  productName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    lineHeight: 18,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  productQuantity: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  productPrice: {
    fontSize: 15,
    color: '#E95322',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  totalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  totalLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  totalAmount: {
    fontSize: 16,
    color: '#333',
    marginRight: 8,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  supportSection: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
  },
  supportTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  supportIcon: {
    marginRight: 12,
  },
  supportText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  orderIdSection: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    marginBottom: 100, // Add space for bottom button
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderIdLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  orderIdValue: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  copyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  copyButtonText: {
    fontSize: 12,
    color: '#666',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  detailsText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  finalTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  finalTotalLabel: {
    fontSize: 16,
    color: '#333',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  finalTotalAmount: {
    fontSize: 18,
    color: '#E53E3E',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cancelButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#333',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  costBreakdown: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  costLabel: {
    fontSize: 14,
    color: '#333',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  costValue: {
    fontSize: 14,
    color: '#333',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  discountText: {
    color: '#E53E3E',
  },
  finalCostRow: {
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  finalCostLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  finalCostValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '700',
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#4bb183ff',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  orderDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    flex: 1,
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  productDetails: {
    flex: 1,
  },
  productNameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flex: 1,
  },
  nameSection: {
    flex: 1,
    marginRight: 12,
  },
  priceSection: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  itemPrice: {
    fontSize: 14,
    color: '#E95322',
    textAlign: 'right',
    lineHeight: 18,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  sizeInfo: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  foodNoteContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#E95322',
  },
  foodNoteLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  foodNoteText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 16,
  },
  orderNoteContainer: {
    backgroundColor: '#FFF4E6',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FFD6A5',
  },
  orderNoteLabel: {
    fontSize: 14,
    color: '#E95322',
    marginBottom: 4,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  orderNoteText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
});