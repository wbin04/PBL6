import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API, getImageUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { paymentService } from "@/services/paymentService";
import { AddressPicker } from "@/components/AddressPicker";
import { locationService } from "@/services/locationService";
import {
  promotionsService,
  type Promotion,
  type AppliedPromo,
} from "@/services/promotionsService";
import { MapPin } from "lucide-react";

// Types
type CartItem = {
  id: number;
  food: {
    id: number;
    title: string;
    price: string;
    image?: string;
    image_url?: string;
    store_name: string;
    store?: {
      id?: number;
      store_name?: string;
      address?: string | null;
      latitude?: number | string | null;
      longitude?: number | string | null;
    };
  };
  food_option?: {
    id: number;
    size_name: string;
    price: string;
  };
  quantity: number;
  item_note?: string;
  subtotal: string;
};

type Cart = {
  id: number;
  total_money: string;
  items_count: number;
  items: CartItem[];
};

type StoreDeliveryInfo = {
  id?: number;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type StoreDeliveryMetrics = {
  distanceKm: number | null;
  fee: number;
  store: StoreDeliveryInfo;
};

const SHIPPING_BASE_FEE = 15000;
const SHIPPING_FEE_PER_KM = 4000;
const EARTH_RADIUS_KM = 6371;

const parseCoordinate = (value: unknown): number | null => {
  const numericValue =
    typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const haversineDistanceKm = (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): number => {
  const dLat = ((destLat - originLat) * Math.PI) / 180;
  const dLon = ((destLng - originLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((originLat * Math.PI) / 180) *
      Math.cos((destLat * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

const normalizeCoordinateForPayload = (value: number | null) => {
  if (value == null || Number.isNaN(value)) return null;
  return parseFloat(Number(value).toFixed(6));
};

const Checkout: React.FC = () => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [selectedPromos, setSelectedPromos] = useState<Promotion[]>([]);
  const [appliedPromos, setAppliedPromos] = useState<AppliedPromo[]>([]);
  const [isLoadingPromos, setIsLoadingPromos] = useState(false);
  const [isApplyingPromos, setIsApplyingPromos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customerCoordinates, setCustomerCoordinates] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({
    latitude: null,
    longitude: null,
  });
  const [storeInfoMap, setStoreInfoMap] = useState<
    Record<string, StoreDeliveryInfo>
  >({});
  const [storeDeliveryDetails, setStoreDeliveryDetails] = useState<
    Record<string, StoreDeliveryMetrics>
  >({});
  const [showPromoModal, setShowPromoModal] = useState(false);
  const storeNameById = useMemo(() => {
    const map: Record<number, string> = {};
    Object.values(storeInfoMap).forEach((info) => {
      if (typeof info.id === "number") {
        map[info.id] = info.name;
      }
    });
    return map;
  }, [storeInfoMap]);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [isComputingDelivery, setIsComputingDelivery] = useState(false);
  const geocodeCacheRef = useRef<
    Record<string, { latitude: number; longitude: number }>
  >({});

  // Tooltip state for voucher details
  const [hoveredPromo, setHoveredPromo] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Form data
  const [formData, setFormData] = useState({
    receiver_name: "",
    phone_number: "",
    ship_address: "",
    note: "",
    payment_method: "COD" as "COD" | "ONLINE",
  });

  const navigate = useNavigate();
  const location = useLocation();
  const selectionState = (location.state || {}) as {
    selectedItemIds?: number[];
  };

  const buildStoreInfoFromItems = useCallback((items: CartItem[]) => {
    const storeMap: Record<string, StoreDeliveryInfo> = {};

    items.forEach((item) => {
      const foodData = item.food as Record<string, any>;
      const storeData = (foodData.store || {}) as Record<string, any>;
      const name =
        storeData.store_name || foodData.store_name || "Cửa hàng chưa xác định";

      if (storeMap[name]) return;

      storeMap[name] = {
        id: storeData.id,
        name,
        address: storeData.address || null,
        latitude: parseCoordinate(storeData.latitude),
        longitude: parseCoordinate(storeData.longitude),
      };
    });

    return storeMap;
  }, []);

  useEffect(() => {
    const loadCart = async () => {
      try {
        const response = (await API.get("/cart/")) as Cart;

        const selectedIds = selectionState.selectedItemIds || [];
        let finalItems = response.items;
        let storeMap: Record<string, StoreDeliveryInfo> = {};

        if (selectedIds.length > 0) {
          finalItems = response.items.filter((item) =>
            selectedIds.includes(item.id)
          );

          // Recalculate summary fields based on selection
          const recalculatedTotal = finalItems.reduce((sum, item) => {
            const itemSubtotal = parseFloat(item.subtotal || "0") || 0;
            return sum + itemSubtotal;
          }, 0);

          const filteredCart: Cart = {
            ...response,
            items: finalItems,
            items_count: finalItems.length,
            total_money: recalculatedTotal.toString(),
          };

          setCart(filteredCart);
          storeMap = buildStoreInfoFromItems(finalItems);
          setStoreInfoMap(storeMap);
        } else {
          setCart(response);
          storeMap = buildStoreInfoFromItems(response.items);
          setStoreInfoMap(storeMap);
        }

        return storeMap;
      } catch (error) {
        console.error("Error loading cart:", error);
        alert("Lỗi khi tải giỏ hàng. Vui lòng thử lại!");
        navigate("/cart");
        return {};
      }
    };

    const loadPromos = async (
      storeMap: Record<string, StoreDeliveryInfo>
    ): Promise<void> => {
      const storeIds = Object.values(storeMap)
        .map((info) => info.id)
        .filter((id): id is number => typeof id === "number");

      try {
        setIsLoadingPromos(true);
        const promoRequests = [
          promotionsService.getPromotions(0),
          ...storeIds.map((id) => promotionsService.getPromotions(id)),
        ];

        const results = await Promise.all(promoRequests);
        const merged = results.flat();
        const deduped = merged.filter(
          (promo, index, self) =>
            index === self.findIndex((p) => p.id === promo.id)
        );
        setPromos(deduped);
      } catch (error) {
        console.error("Error loading promos:", error);
        setPromos([]);
      } finally {
        setIsLoadingPromos(false);
      }
    };

    const loadUserProfile = async () => {
      try {
        const response = await API.get("/auth/profile/");
        console.log("User profile loaded:", response);
        // Điền mặc định thông tin người dùng vào form
        const profile = response as {
          fullname?: string;
          phone_number?: string;
          address?: string;
          latitude?: number | string | null;
          longitude?: number | string | null;
        };
        setFormData((prev) => ({
          ...prev,
          receiver_name: profile.fullname || "",
          phone_number: profile.phone_number || "",
          ship_address: profile.address || "",
        }));
        setCustomerCoordinates({
          latitude: parseCoordinate(profile.latitude),
          longitude: parseCoordinate(profile.longitude),
        });
      } catch (error) {
        console.error("Error loading user profile:", error);
        // Không cần thông báo lỗi, chỉ để form trống
      }
    };

    const fetchData = async () => {
      try {
        setLoading(true);
        const storeMap = await loadCart();
        await loadPromos(storeMap);
        await loadUserProfile();
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, selectionState.selectedItemIds, buildStoreInfoFromItems]);

  // Helper function to get minimum order value from backend data
  const getPromoMinOrder = (promo: Promotion): number => {
    const minValue = promo.minimum_pay ?? promo.min_order_value;
    const numeric =
      typeof minValue === "string" ? parseFloat(minValue) : Number(minValue || 0);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const calculateDeliveryFee = useCallback((distanceKm: number | null) => {
    if (distanceKm == null || Number.isNaN(distanceKm)) {
      return SHIPPING_BASE_FEE;
    }
    const fee = SHIPPING_BASE_FEE + distanceKm * SHIPPING_FEE_PER_KM;
    return Math.max(SHIPPING_BASE_FEE, Math.round(fee));
  }, []);

  const formatDistanceLabel = (distanceKm: number | null) => {
    if (distanceKm == null || Number.isNaN(distanceKm)) {
      return "Đang tạm tính";
    }
    return `${distanceKm.toFixed(2)} km`;
  };

  useEffect(() => {
    let isCancelled = false;

    const loadDrivingDistances = async () => {
      if (!cart || Object.keys(storeInfoMap).length === 0) {
        if (!isCancelled) {
          setStoreDeliveryDetails({});
          setIsComputingDelivery(false);
        }
        return;
      }

      setIsComputingDelivery(true);
      const customerLat = customerCoordinates.latitude;
      const customerLon = customerCoordinates.longitude;

      const entries = await Promise.all(
        Object.entries(storeInfoMap).map(async ([storeName, info]) => {
          let storeLat = parseCoordinate(info.latitude);
          let storeLon = parseCoordinate(info.longitude);

          if ((storeLat == null || storeLon == null) && info.address) {
            const cached = geocodeCacheRef.current[info.address];
            if (cached) {
              storeLat = cached.latitude;
              storeLon = cached.longitude;
            } else {
              try {
                const geocoded = await locationService.geocodeAddress(
                  info.address
                );
                storeLat = geocoded.latitude;
                storeLon = geocoded.longitude;
                geocodeCacheRef.current[info.address] = {
                  latitude: storeLat,
                  longitude: storeLon,
                };
              } catch (error) {
                console.warn(
                  "Không thể tìm toạ độ cho cửa hàng",
                  info.id || storeName,
                  error
                );
              }
            }
          }

          let distanceKm: number | null = null;
          const hasAllCoordinates =
            storeLat != null &&
            storeLon != null &&
            customerLat != null &&
            customerLon != null;

          if (hasAllCoordinates) {
            distanceKm = parseFloat(
              haversineDistanceKm(
                storeLat!,
                storeLon!,
                customerLat!,
                customerLon!
              ).toFixed(2)
            );

            try {
              const drivingDistance = await locationService.getDrivingDistanceKm(
                { latitude: storeLat!, longitude: storeLon! },
                { latitude: customerLat!, longitude: customerLon! }
              );

              if (
                typeof drivingDistance === "number" &&
                !Number.isNaN(drivingDistance)
              ) {
                distanceKm = parseFloat(drivingDistance.toFixed(2));
              }
            } catch (error) {
              console.warn(
                "Không lấy được khoảng cách di chuyển thực tế cho",
                storeName,
                error
              );
            }
          }

          const metrics: StoreDeliveryMetrics = {
            distanceKm,
            fee: calculateDeliveryFee(distanceKm),
            store: {
              ...info,
              latitude: storeLat,
              longitude: storeLon,
            },
          };

          return [storeName, metrics] as const;
        })
      );

      if (isCancelled) {
        return;
      }

      const nextDetails: Record<string, StoreDeliveryMetrics> = {};
      entries.forEach((entry) => {
        if (!entry) return;
        const [storeName, metrics] = entry;
        nextDetails[storeName] = metrics;
      });

      setStoreDeliveryDetails(nextDetails);
      setIsComputingDelivery(false);
    };

    loadDrivingDistances().catch((error) => {
      console.error("Error computing delivery distances:", error);
      if (!isCancelled) setIsComputingDelivery(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [
    cart,
    storeInfoMap,
    customerCoordinates.latitude,
    customerCoordinates.longitude,
    calculateDeliveryFee,
  ]);

  const totalDeliveryFee = useMemo(() => {
    if (!cart) return 0;
    const storeNames = Object.keys(storeInfoMap);
    if (storeNames.length === 0) return 0;

    return storeNames.reduce((sum, storeName) => {
      const fee = storeDeliveryDetails[storeName]?.fee ?? SHIPPING_BASE_FEE;
      return sum + fee;
    }, 0);
  }, [cart, storeInfoMap, storeDeliveryDetails]);

  const storeSubtotalsByStoreId = useMemo(() => {
    const map: Record<number, number> = {};
    if (!cart) return map;

    cart.items.forEach((item) => {
      const foodData = item.food as Record<string, any>;
      const storeData = (foodData.store || {}) as Record<string, any>;
      const storeId = storeData.id;
      if (typeof storeId === "number") {
        const subtotal = parseFloat(item.subtotal || "0") || 0;
        map[storeId] = (map[storeId] || 0) + subtotal;
      }
    });

    return map;
  }, [cart]);

  const totalPromoDiscount = useMemo(() => {
    return appliedPromos.reduce((sum, ap) => sum + (ap.discount || 0), 0);
  }, [appliedPromos]);

  // Calculate totals
  const calculations = useMemo(() => {
    try {
      if (!cart) return { subtotal: 0, deliveryFee: 0, discount: 0, total: 0 };

      const subtotal = parseFloat(cart.total_money) || 0;
      const storeCount = Object.keys(storeInfoMap).length || 1;
      const estimatedFallbackFee =
        storeCount * (SHIPPING_BASE_FEE + SHIPPING_FEE_PER_KM * 3);
      const deliveryFee =
        totalDeliveryFee > 0 ? totalDeliveryFee : estimatedFallbackFee;

      const discount = totalPromoDiscount;
      const total = Math.max(0, subtotal + deliveryFee - discount);

      const result = {
        subtotal: isNaN(subtotal) ? 0 : subtotal,
        deliveryFee: isNaN(deliveryFee) ? 0 : deliveryFee,
        discount: isNaN(discount) ? 0 : discount,
        total: isNaN(total) ? 0 : total,
      };

      if (appliedPromos.length > 0) {
        console.log("Multiple promo calculation:", {
          appliedPromos,
          subtotal,
          deliveryFee,
          discount,
          total,
          result,
        });
      }

      return result;
    } catch (error) {
      console.error("Error in calculations:", error);
      return { subtotal: 0, deliveryFee: 0, discount: 0, total: 0 };
    }
  }, [
    cart,
    appliedPromos,
    storeInfoMap,
    totalDeliveryFee,
    totalPromoDiscount,
  ]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const togglePromoSelection = (promo: Promotion) => {
    setSelectedPromos((prev) => {
      const isSelected = prev.some((p) => p.id === promo.id);
      if (isSelected) {
        return prev.filter((p) => p.id !== promo.id);
      }

      const storeId = promo.store ?? promo.store_id;
      if (typeof storeId === "number") {
        const filtered = prev.filter((p) => (p.store ?? p.store_id) !== storeId);
        return [...filtered, promo];
      }

      return [...prev, promo];
    });
  };

  const applySelectedPromos = async () => {
    if (!selectedPromos.length) {
      alert("Vui lòng chọn ít nhất một mã giảm giá");
      return;
    }

    try {
      setIsApplyingPromos(true);
      const totalAmount = parseFloat(cart?.total_money || "0") || 0;

      const promosWithAmounts = selectedPromos.map((promo) => {
        const storeId = promo.store ?? promo.store_id;
        const storeAmount =
          storeId && storeId !== 0
            ? storeSubtotalsByStoreId[storeId] || 0
            : totalAmount;
        return { promo, storeAmount };
      });

      const result = await promotionsService.validateMultiplePromos(
        promosWithAmounts,
        totalAmount
      );

      setAppliedPromos(result.appliedPromos);
      if (result.appliedPromos.length > 0) {
        setSelectedPromos(result.appliedPromos.map((ap) => ap.promo));
      } else {
        alert("Không có mã nào hợp lệ cho đơn hàng này");
      }
    } catch (error) {
      console.error("Error applying promos:", error);
      alert("Không thể áp dụng mã giảm giá");
    } finally {
      setIsApplyingPromos(false);
    }
  };

  const removeAppliedPromo = (promoId: number) => {
    setAppliedPromos((prev) => prev.filter((ap) => ap.promo.id !== promoId));
    setSelectedPromos((prev) => prev.filter((p) => p.id !== promoId));
  };

  // Helper function to format voucher details for tooltip
  const getVoucherDetails = (promo: Promotion) => {
    const details: string[] = [];
    const discountType =
      promo.discount_type || (promo.category === "PERCENT" ? "PERCENT" : "AMOUNT");
    const isPercent =
      discountType === "PERCENT" || discountType === "PERCENTAGE";
    const maxDiscount = promo.max_discount ?? promo.max_discount_amount;

    if (isPercent) {
      details.push(`🎯 Giảm ${promo.discount_value}% giá trị đơn hàng`);
      if (maxDiscount) {
        details.push(`💰 Tối đa: ${formatCurrency(maxDiscount)}`);
      }
    } else {
      details.push(`💰 Giảm ${formatCurrency(promo.discount_value)} cho đơn hàng`);
    }

    details.push(`📦 Đơn tối thiểu: ${formatCurrency(getPromoMinOrder(promo))}`);

    const storeId = promo.store ?? promo.store_id;
    if (storeId && storeId !== 0) {
      const storeLabel = storeNameById[storeId]
        ? `Cửa hàng: ${storeNameById[storeId]}`
        : `Cửa hàng ID ${storeId}`;
      details.push(storeLabel);
    } else if (storeId === 0) {
      details.push("Áp dụng toàn hệ thống");
    }

    return details;
  };

  // Handle mouse events for tooltip
  const handlePromoMouseEnter = (e: React.MouseEvent, promoId: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.right + 10,
      y: rect.top,
    });
    setHoveredPromo(promoId);
  };

  const handlePromoMouseLeave = () => {
    setHoveredPromo(null);
  };

  const validateForm = () => {
    if (!formData.receiver_name.trim()) {
      alert("Vui lòng nhập tên người nhận");
      return false;
    }
    if (!formData.phone_number.trim()) {
      alert("Vui lòng nhập số điện thoại");
      return false;
    }
    if (!formData.ship_address.trim()) {
      alert("Vui lòng nhập địa chỉ giao hàng");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!cart || cart.items.length === 0) {
      alert("Giỏ hàng trống!");
      return;
    }

    // If payment method is ONLINE, handle payment flow first (like mobile)
    if (formData.payment_method === "ONLINE") {
      await handleOnlinePayment();
      return;
    }

    // For COD payment, create order directly
    await createOrderAndFinish();
  };

  // Build order payload from current form/cart state
  const buildOrderPayload = () => {
    const orderData: any = {
      ...formData,
      shipping_fee: calculations.deliveryFee,
      total_money: calculations.total,
    };

    if (appliedPromos.length > 0) {
      orderData.promo_ids = appliedPromos.map((ap) => ap.promo.id);
      orderData.discount_amount = totalPromoDiscount;
      orderData.promo_details = appliedPromos.map((ap) => ({
        promo_id: ap.promo.id,
        store_id: ap.promo.store ?? ap.promo.store_id ?? null,
        discount: ap.discount,
      }));
    }

    const shipLat = normalizeCoordinateForPayload(customerCoordinates.latitude);
    const shipLon = normalizeCoordinateForPayload(customerCoordinates.longitude);

    if (shipLat != null) orderData.ship_latitude = shipLat;
    if (shipLon != null) orderData.ship_longitude = shipLon;

    if (selectionState.selectedItemIds && selectionState.selectedItemIds.length > 0) {
      orderData.selected_item_ids = selectionState.selectedItemIds;
    }

    return orderData;
  };

  // Handle online payment - create payment link FIRST, then order after successful payment
  const handleOnlinePayment = async () => {
    try {
      setSubmitting(true);

      // Open popup IMMEDIATELY to avoid popup blocker
      const paymentWindow = window.open("about:blank", "_blank");
      if (!paymentWindow) {
        alert("Trình duyệt đang chặn cửa sổ thanh toán. Hãy bật cho phép popup cho trang này và thử lại.");
        setSubmitting(false);
        return;
      }

      // Show loading message in popup
      paymentWindow.document.write('<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial"><p>Đang tạo liên kết thanh toán...</p></body></html>');

      // Get user_id from token (decode JWT or fetch from profile)
      let userId: number | undefined;
      try {
        const profile = await API.get("/auth/profile/") as { id?: number };
        userId = profile.id;
      } catch (err) {
        console.warn("Could not get user profile for payment:", err);
      }

      // Use a temporary order id for PayOS; only create order after payment success
      const plannedOrderId = Date.now();
      const amount = Math.round(calculations.total);
      const message = `KH #${userId || 0} TT #${plannedOrderId}`;

      console.log("Creating PayOS payment link with:", {
        user_id: userId,
        order_id: plannedOrderId,
        amount,
        message,
      });

      // Create payment link using the real order_id
      const paymentData = await paymentService.createPaymentLink({
        order_id: plannedOrderId,
        amount,
        message,
        user_id: userId,
      });

      if (!paymentData.checkoutUrl) {
        paymentWindow.close();
        throw new Error("Không nhận được link thanh toán");
      }

      console.log("PayOS payment link created:", paymentData);

      // Navigate popup to PayOS checkout
      paymentWindow.location.href = paymentData.checkoutUrl;

      // Wait for payment result
      const finalStatus = await waitForPaymentResult(paymentWindow, paymentData.orderCode);

      if (finalStatus === "PAID") {
        // Payment successful - NOW create order and clear cart
        console.log("Payment successful! Creating order...");
        await createOrderAndFinish(true, plannedOrderId);
      } else if (finalStatus === "CANCELLED") {
        alert("Thanh toán đã bị hủy. Đơn hàng chưa được tạo.");
        setSubmitting(false);
      } else {
        alert("Không xác minh được thanh toán. Vui lòng thử lại.");
        setSubmitting(false);
      }
    } catch (error) {
      console.error("Payment error:", error);
      const errorMsg = error instanceof Error ? error.message : "Đã xảy ra lỗi";
      alert(`Lỗi thanh toán: ${errorMsg}`);
      setSubmitting(false);
    }
  };

  // Wait for payment result from popup
  const waitForPaymentResult = (paymentWindow: Window, orderCode: number): Promise<'PAID' | 'CANCELLED' | 'TIMEOUT'> => {
    return new Promise((resolve) => {
      let resolved = false;

      const handleMessage = (event: MessageEvent) => {
        const data = event.data;
        if (data && data.type === 'PAYOS_RESULT') {
          console.log('Received PAYOS_RESULT:', data);
          resolved = true;
          cleanup();
          
          try {
            if (paymentWindow && !paymentWindow.closed) {
              paymentWindow.close();
            }
          } catch (e) {
            console.error('Error closing popup:', e);
          }

          resolve(data.status === 'success' ? 'PAID' : 'CANCELLED');
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed manually
      const checkClosedInterval = setInterval(async () => {
        if (resolved) {
          clearInterval(checkClosedInterval);
          return;
        }

        try {
          if (paymentWindow && paymentWindow.closed) {
            console.log('Payment popup was closed, checking status via API...');
            clearInterval(checkClosedInterval);

            // Short delay then check status
            await new Promise(r => setTimeout(r, 1500));

            try {
              const status = await paymentService.checkPaymentStatus(orderCode);
              console.log('Fallback status check:', status);
              if (status.paid || status.status === 'PAID') {
                resolved = true;
                cleanup();
                resolve('PAID');
                return;
              }
            } catch (err) {
              console.warn('Fallback status check failed:', err);
            }

            if (!resolved) {
              resolved = true;
              cleanup();
              resolve('CANCELLED');
            }
          }
        } catch (e) {
          // Cross-origin error, ignore
        }
      }, 500);

      // Timeout after 10 minutes
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          try {
            if (paymentWindow && !paymentWindow.closed) {
              paymentWindow.close();
            }
          } catch (e) {}
          resolve('TIMEOUT');
        }
      }, 10 * 60 * 1000);

      const cleanup = () => {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkClosedInterval);
        clearTimeout(timeoutId);
      };
    });
  };

  // Create order and finish checkout
  const createOrderAndFinish = async (isPaid = false, plannedOrderId?: number) => {
    try {
      if (!submitting) setSubmitting(true);

      const orderData = buildOrderPayload();
      if (plannedOrderId) {
        orderData.order_id = plannedOrderId;
      }

      console.log("Creating order:", orderData);

      const orderResponse = await API.post("/orders/", orderData);
      console.log("Order created:", orderResponse);

      if (isPaid) {
        alert("Thanh toán thành công! Đơn hàng đang được xử lý.");
      } else {
        alert("Đặt hàng thành công! Thanh toán khi nhận hàng.");
      }
      navigate("/orders");
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Lỗi khi tạo đơn hàng. Vui lòng thử lại!");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number | string | undefined | null) => {
    const numericAmount =
      typeof amount === "number" ? amount : parseFloat(String(amount || 0));
    if (isNaN(numericAmount)) {
      console.error("formatCurrency received NaN:", amount);
      return "0 ₫";
    }
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(numericAmount);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-5">
        <div className="text-center py-12 text-gray-600">
          <p>Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-5">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Giỏ hàng trống</h1>
          <p className="mb-6">
            Vui lòng thêm món ăn vào giỏ hàng trước khi thanh toán
          </p>
          <Button onClick={() => navigate("/menu")}>Quay lại menu</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-5">
      <div className="text-center mb-8">
        <h1 className="text-orange-500 text-4xl font-bold mb-2">
          🛒 Thanh toán
        </h1>
        <p>Xác nhận thông tin và hoàn tất đơn hàng</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Order Form */}
        <div>
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-6">Thông tin giao hàng</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tên người nhận *
                  </label>
                  <input
                    type="text"
                    name="receiver_name"
                    value={formData.receiver_name}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Nhập tên người nhận"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    SDT nhận hàng *
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Nhập số điện thoại"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Địa chỉ giao hàng *
                  </label>
                  <textarea
                    name="ship_address"
                    value={formData.ship_address}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Nhập địa chỉ giao hàng"
                    rows={3}
                    required
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <MapPin className="text-orange-500" size={18} />
                      <span>
                        {customerCoordinates.latitude && customerCoordinates.longitude
                          ? "Đã chọn vị trí, tính phí theo khoảng cách"
                          : "Chọn vị trí trên bản đồ để tính phí chính xác"}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddressPicker(true)}
                    >
                      Chọn trên bản đồ
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Ghi chú đơn hàng
                  </label>
                  <textarea
                    name="note"
                    value={formData.note}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Ghi chú thêm (tùy chọn)"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Phương thức thanh toán
                  </label>
                  <select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                    <option value="COD">Thanh toán khi nhận hàng (COD)</option>
                    <option value="ONLINE">Thanh toán online</option>
                  </select>
                </div>
              </form>

              {/* Promotions */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Khuyến mãi</h3>
                  {isLoadingPromos && (
                    <span className="text-sm text-gray-500">Đang tải...</span>
                  )}
                </div>

                {promos.length === 0 && !isLoadingPromos && (
                  <p className="text-sm text-gray-500">
                    Không có mã giảm giá khả dụng.
                  </p>
                )}

                {promos.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="text-sm text-gray-700">
                      {appliedPromos.length > 0
                        ? `Đã áp dụng ${appliedPromos.length} mã`
                        : selectedPromos.length > 0
                        ? `Đã chọn ${selectedPromos.length} mã, bấm áp dụng để áp dụng`
                        : "Chưa chọn mã giảm giá"}
                    </div>
                    <Button type="button" size="sm" onClick={() => setShowPromoModal(true)}>
                      Chọn khuyến mãi
                    </Button>
                  </div>
                )}

                {appliedPromos.length > 0 && (
                  <div className="mt-4 border-t pt-3 space-y-2">
                    <p className="text-sm font-semibold text-green-700">Mã đã áp dụng</p>
                    {appliedPromos.map((ap) => (
                      <div
                        key={ap.promo.id}
                        className="flex items-center justify-between text-sm bg-green-50 border border-green-200 rounded-md px-3 py-2"
                      >
                        <div className="space-y-0.5">
                          <p className="font-medium text-green-800">{ap.promo.title || ap.promo.name}</p>
                          <p className="text-xs text-green-700">Tiết kiệm: {formatCurrency(ap.discount)}</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => removeAppliedPromo(ap.promo.id)}
                        >
                          Gỡ
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Promo Modal */}
        {showPromoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div>
                  <h3 className="text-lg font-semibold">Chọn khuyến mãi</h3>
                  <p className="text-sm text-gray-500">Chọn mã phù hợp, tối đa 1 mã cho mỗi cửa hàng</p>
                </div>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close"
                  onClick={() => setShowPromoModal(false)}>
                  ✕
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-2">
                {promos.map((promo) => {
                  try {
                    const storeId = promo.store ?? promo.store_id ?? 0;
                    const amountToCheck =
                      storeId && storeId !== 0
                        ? storeSubtotalsByStoreId[storeId] || 0
                        : calculations.subtotal;
                    const isApplicable = amountToCheck >= getPromoMinOrder(promo);
                    const isSelected = selectedPromos.some((p) => p.id === promo.id);

                    return (
                      <div
                        key={promo.id}
                        className={`relative p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? "border-orange-500 bg-orange-50"
                            : isApplicable
                            ? "border-gray-300 hover:border-orange-300"
                            : "border-gray-200 opacity-50 cursor-not-allowed"
                        }`}
                        onClick={() => isApplicable && togglePromoSelection(promo)}
                        onMouseEnter={(e) => handlePromoMouseEnter(e, promo.id)}
                        onMouseLeave={handlePromoMouseLeave}>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="font-medium">{promo.title || promo.name}</p>
                            <p className="text-sm text-gray-600">
                              {promo.discount_type === "PERCENTAGE" || promo.discount_type === "PERCENT"
                                ? `Giảm ${promo.discount_value}%`
                                : `Giảm ${formatCurrency(promo.discount_value)}`}
                              {promo.max_discount &&
                                (promo.discount_type === "PERCENTAGE" || promo.discount_type === "PERCENT") &&
                                ` (tối đa ${formatCurrency(promo.max_discount)})`}
                            </p>
                            <p className="text-xs text-gray-500">
                              Đơn tối thiểu: {formatCurrency(getPromoMinOrder(promo))}
                            </p>
                            {storeId ? (
                              <p className="text-xs text-gray-500">
                                Áp dụng cho: {storeNameById[storeId] || `Cửa hàng #${storeId}`}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-500">Áp dụng toàn hệ thống</p>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!isApplicable}
                            onChange={() => {}}
                            className="w-4 h-4 text-orange-600"
                          />
                        </div>
                      </div>
                    );
                  } catch (error) {
                    console.error("Error rendering promo:", error, promo);
                    return null;
                  }
                })}
              </div>

              <div className="flex items-center justify-between px-5 py-4 border-t bg-gray-50">
                <div className="text-sm text-gray-600">
                  {selectedPromos.length > 0
                    ? `Đã chọn ${selectedPromos.length} mã`
                    : "Chọn tối đa 1 mã cho mỗi cửa hàng"}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPromoModal(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    onClick={async () => {
                      await applySelectedPromos();
                      setShowPromoModal(false);
                    }}
                    disabled={isApplyingPromos || selectedPromos.length === 0}
                  >
                    {isApplyingPromos ? "Đang áp dụng..." : "Áp dụng"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right: Order Summary */}
        <div>
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-6">Tóm tắt đơn hàng</h2>

              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4">
                    <div className="relative">
                      <img
                        src={getImageUrl(
                          item.food.image_url || item.food.image || ""
                        )}
                        alt={item.food.title}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => {
                          console.log(
                            "Image error for:",
                            item.food.title,
                            "URL:",
                            item.food.image_url || item.food.image
                          );
                          e.currentTarget.src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect fill='%23f97316' width='64' height='64'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='32'%3E🍔%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.food.title}</h4>
                      <p className="text-sm text-gray-600">
                        {(() => {
                          const foodData = item.food as Record<string, unknown>;
                          if (
                            foodData.store &&
                            typeof foodData.store === "object"
                          ) {
                            const storeData = foodData.store as Record<
                              string,
                              unknown
                            >;
                            return storeData.store_name as string;
                          } else if (typeof foodData.store_name === "string") {
                            return foodData.store_name;
                          }
                          return "Unknown Store";
                        })()}
                      </p>
                      {item.food_option && (
                        <p className="text-sm text-gray-500">
                          {item.food_option.size_name}: +
                          {formatCurrency(parseFloat(item.food_option.price))}
                        </p>
                      )}
                      {item.item_note && (
                        <p className="text-sm text-gray-500">
                          Ghi chú: {item.item_note}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">x{item.quantity}</p>
                      <p className="text-orange-500 font-bold">
                        {formatCurrency(parseFloat(item.subtotal))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Totals */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span>{formatCurrency(calculations.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    Phí giao hàng
                    {isComputingDelivery ? " (đang tính...)" : ""}:
                  </span>
                  <span>{formatCurrency(calculations.deliveryFee)}</span>
                </div>

                {Object.keys(storeDeliveryDetails).length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-orange-800 font-medium">
                      Chi tiết phí giao hàng theo từng cửa hàng:
                    </p>
                    {Object.entries(storeDeliveryDetails).map(
                      ([storeName, detail]) => (
                        <div
                          key={storeName}
                          className="flex justify-between text-sm text-gray-700"
                        >
                          <div className="space-y-0.5">
                            <p className="font-medium text-gray-800">
                              {storeName}
                            </p>
                            <p className="text-xs text-gray-600">
                              Khoảng cách: {formatDistanceLabel(detail.distanceKm)}
                            </p>
                          </div>
                          <span className="font-semibold text-orange-600">
                            {formatCurrency(detail.fee)}
                          </span>
                        </div>
                      )
                    )}
                    {(customerCoordinates.latitude == null ||
                      customerCoordinates.longitude == null) && (
                      <p className="text-xs text-gray-600">
                        Chưa có toạ độ chính xác, áp dụng phí cơ bản cho mỗi cửa
                        hàng.
                      </p>
                    )}
                  </div>
                )}

                {calculations.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Giảm giá:</span>
                    <span>-{formatCurrency(calculations.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-orange-500 border-t pt-2">
                  <span>Tổng cộng:</span>
                  <span>{formatCurrency(calculations.total)}</span>
                </div>
                <p className="text-xs text-blue-600 italic">
                  Phí vận chuyển = 15,000đ + 4,000đ/km mỗi cửa hàng (sử dụng
                  khoảng cách thực tế khi có vị trí giao).
                </p>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white py-4 text-lg font-bold rounded-lg">
                {submitting ? "Đang xử lý..." : "Đặt hàng"}
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate("/cart")}
                className="w-full mt-3">
                Quay lại giỏ hàng
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AddressPicker
        open={showAddressPicker}
        onClose={() => setShowAddressPicker(false)}
        initialAddress={formData.ship_address}
        initialCoords={
          customerCoordinates.latitude != null &&
          customerCoordinates.longitude != null
            ? {
                latitude: customerCoordinates.latitude,
                longitude: customerCoordinates.longitude,
              }
            : null
        }
        onSelect={(data) => {
          setFormData((prev) => ({ ...prev, ship_address: data.address }));
          setCustomerCoordinates({
            latitude: data.latitude,
            longitude: data.longitude,
          });
          setShowAddressPicker(false);
        }}
      />

      {/* Voucher Tooltip */}
      {hoveredPromo && (
        <div
          className="fixed z-50 bg-gray-800 text-white p-3 rounded-lg shadow-lg max-w-xs pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: "translateY(-50%)",
          }}>
          <div className="text-sm font-semibold mb-2">Chi tiết voucher</div>
          <div className="text-xs space-y-1">
            {getVoucherDetails(promos.find((p) => p.id === hoveredPromo)!).map(
              (detail, index) => (
                <div key={index}>{detail}</div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;