import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ScrollView } from 'react-native';
import { IMAGE_MAP } from '../assets/imageMap';
import { useNavigation } from '@react-navigation/native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, Clock, BadgePercent } from 'lucide-react-native';

// Không dùng mock data cứng, chỉ nhận từ params

type RouteParams = {
  storeId: string;
  name?: string;
  address?: string;
  image?: any;
  foods?: any[];
  rating?: number;
  delivery?: string;
  time?: string;
  vouchers?: any[];
};

export const StoreDetailScreenV2 = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { storeId, name, address, image, foods, rating, delivery, time, vouchers } = route.params;
  const [tab, setTab] = useState('all');


  // Nếu có truyền params thì ưu tiên dùng

  const store = {
    id: storeId,
    name: name ?? '',
    address: address ?? '',
    headerImage: image ?? null,
    foods: foods ?? [],
    rating: rating ?? 0,
    delivery: delivery ?? '',
    time: time ?? '',
    vouchers: vouchers ?? [],
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backIcon}>{'←'}</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header Image */}
        <Image
          source={typeof store.headerImage === 'string'
            ? IMAGE_MAP[store.headerImage] || require('../assets/images/placeholder.png')
            : store.headerImage}
          style={styles.headerImage}
          resizeMode="cover"
        />

        {/* Info Section */}
        <View style={styles.infoBox}>
          <View style={styles.rowCenter}>
            <Star color="#f59e0b" size={18} />
            <Text style={styles.ratingText}>{store.rating}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.delivery}>{store.delivery}</Text>
            <Text style={styles.dot}>·</Text>
            <Clock color="#6b7280" size={16} />
            <Text style={styles.time}>{store.time}</Text>
          </View>
          <Text style={styles.storeName}>{store.name}</Text>
          <Text style={styles.storeDesc}>{store.address}</Text>
        </View>

        

        {/* Tabs */}
        <View style={styles.tabBox}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'all' && styles.tabActive]}
            onPress={() => setTab('all')}
          >
            <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>Tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'main' && styles.tabActive]}
            onPress={() => setTab('main')}
          >
            <Text style={[styles.tabText, tab === 'main' && styles.tabTextActive]}>Bữa chính</Text>
          </TouchableOpacity>
        </View>

        {/* Food List */}
        <Text style={styles.foodListTitle}>Tất cả món ăn ({store.foods.length})</Text>
        <FlatList
          data={store.foods}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.foodCard}
              onPress={() => {
                // Nếu chưa có reviews, tạo mảng mẫu dựa trên rating
                let reviews = item.reviews ?? [];
                if (!reviews.length && item.rating) {
                  // Tạo reviews mẫu dựa trên rating gốc của món ăn
                  const rating = item.rating;
                  let arr = [];
                  if (Number.isInteger(rating)) {
                    arr = [{ user: 'bin', rating, text: 'Ngon', likes: 3 }];
                  } else {
                    const r5 = Math.ceil(rating);
                    const r4 = Math.floor(rating);
                    // Tính số lượng review 5 và 4 sao để trung bình đúng
                    // vd: 4.9 => 9 review 5 sao, 1 review 4 sao
                    const total = 10;
                    const num5 = Math.round((rating - r4) * total);
                    const num4 = total - num5;
                    arr = [
                      ...Array(num5).fill({ user: 'bin', rating: r5, text: 'Ngon', likes: 3 }),
                      ...Array(num4).fill({ user: 'bin', rating: r4, text: 'Khá ngon', likes: 1 })
                    ];
                  }
                  reviews = arr;
                }
                navigation.navigate('FoodDetailPopup', {
                  foodId: item.id,
                  image: item.image,
                  name: item.name,
                  price: item.price,
                  rating: item.rating,
                  description: item.description ?? 'Mô tả món ăn...',
                  sizes: item.sizes ?? ['Nhỏ', 'Vừa', 'Lớn'],
                  reviews,
                  storeName: store.name,
                });
              }}
            >
              <Image
                source={typeof item.image === 'string'
                  ? IMAGE_MAP[item.image] || require('../assets/images/placeholder.png')
                  : item.image}
                style={styles.foodImage}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.foodRating}>{item.rating}</Text>
                  <Star color="#f59e0b" size={14} style={{ marginLeft: 2 }} />
                </View>
                <Text style={styles.foodName}>{item.name}</Text>
                <Text style={styles.foodStore}>{store.name}</Text>
                <Text style={styles.foodPrice}>{item.price}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff7ed' },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 20,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  backIcon: {
    fontSize: 22,
    color: '#ea580c',
    fontWeight: 'bold',
  },
  headerImage: {
    width: '100%',
    height: 180,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: -32,
  },
  infoBox: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginTop: -24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  rowCenter: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  ratingText: { color: '#f59e0b', fontWeight: 'bold', marginLeft: 4, fontSize: 15 },
  dot: { color: '#d1d5db', marginHorizontal: 6, fontSize: 16 },
  delivery: { color: '#10b981', fontWeight: 'bold', fontSize: 14 },
  time: { color: '#6b7280', fontSize: 14, marginLeft: 4 },
  storeName: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 2 },
  storeDesc: { fontSize: 14, color: '#6b7280', marginBottom: 2 },
  voucherBox: { marginTop: 18, marginHorizontal: 16 },
  voucherTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#1f2937' },
  voucherCard: {
    flexDirection: 'row',
    alignItems: 'center',
  backgroundColor: '#fbbf24',
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  voucherIcon: { marginRight: 10 },
  voucherPercent: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  voucherDesc: { color: '#fff', fontSize: 13 },
  voucherCodeBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 10,
  },
  voucherCode: { color: '#f59e0b', fontWeight: 'bold', fontSize: 15 },
  tabBox: {
    flexDirection: 'row',
    marginTop: 24,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  tabText: { textAlign: 'center', color: '#6b7280', fontWeight: 'bold', fontSize: 15 },
  tabTextActive: { color: '#f59e0b' },
  foodListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
    color: '#1f2937',
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  foodImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  foodRating: { color: '#f59e0b', fontWeight: 'bold', fontSize: 13 },
  foodName: { fontWeight: 'bold', fontSize: 15, marginTop: 2 },
  foodStore: { color: '#6b7280', fontSize: 13 },
  foodPrice: { color: '#ef4444', fontWeight: 'bold', fontSize: 15, marginTop: 2 },
  addBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 22 },
});

// No default export, use named export above
