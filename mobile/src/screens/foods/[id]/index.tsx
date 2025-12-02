import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from 'expo-secure-store';
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ArrowLeft, Clock, Heart, Minus, MoreHorizontal, Plus,
  ShoppingCart, Star, Truck, Zap,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions, FlatList, Image, ScrollView, StatusBar,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";

import { Fonts } from "@/constants/Fonts";
import { API_CONFIG, STORAGE_KEYS } from "@/constants";
import { parsePrice, formatPriceWithCurrency } from "@/utils/priceUtils";
import { cartService } from "@/services";

const { width } = Dimensions.get("window");
const ORANGE = "#e95322";
const BROWN = "#391713";

// Helper function to build image URLs
const getImageUrl = (imagePath: string) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  return `${API_CONFIG.BASE_URL.replace('/api', '')}/media/${imagePath}`;
};

export default function FoodDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { foodId } = (route?.params ?? {}) as { foodId: number };
  const id = foodId;

  // State for food data
  const [food, setFood] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [similarFoods, setSimilarFoods] = useState<any[]>([]);
  const [toppings, setToppings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingToppings, setLoadingToppings] = useState(false);

  // Fetch food data from API
  useEffect(() => {
    const fetchFoodData = async () => {
      try {
        setLoading(true);
        
        // Fetch food details
        const foodResponse = await fetch(`${API_CONFIG.BASE_URL}/menu/items/${id}/`);
        if (!foodResponse.ok) {
          console.error('Failed to fetch food details');
          navigation.goBack();
          return;
        }
        
        const foodData = await foodResponse.json();
        setFood(foodData);

        // Fetch similar foods (same category)
        if (foodData.category?.id) {
          const similarResponse = await fetch(`${API_CONFIG.BASE_URL}/menu/categories/${foodData.category.id}/foods/`);
          if (similarResponse.ok) {
            const similarData = await similarResponse.json();
            // Filter out current food and limit to 10
            const filtered = similarData.results?.filter((f: any) => f.id !== foodData.id).slice(0, 10) || [];
            setSimilarFoods(filtered);
          }
        }
        
      } catch (error) {
        console.error('Error fetching food data:', error);
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchFoodData();
    }
  }, [id, navigation]);

  const gallery = useMemo(() => {
    if (!food) return [];
    const images = [];
    if (food.image) {
      images.push({ uri: getImageUrl(food.image) });
    }
    return images.length > 0 ? images : [{ uri: 'https://via.placeholder.com/400x260' }];
  }, [food]);

  const [quantity, setQuantity] = useState(1);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<Record<number, number>>({}); // {toppingId: quantity}
  const [isFavorite, setIsFavorite] = useState(false);
  const [showAdded, setShowAdded] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("favorites");
      if (saved && food) {
        const arr = JSON.parse(saved) as any[];
        setIsFavorite(arr.some((x) => x.id === food.id));
      }
    })();
  }, [food]);

  const toggleFavorite = async () => {
    if (!food) return;
    const saved = await AsyncStorage.getItem("favorites");
    const arr = saved ? (JSON.parse(saved) as any[]) : [];
    const exists = arr.find((x) => x.id === food.id);
    let next: any[];
    if (exists) {
      next = arr.filter((x) => x.id !== food.id);
      setIsFavorite(false);
    } else {
      next = [...arr, {
        id: food.id,
        name: food.title || food.name,
        restaurant: food.store?.store_name || food.restaurant,
        rating: food.average_rating?.toFixed(1) ?? '0.0',
        price: food.price,
        image: food.image,
      }];
      setIsFavorite(true);
    }
    await AsyncStorage.setItem("favorites", JSON.stringify(next));
  };

  const sizes = food?.sizes || [];
  
  // Sort sizes by price ascending (cheapest first)
  const sortedSizes = useMemo(() => {
    return [...sizes].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  }, [sizes]);
  
  // Helper functions for size management
  const getSelectedSize = () => {
    if (!selectedSizeId) return null;
    return sortedSizes.find(s => s.id === selectedSizeId) || null;
  };
  
  const getBasePrice = () => {
    const basePrice = parseFloat(food?.price || '0');
    return basePrice;
  };
  
  const getSizePrice = () => {
    const selectedSize = getSelectedSize();
    return selectedSize ? parseFloat(selectedSize.price) : 0;
  };
  
  // Auto-select first size (cheapest) if available and none selected
  useEffect(() => {
    if (sortedSizes.length > 0 && selectedSizeId === null) {
      setSelectedSizeId(sortedSizes[0].id);
    }
  }, [sortedSizes, selectedSizeId]);

  // Fetch toppings when food is loaded
  useEffect(() => {
    const fetchToppings = async () => {
      if (!food?.store?.id) return;
      
      try {
        setLoadingToppings(true);
        const response = await fetch(`${API_CONFIG.BASE_URL}/menu/items/?category=8&store=${food.store.id}`);
        if (response.ok) {
          const data = await response.json();
          setToppings(data.results || []);
        } else {
          console.error('Failed to fetch toppings');
          setToppings([]);
        }
      } catch (error) {
        console.error('Error fetching toppings:', error);
        setToppings([]);
      } finally {
        setLoadingToppings(false);
      }
    };

    fetchToppings();
  }, [food?.store?.id]);

  const toggleTopping = (toppingId: number) => {
    setSelectedToppings((prev) => {
      const newToppings = { ...prev };
      if (newToppings[toppingId]) {
        delete newToppings[toppingId]; // Remove if exists
      } else {
        newToppings[toppingId] = 1; // Add with quantity 1
      }
      return newToppings;
    });
  };

  const updateToppingQuantity = (toppingId: number, quantity: number) => {
    if (quantity <= 0) {
      setSelectedToppings((prev) => {
        const newToppings = { ...prev };
        delete newToppings[toppingId];
        return newToppings;
      });
    } else {
      setSelectedToppings((prev) => ({
        ...prev,
        [toppingId]: quantity
      }));
    }
  };

  const basePrice = useMemo(() => parsePrice(food?.price), [food?.price]);

  const totalPrice = useMemo(() => {
    // Calculate base price and size price multiplied by main item quantity
    const mainItemPrice = (basePrice + getSizePrice()) * quantity;
    
    // Calculate toppings price (already includes topping quantities, don't multiply by main quantity)
    const toppingsPrice = Object.entries(selectedToppings).reduce((acc, [toppingIdStr, toppingQuantity]) => {
      const toppingId = parseInt(toppingIdStr);
      const topping = toppings.find(t => t.id === toppingId);
      return acc + (topping ? parseFloat(topping.price) * toppingQuantity : 0);
    }, 0);
    
    return mainItemPrice + toppingsPrice;
  }, [basePrice, selectedSizeId, selectedToppings, quantity, toppings]);

  // Show loading state
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 16, fontFamily: Fonts.LeagueSpartanRegular }}>Đang tải...</Text>
      </View>
    );
  }

  if (!food) return null;

  const handleAddToCart = async () => {
    if (!food) return;
    
    try {
      const selectedSize = getSelectedSize();
      
      // Add main food item
      const mainItemData = {
        food_id: food.id,
        quantity: quantity,
        food_option_id: selectedSizeId,
        item_note: null
      };
      
      console.log('Adding main item to cart via API:', mainItemData);
      
      // Try using the cartService which handles auth properly
      try {
        const result = await cartService.addToCart(mainItemData);
        console.log('Main item added via service:', result);
        
        // Add each topping as a separate item using the service
        const toppingPromises = Object.entries(selectedToppings).map(async ([toppingIdStr, toppingQuantity]) => {
          const toppingId = parseInt(toppingIdStr);
          
          const toppingData = {
            food_id: toppingId,
            quantity: toppingQuantity,
            item_note: `Topping for ${food.title}`
          };
          
          try {
            const toppingResult = await cartService.addToCart(toppingData);
            console.log('Topping added via service:', toppingResult);
            return toppingResult;
          } catch (toppingError) {
            console.error('Failed to add topping via service:', toppingId, toppingError);
            return null;
          }
        });
        
        // Wait for all toppings to be added
        await Promise.all(toppingPromises);
        
        setShowAdded(true);
        setTimeout(() => setShowAdded(false), 1800);
        return;
      } catch (serviceError) {
        console.error('Error using cart service, falling back to direct API call:', serviceError);
      }
      
      // Fallback to direct API call with manually added token
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      
      if (!token) {
        console.error('No authentication token found! User might not be logged in.');
        await handleAddToCartFallback();
        return;
      }
      
      // Include Authorization header with token
      const mainResponse = await fetch(`${API_CONFIG.BASE_URL}/cart/add/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(mainItemData)
      });
      
      if (mainResponse.ok) {
        const mainResult = await mainResponse.json();
        console.log('Main item added:', mainResult);
        
        // Add each topping as a separate item
        const toppingPromises = Object.entries(selectedToppings).map(async ([toppingIdStr, toppingQuantity]) => {
          const toppingId = parseInt(toppingIdStr);
          
          const toppingData = {
            food_id: toppingId,
            quantity: toppingQuantity,
            item_note: `Topping for ${food.title}`
          };
          
          // Also include Authorization header for topping requests
          const toppingResponse = await fetch(`${API_CONFIG.BASE_URL}/cart/add/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(toppingData)
          });
          
          if (toppingResponse.ok) {
            const toppingResult = await toppingResponse.json();
            console.log('Topping added:', toppingResult);
            return toppingResult;
          } else {
            console.error('Failed to add topping:', toppingId);
            return null;
          }
        });
        
        // Wait for all toppings to be added
        await Promise.all(toppingPromises);
        
        setShowAdded(true);
        setTimeout(() => setShowAdded(false), 1800);
      } else {
        console.error('Main item API error:', mainResponse.status, mainResponse.statusText);
        // Fallback to AsyncStorage
        await handleAddToCartFallback();
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      // Fallback to AsyncStorage
      await handleAddToCartFallback();
    }
  };

  const handleAddToCartFallback = async () => {
    if (!food) return;
    
    console.log('Using fallback cart storage method');
    
    // Last resort: fall back to AsyncStorage
    try {
      const selectedSize = getSelectedSize();
      
      // Calculate toppings price (don't multiply by main quantity)
      const toppingsPrice = Object.entries(selectedToppings).reduce((acc, [toppingIdStr, toppingQuantity]) => {
        const toppingId = parseInt(toppingIdStr);
        const topping = toppings.find(t => t.id === toppingId);
        return acc + (topping ? parseFloat(topping.price) * toppingQuantity : 0);
      }, 0);
      
      const toppingNames = Object.entries(selectedToppings).map(([toppingIdStr, toppingQuantity]) => {
        const toppingId = parseInt(toppingIdStr);
        const topping = toppings.find(t => t.id === toppingId);
        return topping ? `${topping.title} (x${toppingQuantity})` : '';
      }).filter(name => name);
      
      // Main item price includes base + size, multiplied by quantity
      const mainItemPrice = (basePrice + getSizePrice()) * quantity;
      
      const cartItem = {
        id: food.id,
        name: food.title,
        restaurant: food.store?.store_name,
        price: mainItemPrice + toppingsPrice, // Total price for this cart item
        originalPrice: basePrice,
        image: food.image,
        quantity,
        size: selectedSize?.size_name || null,
        sizeId: selectedSizeId,
        toppings: toppingNames,
        toppingQuantities: selectedToppings,
        totalPrice,
      };
      
      try {
        const existingCart = await AsyncStorage.getItem('@cart');
        const currentCart = existingCart ? JSON.parse(existingCart) : [];
        
        const existingIndex = currentCart.findIndex((item: any) => 
          item.id === cartItem.id && 
          item.sizeId === cartItem.sizeId &&
          JSON.stringify(item.toppingQuantities) === JSON.stringify(cartItem.toppingQuantities)
        );
        
        if (existingIndex !== -1) {
          currentCart[existingIndex].quantity += cartItem.quantity;
          currentCart[existingIndex].price += cartItem.price;
        } else {
          currentCart.push(cartItem);
        }
        
        await AsyncStorage.setItem('@cart', JSON.stringify(currentCart));
        console.log('Saved to local cart storage');
        setShowAdded(true);
        setTimeout(() => setShowAdded(false), 1800);
      } catch (error) {
        console.error('Error saving to cart:', error);
      }
    } catch (error) {
      console.error('Error in fallback cart handling:', error);
    }
  };

  if (!food) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {showAdded && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>Đã thêm vào giỏ hàng</Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / width);
              if (i !== currentImage) setCurrentImage(i);
            }}
            scrollEventThrottle={16}
          >
            {gallery.map((src, idx) => (
              <Image key={idx} source={{ uri: src.uri || 'https://via.placeholder.com/400x260' }} style={styles.heroImg} resizeMode="cover" />
            ))}
          </ScrollView>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.navBtnLeft}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="#391713" />
          </TouchableOpacity>

          <View style={styles.navRight}>
            <TouchableOpacity onPress={toggleFavorite} style={styles.circleBtn} activeOpacity={0.8}>
              <Heart
                size={20}
                color={isFavorite ? ORANGE : "#9ca3af"}
                fill={isFavorite ? ORANGE : "transparent"}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.circleBtn} activeOpacity={0.8}>
              <MoreHorizontal size={20} color="#391713" />
            </TouchableOpacity>
          </View>

          <View style={styles.dots}>
            {gallery.map((_, i) => (
              <View key={i} style={[styles.dot, { opacity: i === currentImage ? 1 : 0.5 }]} />
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.title}>{food?.title || 'Món ăn'}</Text>
            <Text style={[styles.restaurant, { color: "#6b7280" }]}>{food?.store?.store_name || 'Nhà hàng'}</Text>
          </View>

          {/* rating */}
          {food?.rating_count && food.rating_count > 0 ? (
            <TouchableOpacity 
              style={styles.ratingRow}
              onPress={() => navigation.navigate("FoodReviews", { id: String(food.id) })}
              activeOpacity={0.7}
            >
              <Star size={16} color={ORANGE} fill={ORANGE} />
              <Text style={styles.ratingText}>{(food.average_rating ?? 0).toFixed(1)}</Text>
              <Text style={styles.ratingSub}>({food.rating_count} đánh giá)</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.noReviewsContainer}>
              <Text style={styles.noReviewsText}>Chưa có đánh giá nào</Text>
            </View>
          )}

          {/* price + qty */}
          <View style={styles.priceRow}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.price}>{formatPriceWithCurrency(food?.price)}</Text>
            </View>

            <View style={styles.qtyWrap}>
              <TouchableOpacity onPress={() => setQuantity((q) => Math.max(1, q - 1))} style={styles.qtyBtnGray} activeOpacity={0.85}>
                <Minus size={16} color={BROWN} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity onPress={() => setQuantity((q) => q + 1)} style={styles.qtyBtnOrange} activeOpacity={0.85}>
                <Plus size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* description */}
          {food?.description && (
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.sectionTitle}>Mô tả</Text>
              <Text style={styles.desc}>{food.description}</Text>
            </View>
          )}

          {/* size */}
          {sortedSizes.length > 0 && (
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.sectionTitle}>Chọn size</Text>
              <View style={styles.sizeGrid}>
                {sortedSizes.map((s: any) => {
                  const active = selectedSizeId === s.id;
                  const price = parseFloat(s.price);
                  return (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setSelectedSizeId(s.id)}
                      style={[styles.sizeItem, active && styles.sizeItemActive]}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.sizeName, active && { color: BROWN }]}>{s.size_name}</Text>
                      {price > 0 && <Text style={styles.sizePlus}>+{price.toLocaleString('vi-VN')} VND</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* toppings */}
          {toppings.length > 0 && (
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.sectionTitle}>Thêm topping</Text>
              <View>
                {toppings.map((t: any) => {
                  const active = selectedToppings[t.id] > 0;
                  const currentQuantity = selectedToppings[t.id] || 0;
                  const price = parseFloat(t.price);
                  return (
                    <View
                      key={t.id}
                      style={[styles.topItem, active && styles.topItemActive]}
                    >
                      <TouchableOpacity
                        onPress={() => toggleTopping(t.id)}
                        style={{ flex: 1 }}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.topName}>{t.title}</Text>
                        <Text style={styles.topPrice}>+{price.toLocaleString('vi-VN')} VND</Text>
                      </TouchableOpacity>
                      
                      {active && (
                        <View style={styles.qtyWrap}>
                          <TouchableOpacity 
                            onPress={() => updateToppingQuantity(t.id, Math.max(0, currentQuantity - 1))} 
                            style={styles.qtyBtnGray} 
                            activeOpacity={0.85}
                          >
                            <Minus size={16} color={BROWN} />
                          </TouchableOpacity>
                          <Text style={styles.qtyText}>{currentQuantity}</Text>
                          <TouchableOpacity 
                            onPress={() => updateToppingQuantity(t.id, currentQuantity + 1)} 
                            style={styles.qtyBtnGray} 
                            activeOpacity={0.85}
                          >
                            <Plus size={16} color={BROWN} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Delivery */}
          <View style={styles.deliveryBox}>
            <View style={styles.deliveryRow}>
              <Clock size={20} color={ORANGE} />
              <Text style={styles.deliveryMain}>Giao trong 20-30 phút</Text>
            </View>
            <View style={styles.deliveryRow}>
              <Truck size={20} color={ORANGE} />
              <Text style={styles.deliverySub}>
                Miễn phí vận chuyển cho đơn từ 100.000 VND
              </Text>
            </View>
          </View>

          {/* Similar */}
          <View>
            <Text style={styles.sectionTitle}>Món tương tự</Text>
            <FlatList
              data={similarFoods}
              keyExtractor={(i) => String(i.id)}
              horizontal
              showsHorizontalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              contentContainerStyle={{ paddingRight: 6 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => navigation.navigate("FoodDetail", { foodId: item.id })}
                  activeOpacity={0.9}
                  style={styles.similarCard}
                >
                  <Image 
                    source={{ uri: getImageUrl(item.image) || 'https://via.placeholder.com/160x96' }} 
                    style={styles.similarImg} 
                  />
                  <View style={{ padding: 10 }}>
                    <Text numberOfLines={2} style={styles.similarName}>{item.title}</Text>
                    <View style={styles.similarRating}>
                      <Star size={12} color={ORANGE} fill={ORANGE} />
                      <Text style={styles.similarRatingText}>{(item.average_rating ?? 0).toFixed(1)}</Text>
                    </View>
                    <Text style={styles.similarPrice}>{formatPriceWithCurrency(item.price)}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom action (giữ absolute) */}
      <View style={styles.bottomWrap}>
        <View style={styles.summary}>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Số lượng:</Text>
            <Text style={styles.sumValue}>{quantity}</Text>
          </View>
          {sortedSizes.length > 0 && (
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Size:</Text>
              <Text style={styles.sumValue}>{getSelectedSize()?.size_name || 'Chưa chọn'}</Text>
            </View>
          )}
          {Object.keys(selectedToppings).length > 0 && (
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Topping:</Text>
              <Text style={styles.sumValue}>
                {Object.entries(selectedToppings).map(([toppingIdStr, quantity]) => {
                  const toppingId = parseInt(toppingIdStr);
                  const topping = toppings.find(t => t.id === toppingId);
                  return topping ? `${topping.title} (x${quantity})` : '';
                }).filter(name => name).join(", ")}
              </Text>
            </View>
          )}
          <View style={[styles.sumRow, styles.sumTotalRow]}>
            <Text style={styles.sumTotalLabel}>Tổng tiền:</Text>
            <Text style={styles.sumTotalValue}>{totalPrice.toLocaleString('vi-VN')} VND</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={handleAddToCart} activeOpacity={0.9} style={styles.btnGray}>
            <ShoppingCart size={20} color={BROWN} />
            <Text style={styles.btnGrayText}>Thêm vào giỏ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              if (!food) {
                return;
              }

              const toppingsPrice = Object.entries(selectedToppings).reduce((acc, [toppingIdStr, toppingQuantity]) => {
                const toppingId = parseInt(toppingIdStr);
                const topping = toppings.find(t => t.id === toppingId);
                return acc + (topping ? parseFloat(topping.price) * toppingQuantity : 0);
              }, 0);
              
              const toppingNames = Object.entries(selectedToppings).map(([toppingIdStr, toppingQuantity]) => {
                const toppingId = parseInt(toppingIdStr);
                const topping = toppings.find(t => t.id === toppingId);
                return topping ? `${topping.title} (x${toppingQuantity})` : '';
              }).filter(name => name);
              
              const selectedSize = getSelectedSize();
              const subtotal = totalPrice;

              const checkoutItem = {
                id: food?.id, 
                name: food?.title, 
                restaurant: food?.store?.store_name,
                price: (basePrice + getSizePrice()) * quantity + toppingsPrice, // Correct calculation
                originalPrice: basePrice, 
                image: food?.image,
                quantity, 
                size: getSelectedSize()?.size_name || null, 
                sizeId: selectedSizeId,
                toppings: toppingNames, 
                toppingQuantities: selectedToppings,
                totalPrice,
              };
              await AsyncStorage.setItem("checkoutItem", JSON.stringify(checkoutItem));

              const storePayload = food.store ? {
                id: food.store.id ?? 0,
                store_name: food.store.store_name ?? 'Nhà hàng',
                address: food.store.address ?? null,
                latitude: food.store.latitude ?? null,
                longitude: food.store.longitude ?? null,
              } : {
                id: 0,
                store_name: 'Nhà hàng',
                address: null,
                latitude: null,
                longitude: null,
              };

              const buyNowPayload = {
                id: Date.now(),
                food_id: food.id,
                food_option_id: selectedSizeId ?? undefined,
                quantity,
                item_note: null,
                subtotal,
                food: {
                  id: food.id,
                  title: food.title,
                  price: parseFloat(String(food.price ?? 0)),
                  image: food.image,
                  store: storePayload,
                },
                size: selectedSize ? {
                  id: selectedSize.id,
                  size_name: selectedSize.size_name,
                  price: parseFloat(String(selectedSize.price ?? 0)),
                } : undefined,
                customToppings: toppingNames,
              };

              navigation.navigate("Checkout", {
                selectedIds: [food.id],
                selectedCartItems: [buyNowPayload],
                fromBuyNow: true,
              });
            }}
            activeOpacity={0.9}
            style={styles.btnOrange}
          >
            <Zap size={20} color="#fff" />
            <Text style={styles.btnOrangeText}>Mua ngay</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  toast: {
    position: "absolute",
    top: 16,
    left: "50%",
    transform: [{ translateX: -(width * 0.5) + 16 }],
    zIndex: 50,
    backgroundColor: ORANGE,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  toastText: { color: "#fff", fontSize: 13, fontFamily: Fonts.LeagueSpartanSemiBold },

  heroWrap: { position: "relative" },
  heroImg: {
    width,
    height: 260,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  navBtnLeft: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 999,
    elevation: 2,
  },
  navRight: { position: "absolute", top: 16, right: 16, flexDirection: "row", gap: 8 },
  circleBtn: { backgroundColor: "#fff", padding: 10, borderRadius: 999, elevation: 2 },
  dots: {
    position: "absolute",
    bottom: 12,
    left: 0, right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: "#fff" },

  content: { flex: 1 },

  title: { color: BROWN, fontSize: 22, marginBottom: 6, fontFamily: Fonts.LeagueSpartanExtraBold },
  restaurant: { color: ORANGE, fontSize: 13, fontFamily: Fonts.LeagueSpartanSemiBold },

  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  ratingText: { color: BROWN, fontSize: 13, fontFamily: Fonts.LeagueSpartanExtraBold },
  ratingSub: { color: "#6b7280", fontSize: 13, fontFamily: Fonts.LeagueSpartanRegular },

  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  price: { color: ORANGE, fontSize: 20, fontFamily: Fonts.LeagueSpartanExtraBold },

  qtyWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtnGray: { backgroundColor: "#f3f4f6", padding: 10, borderRadius: 999 },
  qtyBtnOrange: { backgroundColor: ORANGE, padding: 10, borderRadius: 999 },
  qtyText: { minWidth: 28, textAlign: "center", color: BROWN, fontSize: 18, fontFamily: Fonts.LeagueSpartanBold },

  sectionTitle: { color: BROWN, fontSize: 18, marginBottom: 10, fontFamily: Fonts.LeagueSpartanBold },
  desc: { color: "#6b7280", lineHeight: 20, fontSize: 14, fontFamily: Fonts.LeagueSpartanRegular },

  sizeGrid: { flexDirection: "row", gap: 8 },
  sizeItem: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  sizeItemActive: { borderColor: ORANGE, backgroundColor: "rgba(233,83,34,0.1)" },
  sizeName: { color: "#6b7280", fontSize: 14, fontFamily: Fonts.LeagueSpartanSemiBold },
  sizePlus: { color: ORANGE, fontSize: 12, marginTop: 2, fontFamily: Fonts.LeagueSpartanRegular },

  topItem: {
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topItemActive: { borderColor: ORANGE, backgroundColor: "rgba(233,83,34,0.1)" },
  topName: { color: BROWN, fontSize: 14, fontFamily: Fonts.LeagueSpartanSemiBold },
  topPrice: { color: ORANGE, fontSize: 14, fontFamily: Fonts.LeagueSpartanSemiBold },

  deliveryBox: {
    backgroundColor: "rgba(233,83,34,0.1)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  deliveryRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  deliveryMain: { color: BROWN, fontFamily: Fonts.LeagueSpartanSemiBold },
  deliverySub: { color: BROWN, fontSize: 13, fontFamily: Fonts.LeagueSpartanRegular },

  reviewCard: { backgroundColor: "#f9fafb", borderRadius: 14, padding: 14, marginBottom: 10 },
  reviewHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  avatar: { width: 32, height: 32, borderRadius: 999, backgroundColor: ORANGE, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 12, fontFamily: Fonts.LeagueSpartanExtraBold },
  reviewName: { color: BROWN, fontSize: 14, fontFamily: Fonts.LeagueSpartanBold },
  reviewText: { color: "#6b7280", fontSize: 14, marginTop: 4, marginBottom: 2, fontFamily: Fonts.LeagueSpartanRegular },
  moreReviews: { color: ORANGE, fontSize: 13, fontFamily: Fonts.LeagueSpartanSemiBold },

  similarCard: {
    width: 160,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    overflow: "hidden",
    elevation: 1,
  },
  similarImg: { width: 160, height: 96 },
  similarName: { color: BROWN, fontSize: 14, fontFamily: Fonts.LeagueSpartanSemiBold },
  similarRating: { flexDirection: "row", alignItems: "center", marginTop: 4, marginBottom: 6, gap: 4 },
  similarRatingText: { color: "#6b7280", fontSize: 12, fontFamily: Fonts.LeagueSpartanRegular },
  similarPrice: { color: ORANGE, fontSize: 14, fontFamily: Fonts.LeagueSpartanExtraBold },

  bottomWrap: {
    position: "absolute",
    left: 0, right: 0, bottom: 20,
    paddingHorizontal: 24,
  },
  summary: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  sumRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  sumLabel: { color: "#6b7280", fontSize: 12, fontFamily: Fonts.LeagueSpartanRegular },
  sumValue: { color: BROWN, fontSize: 12, maxWidth: width * 0.6, textAlign: "right", fontFamily: Fonts.LeagueSpartanSemiBold },
  sumTotalRow: { paddingTop: 6, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  sumTotalLabel: { color: BROWN, fontFamily: Fonts.LeagueSpartanExtraBold },
  sumTotalValue: { color: ORANGE, fontFamily: Fonts.LeagueSpartanExtraBold },

  actions: { flexDirection: "row", gap: 10 },
  btnGray: {
    flex: 1, backgroundColor: "#f3f4f6", borderRadius: 14,
    paddingVertical: 12, alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 8,
  },
  btnGrayText: { color: BROWN, fontFamily: Fonts.LeagueSpartanExtraBold },
  btnOrange: {
    flex: 1, backgroundColor: ORANGE, borderRadius: 14,
    paddingVertical: 12, alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 8,
  },
  btnOrangeText: { color: "#fff", fontFamily: Fonts.LeagueSpartanExtraBold },
  
  noReviewsContainer: {
    backgroundColor: "#f9fafb",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 12,
    alignItems: "center",
  },
  noReviewsText: {
    color: "#6b7280",
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
});
