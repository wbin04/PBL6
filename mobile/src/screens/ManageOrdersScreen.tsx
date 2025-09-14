import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';

interface OrderItem {
  id: string;
  title: string;
  shopName: string;
  date: string;
  time: string;
  price: string;
  itemCount: string;
  image: any;
  status: 'Chờ xác nhận' | 'Đang giao' | 'Đã giao' | 'Đã hủy';
  // Thêm thông tin giao hàng
  customerName?: string;
  phoneNumber?: string;
  deliveryAddress?: string;
  paymentMethod?: string;
}

interface ShopGroup {
  shopName: string;
  orders: OrderItem[];
  totalPrice: string; // Thành tiền
  subtotalPrice: string; // Tổng tiền hàng
  isExpanded: boolean;
}

const sampleOrders: OrderItem[] = [
  // Chờ xác nhận
  {
    id: '1',
    title: 'Trà sữa dâu tây',
    shopName: 'GoJek - Trà Sữa Hà Nội',
    date: '13 Th9',
    time: '01:20 pm',
    price: '85.000đ',
    itemCount: '2 món',
    image: require('@/assets/images/assorted-sushi.png'),
    status: 'Chờ xác nhận',
  },
  {
    id: '2',
    title: 'Trà chanh mật ong',
    shopName: 'GoJek - Trà Sữa Hà Nội',
    date: '13 Th9',
    time: '01:25 pm',
    price: '45.000đ',
    itemCount: '1 món',
    image: require('@/assets/images/fresh-bowl-salad.png'),
    status: 'Chờ xác nhận',
  },
  {
    id: '3',
    title: 'Bánh mì thịt nướng',
    shopName: 'Bánh Mì Phượng',
    date: '13 Th9',
    time: '12:45 pm',
    price: '35.000đ',
    itemCount: '1 món',
    image: require('@/assets/images/gourmet-burger.png'),
    status: 'Chờ xác nhận',
  },
  {
    id: '4',
    title: 'Bánh mì pate',
    shopName: 'Bánh Mì Phượng',
    date: '13 Th9',
    time: '12:50 pm',
    price: '30.000đ',
    itemCount: '1 món',
    image: require('@/assets/images/gourmet-burger.png'),
    status: 'Chờ xác nhận',
  },
  {
    id: '5',
    title: 'Phở bò tái chín',
    shopName: 'Phở Lý Quốc Sư',
    date: '13 Th9',
    time: '11:30 am',
    price: '70.000đ',
    itemCount: '1 món',
    image: require('@/assets/images/fresh-bowl-salad.png'),
    status: 'Chờ xác nhận',
  },
  
  // Đang giao
  {
    id: '6',
    title: 'Pizza hải sản',
    shopName: 'Pizza Hut',
    date: '12 Th9',
    time: '08:30 pm',
    price: '320.000đ',
    itemCount: '2 món',
    image: require('@/assets/images/delicious-toppings-pizza.png'),
    status: 'Đang giao',
    customerName: 'Lý Hoàng Quyền',
    phoneNumber: '(+84) 967 517 503',
    deliveryAddress: '142/48 Âu Cơ, Phường Hòa Khánh Bắc, Quận Liên Chiều, Đà Nẵng',
    paymentMethod: 'Thanh toán khi nhận hàng',
  },
  {
    id: '7',
    title: 'Lasagna phô mai',
    shopName: 'Pizza Hut',
    date: '12 Th9',
    time: '08:35 pm',
    price: '180.000đ',
    itemCount: '1 món',
    image: require('@/assets/images/lasagna-slice.png'),
    status: 'Đang giao',
    customerName: 'Nguyễn Văn A',
    phoneNumber: '(+84) 901 234 567',
    deliveryAddress: '123 Đường Lê Loi, Phường Bến Thành, Quận 1, TP.HCM',
    paymentMethod: 'Chuyển khoản',
  },
  {
    id: '8',
    title: 'Pizza phô mai',
    shopName: 'Pizza Hut',
    date: '12 Th9',
    time: '08:40 pm',
    price: '250.000đ',
    itemCount: '1 món',
    image: require('@/assets/images/delicious-toppings-pizza.png'),
    status: 'Đang giao',
  },
  {
    id: '9',
    title: 'Burger bò phô mai',
    shopName: 'KFC - Lotte Tower',
    date: '12 Th9',
    time: '07:45 pm',
    price: '95.000đ',
    itemCount: '1 món',
    image: require('@/assets/images/gourmet-burger.png'),
    status: 'Đang giao',
  },
  {
    id: '10',
    title: 'Gà rán giòn',
    shopName: 'KFC - Lotte Tower',
    date: '12 Th9',
    time: '07:50 pm',
    price: '140.000đ',
    itemCount: '2 món',
    image: require('@/assets/images/gourmet-burger.png'),
    status: 'Đang giao',
  },
  {
    id: '11',
    title: 'Sushi combo',
    shopName: 'Tokyo Deli',
    date: '12 Th9',
    time: '06:20 pm',
    price: '450.000đ',
    itemCount: '3 món',
    image: require('@/assets/images/assorted-sushi.png'),
    status: 'Đang giao',
  },
  
  // Đã giao
  {
    id: '12',
    title: 'Sushi Nhật Bản',
    shopName: 'Tokyo Deli',
    date: '11 Th9',
    time: '01:20 pm',
    price: '600.000đ',
    itemCount: '1 món',
    image: require('@/assets/images/assorted-sushi.png'),
    status: 'Đã giao',
  },
  {
    id: '13',
    title: 'Sashimi cá hồi',
    shopName: 'Tokyo Deli',
    date: '11 Th9',
    time: '01:25 pm',
    price: '350.000đ',
    itemCount: '1 món',
    image: require('@/assets/images/assorted-sushi.png'),
    status: 'Đã giao',
  },
  {
    id: '14',
    title: 'Bánh cupcake chocolate',
    shopName: 'Sweet Dreams Bakery',
    date: '10 Th9',
    time: '03:45 pm',
    price: '120.000đ',
    itemCount: '4 món',
    image: require('@/assets/images/chocolate-berry-cupcake.png'),
    status: 'Đã giao',
  },
  {
    id: '15',
    title: 'Chè ba màu',
    shopName: 'Sweet Dreams Bakery',
    date: '10 Th9',
    time: '03:50 pm',
    price: '30.000đ',
    itemCount: '3 món',
    image: require('@/assets/images/chocolate-berry-cupcake.png'),
    status: 'Đã giao',
  },
  {
    id: '16',
    title: 'Nem cuốn tôm thịt',
    shopName: 'Quán Chay Thiện Minh',
    date: '10 Th9',
    time: '12:30 pm',
    price: '80.000đ',
    itemCount: '2 món',
    image: require('@/assets/images/fresh-vegetable-spring-rolls.png'),
    status: 'Đã giao',
  },
  {
    id: '17',
    title: 'Salad rau củ',
    shopName: 'Quán Chay Thiện Minh',
    date: '10 Th9',
    time: '12:35 pm',
    price: '55.000đ',
    itemCount: '1 món',
    image: require('@/assets/images/fresh-salad-bowl.png'),
    status: 'Đã giao',
  },
  
  // Đã hủy
  {
    id: '18',
    title: 'Cà phê đen đá',
    shopName: 'Highlands Coffee',
    date: '09 Th9',
    time: '02:15 pm',
    price: '20.000đ',
    itemCount: '2 món',
    image: require('@/assets/images/fresh-bowl-salad.png'),
    status: 'Đã hủy',
  },
  {
    id: '19',
    title: 'Bánh croissant',
    shopName: 'Highlands Coffee',
    date: '09 Th9',
    time: '02:20 pm',
    price: '45.000đ',
    itemCount: '1 món',
    image: require('@/assets/images/chocolate-berry-cupcake.png'),
    status: 'Đã hủy',
  },
  {
    id: '20',
    title: 'Bún bò Huế',
    shopName: 'Bún Bò Huế Tía Tô',
    date: '08 Th9',
    time: '11:45 am',
    price: '75.000đ',
    itemCount: '1 món',
    image: require('@/assets/images/fresh-bowl-salad.png'),
    status: 'Đã hủy',
  },
  {
    id: '21',
    title: 'Chả cá Lă Vọng',
    shopName: 'Bún Bò Huế Tía Tô',
    date: '08 Th9',
    time: '11:50 am',
    price: '95.000đ',
    itemCount: '1 món',
    image: require('@/assets/images/fresh-bowl-salad.png'),
    status: 'Đã hủy',
  },
];

const ManageOrdersScreen: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'Chờ xác nhận' | 'Đang giao' | 'Đã giao' | 'Đã hủy'>('Chờ xác nhận');
  const [expandedShops, setExpandedShops] = useState<string[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>(sampleOrders);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();

  // Xử lý parameter từ navigation
  useEffect(() => {
    if (route.params && (route.params as any).selectedTab) {
      const paramTab = (route.params as any).selectedTab;
      if (['Chờ xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'].includes(paramTab)) {
        setSelectedTab(paramTab);
      }
    }
  }, [route.params]);

  // Load đơn hàng từ AsyncStorage khi màn hình được focus
  const loadPendingOrders = async () => {
    try {
      const pendingOrdersJson = await AsyncStorage.getItem('pendingOrders');
      if (pendingOrdersJson) {
        const pendingOrders = JSON.parse(pendingOrdersJson);
        console.log('Loaded pending orders:', pendingOrders);
        
        // Convert đơn hàng từ CheckoutScreen format sang OrderItem format
        const convertedOrders = pendingOrders.map((order: any) => {
          const firstItem = order.items[0];
          return {
            id: order.id,
            title: firstItem.name,
            shopName: 'Nhà hàng ABC', // Mock shop name
            date: new Date(order.orderDate).toLocaleDateString('vi-VN'),
            time: new Date(order.orderDate).toLocaleTimeString('vi-VN'),
            price: `${order.totalAmount.toLocaleString()} ₫`,
            itemCount: `${order.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} món`,
            image: firstItem.image || require('../assets/images/placeholder-logo.png'),
            status: 'Chờ xác nhận' as const,
            customerName: order.deliveryInfo.receiverName,
            phoneNumber: order.deliveryInfo.phoneNumber,
            deliveryAddress: order.deliveryInfo.address,
            paymentMethod: order.paymentMethod,
          };
        });

        // Merge với đơn hàng mẫu, tránh duplicate
        setOrders(prev => {
          const existingIds = prev.map(order => order.id);
          const newOrders = convertedOrders.filter((order: OrderItem) => !existingIds.includes(order.id));
          return [...newOrders, ...prev];
        });
      }
    } catch (error) {
      console.error('Error loading pending orders:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadPendingOrders();
    }, [])
  );

  // Function để tạo thông tin theo dõi từ dữ liệu order thực tế
  const generateTrackingInfo = (shopGroup: any) => {
    const firstOrder = shopGroup.orders[0];
    
    // Tạo list tất cả food items từ các orders
    const allFoodItems = shopGroup.orders.map((order: OrderItem) => ({
      name: order.title,
      quantity: parseInt(order.itemCount.split(' ')[0]),
      price: order.price,
    }));

    // Lấy subtotal và final amount từ shopGroup đã tính
    const subtotal = parseInt(shopGroup.subtotalPrice.replace(/[^\d]/g, ''));
    const finalAmount = parseInt(shopGroup.totalPrice.replace(/[^\d]/g, ''));
    
    // Tính chi tiết breakdown dựa vào logic
    let shippingFee = 0;
    let shippingDiscount = 0;
    let voucherDiscount = 0;
    
    const shopName = shopGroup.shopName;
    
    if (shopName.includes('Pizza') && subtotal > 500000) {
      // Pizza shop: freeship + voucher 50k
      shippingFee = 15000;
      shippingDiscount = -15000;
      voucherDiscount = -50000;
    } else if (shopName.includes('KFC') || shopName.includes('Tokyo')) {
      // KFC, Tokyo: chỉ freeship
      shippingFee = 15000;
      shippingDiscount = -15000;
      voucherDiscount = 0;
    } else if (subtotal > 200000) {
      // Shops khác: freeship nếu > 200k
      shippingFee = 15000;
      shippingDiscount = -15000;
      voucherDiscount = 0;
    } else {
      // Đơn nhỏ: có phí ship
      shippingFee = 15000;
      shippingDiscount = 0;
      voucherDiscount = 0;
    }

    return {
      orderId: firstOrder.id,
      shopName: shopGroup.shopName,
      foodItems: allFoodItems,
      totalAmount: shopGroup.totalPrice, // Thành tiền
      subtotalAmount: shopGroup.subtotalPrice, // Tổng tiền hàng
      shippingFee,
      shippingDiscount,
      voucherDiscount,
      paymentMethod: firstOrder.paymentMethod || "Tiền mặt",
      trackingCode: `VDN${firstOrder.id}${Date.now().toString().slice(-6)}`,
      phoneNumber: firstOrder.phoneNumber || "0901234567",
      deliveryAddress: firstOrder.deliveryAddress || "123 Đường ABC, Phường XYZ, Quận 1, TP.HCM",
      customerName: firstOrder.customerName || "Khách hàng",
      estimatedDelivery: "15:30 - 16:00 hôm nay",
      orderDate: firstOrder.date,
      orderTime: firstOrder.time,
    };
  };

  // Function để cập nhật trạng thái đơn hàng
  const updateOrderStatus = (orderId: string, newStatus: OrderItem['status']) => {
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
    // Chuyển sang tab "Đã hủy" nếu đơn hàng được hủy
    if (newStatus === 'Đã hủy') {
      setSelectedTab('Đã hủy');
    }
  };

  const filteredOrders = orders.filter(order => order.status === selectedTab);

  // Nhóm đơn hàng theo shop
  const groupOrdersByShop = (orders: OrderItem[]): ShopGroup[] => {
    const grouped = orders.reduce((acc, order) => {
      if (!acc[order.shopName]) {
        acc[order.shopName] = [];
      }
      acc[order.shopName].push(order);
      return acc;
    }, {} as Record<string, OrderItem[]>);

    return Object.keys(grouped).map(shopName => {
      const shopOrders = grouped[shopName];
      
      // Tính tổng tiền hàng (giá × số lượng)
      const subtotal = shopOrders.reduce((sum, order) => {
        const price = parseInt(order.price.replace(/[^\d]/g, ''));
        const quantity = parseInt(order.itemCount.split(' ')[0]);
        return sum + (price * quantity);
      }, 0);

      // Logic thông minh cho thành tiền dựa vào shop và tổng tiền
      let finalAmount = subtotal;
      const shippingFee = 15000;
      
      // Logic khác nhau cho từng shop
      if (shopName.includes('Pizza') && subtotal > 500000) {
        // Pizza shop: có freeship + voucher giảm 50k nếu > 500k
        finalAmount = subtotal - 50000; // Giảm 50k voucher, freeship
      } else if (shopName.includes('KFC') || shopName.includes('Tokyo')) {
        // KFC, Tokyo: có phí ship nhưng freeship
        finalAmount = subtotal; // Chỉ freeship, không giảm gì thêm
      } else if (subtotal > 200000) {
        // Các shop khác: freeship nếu > 200k, không thì +15k
        finalAmount = subtotal;
      } else {
        // Đơn nhỏ: có phí ship
        finalAmount = subtotal + shippingFee;
      }

      return {
        shopName,
        orders: shopOrders,
        totalPrice: `${finalAmount.toLocaleString()}đ`, // Thành tiền (đã tính logic)
        subtotalPrice: `${subtotal.toLocaleString()}đ`, // Tổng tiền hàng
        isExpanded: false,
      };
    });
  };

  const shopGroups = groupOrdersByShop(filteredOrders);

  const toggleShopExpansion = (shopName: string) => {
    setExpandedShops(prev => 
      prev.includes(shopName) 
        ? prev.filter(name => name !== shopName)
        : [...prev, shopName]
    );
  };

  const handleReorder = (shopGroup: any) => {
    // Extract real food items from order data
    const cartItems = shopGroup.orders.map((order: OrderItem) => {
      // Each order represents one food item
      const quantity = parseInt(order.itemCount.split(' ')[0]); // Extract number from "2 món"
      const pricePerItem = parseFloat(order.price.replace(/[^\d]/g, '')) / quantity; // Calculate price per item
      
      const cartItem = {
        id: order.id,
        name: order.title, // Real food name like "Pizza hải sản"
        price: pricePerItem, // Price per individual item
        quantity: quantity, // Real quantity from itemCount
        image: order.image || 'https://via.placeholder.com/80x80',
        shop: order.shopName,
        originalOrderId: order.id,
        isReorderItem: true
      };
      
      return cartItem;
    });

    console.log('Navigating to Checkout with:', { cartItems, shopName: shopGroup.shopName, isReorder: true });
    
    (navigation as any).navigate('Checkout', {
      cartItems: cartItems,
      shopName: shopGroup.shopName,
      isReorder: true,
      selectedIds: [] // Empty since we're using cartItems directly
    });
  };

  const renderTabButton = (tab: 'Chờ xác nhận' | 'Đang giao' | 'Đã giao' | 'Đã hủy', label: string) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        selectedTab === tab && styles.tabButtonActive,
      ]}
      onPress={() => setSelectedTab(tab)}
    >
      <Text style={[
        styles.tabText,
        selectedTab === tab && styles.tabTextActive,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderOrderButtons = (order: OrderItem, shopGroup?: any) => {
    if (order.status === 'Chờ xác nhận') {
      return (
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => (navigation as any).navigate('Cancel', { 
              orderId: order.id,
              onOrderCancelled: updateOrderStatus 
            })}
          >
            <Text style={styles.cancelButtonText}>Hủy đơn</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactButton}>
            <Text style={styles.contactButtonText}>Liên hệ shop</Text>
          </TouchableOpacity>
        </View>
      );
    } else if (order.status === 'Đã giao') {
      return (
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.reorderButton}
            onPress={() => {
              // Create shopGroup with ONLY the selected order, not all orders in the shop
              const singleOrderShopGroup = {
                shopName: order.shopName,
                orders: [order], // Only this specific order
                subtotalPrice: order.price,
                totalPrice: order.price
              };
              handleReorder(singleOrderShopGroup);
            }}
          >
            <Text style={styles.reorderButtonText}>Mua lại</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.ratingButton}
            onPress={() => {
              // Chuyển đến màn hình đánh giá mới
              navigation.navigate('Review', { orderId: parseInt(order.id) });
            }}
          >
            <Text style={styles.ratingButtonText}>Đánh giá</Text>
          </TouchableOpacity>
        </View>
      );
    } else if (order.status === 'Đã hủy') {
      return (
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.reorderButton}
            onPress={() => {
              // Create shopGroup with ONLY the selected order, not all orders in the shop
              const singleOrderShopGroup = {
                shopName: order.shopName,
                orders: [order], // Only this specific order
                subtotalPrice: order.price,
                totalPrice: order.price
              };
              handleReorder(singleOrderShopGroup);
            }}
          >
            <Text style={styles.reorderButtonText}>Mua lại</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.detailButton}
            onPress={() => {
              // Chuyển đến màn hình chi tiết đơn hủy với đầy đủ thông tin
              navigation.navigate('CancelDetail', { 
                orderId: order.id,
                shopName: order.shopName,
                productName: order.title,
                productPrice: order.price,
                productImage: order.image,
              });
            }}
          >
            <Text style={styles.detailButtonText}>Xem chi tiết</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  const renderShopButtons = (shopGroup: any) => {
    if (shopGroup.orders[0].status === 'Đang giao') {
      return (
        <View style={styles.singleButtonRow}>
          <TouchableOpacity 
            style={styles.trackButton}
            onPress={() => (navigation as any).navigate('Tracking', { 
              trackingInfo: generateTrackingInfo(shopGroup) 
            })}
          >
            <Text style={styles.trackButtonText}>Theo dõi</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  const renderOrderItem = ({ item }: { item: OrderItem }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => {
        if (item.status === 'Chờ xác nhận') {
          // Navigate to tracking screen với thông tin đơn chờ xác nhận
          const pendingTrackingInfo = {
            orderId: item.id,
            shopName: item.shopName,
            foodItems: [{
              name: item.title,
              quantity: parseInt(item.itemCount.split(' ')[0]),
              price: item.price,
            }],
            totalAmount: item.price,
            subtotalAmount: item.price,
            shippingFee: 15000,
            shippingDiscount: 0,
            voucherDiscount: 0,
            paymentMethod: "Tiền mặt",
            trackingCode: `VDN${item.id}${Date.now().toString().slice(-6)}`,
            phoneNumber: "0901234567",
            deliveryAddress: "123 Đường ABC, Phường XYZ, Quận 1, TP.HCM",
            customerName: "Khách hàng",
            orderDate: item.date,
            orderTime: item.time,
            status: 'Chờ xác nhận', // Thêm status để phân biệt
          };
          
          (navigation as any).navigate('Tracking', { 
            trackingInfo: pendingTrackingInfo 
          });
        }
      }}
      activeOpacity={item.status === 'Chờ xác nhận' ? 0.7 : 1}
    >
      <View style={styles.orderHeader}>
        <Image source={item.image} style={styles.foodImage} />
        <View style={styles.orderInfo}>
          <Text style={styles.orderTitle}>{item.title}</Text>
          <Text style={styles.orderDate}>{item.date}, {item.time}</Text>
          <Text style={styles.itemCount}>{item.itemCount}</Text>
        </View>
        <Text style={styles.orderPrice}>{item.price}</Text>
      </View>
      
      {renderOrderButtons(item)}
    </TouchableOpacity>
  );

  const renderShopGroup = ({ item: shopGroup }: { item: ShopGroup }) => {
    const isExpanded = expandedShops.includes(shopGroup.shopName);
    const firstOrder = shopGroup.orders[0]; // Món đầu tiên
    const hasMultipleOrders = shopGroup.orders.length > 1;

    return (
      <View style={styles.shopContainer}>
        {/* Shop Header với badge nếu có nhiều đơn */}
        <View style={styles.shopHeaderSection}>
          <View style={styles.shopTitleRow}>
            <Text style={styles.shopName}>{shopGroup.shopName}</Text>
            {hasMultipleOrders && (
              <View style={styles.orderCountBadge}>
                <Text style={styles.orderCountText}>+{shopGroup.orders.length - 1}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Hiển thị món đầu tiên với đầy đủ thông tin */}
        <TouchableOpacity 
          style={styles.firstOrderContainer}
          onPress={() => {
            if (firstOrder.status === 'Chờ xác nhận') {
              const pendingTrackingInfo = generateTrackingInfo(shopGroup);
              (pendingTrackingInfo as any).status = 'Chờ xác nhận';
              
              (navigation as any).navigate('Tracking', { 
                trackingInfo: pendingTrackingInfo 
              });
            }
          }}
          activeOpacity={firstOrder.status === 'Chờ xác nhận' ? 0.7 : 1}
        >
          <View style={styles.orderHeader}>
            <Image source={firstOrder.image} style={styles.foodImage} />
            <View style={styles.orderInfo}>
              <Text style={styles.orderTitle}>{firstOrder.title}</Text>
              <Text style={styles.orderDate}>{firstOrder.date}, {firstOrder.time}</Text>
              <Text style={styles.itemCount}>{firstOrder.itemCount}</Text>
            </View>
            <Text style={styles.orderPrice}>{firstOrder.price}</Text>
          </View>
          
          {renderOrderButtons(firstOrder, shopGroup)}
        </TouchableOpacity>

        {/* Nút mở rộng nếu có nhiều đơn */}
        {hasMultipleOrders && !isExpanded && (
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={() => toggleShopExpansion(shopGroup.shopName)}
          >
            <Text style={styles.expandButtonText}>
              Xem thêm {shopGroup.orders.length - 1} đơn hàng
            </Text>
            <Ionicons 
              name="chevron-down"
              size={16} 
              color="#E95322" 
            />
          </TouchableOpacity>
        )}

        {/* Hiển thị các món còn lại - chỉ khi expanded */}
        {isExpanded && hasMultipleOrders && (
          <View style={styles.additionalOrdersContainer}>
            {shopGroup.orders.slice(1).map((order, index) => (
              <View key={order.id} style={styles.additionalOrderItem}>
                <View style={styles.orderSeparator} />
                <View style={styles.orderHeader}>
                  <Image source={order.image} style={styles.foodImage} />
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderTitle}>{order.title}</Text>
                    <Text style={styles.orderDate}>{order.date}, {order.time}</Text>
                    <Text style={styles.itemCount}>{order.itemCount}</Text>
                  </View>
                  <Text style={styles.orderPrice}>{order.price}</Text>
                </View>
                
                {order.status !== 'Đang giao' && renderOrderButtons(order)}
              </View>
            ))}
          </View>
        )}

        {/* Tổng tiền shop */}
        <View style={styles.shopTotalSection}>
          <Text style={styles.shopTotal}>Tổng: {shopGroup.totalPrice}</Text>
        </View>

        {/* Nút theo dõi cho shop (chỉ hiện với đơn đang giao) */}
        {renderShopButtons(shopGroup)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F4A460" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Tab Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabContainer}
        >
          {renderTabButton('Chờ xác nhận', 'Chờ xác nhận')}
          {renderTabButton('Đang giao', 'Đang giao')}
          {renderTabButton('Đã giao', 'Đã giao')}
          {renderTabButton('Đã hủy', 'Đã hủy')}
        </ScrollView>

        {/* Orders List */}
        <FlatList
          data={shopGroups}
          renderItem={renderShopGroup}
          keyExtractor={(item, index) => `${item.shopName}_${selectedTab}_${index}`}
          contentContainerStyle={styles.ordersList}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    backgroundColor: '#F4A460',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  content: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: 16,
  },
  tabContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabButton: {
    height: 35,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: '#E95322',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E95322',
  },
  tabTextActive: {
    color: '#FFF',
  },
  ordersList: {
    paddingHorizontal: 16,
  },
  // Shop styles
  shopContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shopHeaderSection: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  shopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  shopTotal: {
    fontSize: 14,
    color: '#E95322',
    fontWeight: '600',
    marginTop: 4,
  },
  shopTotalSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    alignItems: 'flex-end',
  },
  orderCountBadge: {
    backgroundColor: '#E95322',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  orderCountText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  firstOrderContainer: {
    padding: 16,
    paddingTop: 0,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  expandButtonText: {
    color: '#E95322',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  additionalOrdersContainer: {
    paddingTop: 0,
  },
  additionalOrderItem: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  ordersContainer: {
    paddingTop: 8,
  },
  orderSeparator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: 16,
  },
  // Order styles
  orderCard: {
    backgroundColor: 'transparent',
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  foodImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  orderPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E95322',
  },
  itemCount: {
    fontSize: 12,
    color: '#666',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  singleButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 16,
  },
  cancelButton: {
    backgroundColor: '#E95322',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  trackButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E95322',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  trackButtonText: {
    color: '#E95322',
    fontSize: 14,
    fontWeight: '600',
  },
  contactButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  reorderButton: {
    backgroundColor: '#E95322',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  reorderButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  ratingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF9800',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  ratingButtonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
  },
  detailButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#757575',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  detailButtonText: {
    color: '#757575',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ManageOrdersScreen;