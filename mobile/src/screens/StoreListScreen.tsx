import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { IMAGE_MAP } from '../assets/imageMap';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

// Mock data có trường ảnh
const stores = [
  {
    id: '1',
    name: 'Quán Phở Hà Nội',
    rating: 4.8,
    address: '123 Đường A, Quận 1',
    image: require('../assets/images/assorted-sushi.png'),
    foods: [
      { id: 'f1', name: 'Phở bò', price: '50,000 ₫', rating: 4.9, image: require('../assets/images/assorted-sushi.png') },
      { id: 'f2', name: 'Phở gà', price: '45,000 ₫', rating: 4.7, image: require('../assets/images/fresh-salad-bowl.png') },
      { id: 'f5', name: 'Bún chả', price: '55,000 ₫', rating: 4.6, image: require('../assets/images/fresh-bowl-salad.png') },
    ],
  },
  {
    id: '2',
    name: 'Pizza Palace',
    rating: 4.6,
    address: '456 Đường B, Quận 3',
    image: require('../assets/images/burger-palace.png'),
    foods: [
      { id: 'f3', name: 'Pizza hải sản', price: '120,000 ₫', rating: 4.8, image: require('../assets/images/delicious-toppings-pizza.png') },
      { id: 'f4', name: 'Pizza bò', price: '110,000 ₫', rating: 4.5, image: require('../assets/images/burger-palace.png') },
      { id: 'f6', name: 'Pizza chay', price: '100,000 ₫', rating: 4.4, image: require('../assets/images/fresh-salad-bowl.png') },
    ],
  },
  {
    id: '3',
    name: 'Nhà Hàng Rose Garden',
    rating: 4.7,
    address: '36 Ngô Văn Sở',
    image: require('../assets/images/chocolate-berry-cupcake.png'),
    foods: [
      { id: 'f7', name: 'Bít tết nướng', price: '140,000 ₫', rating: 4.9, image: require('../assets/images/assorted-sushi.png') },
      { id: 'f8', name: 'Cơm gà', price: '60,000 ₫', rating: 4.7, image: require('../assets/images/fresh-bowl-salad.png') },
      { id: 'f9', name: 'Salad cá hồi', price: '80,000 ₫', rating: 4.8, image: require('../assets/images/fresh-salad-bowl.png') },
    ],
  },
  {
    id: '4',
    name: 'Bánh Ngọt Sweetie',
    rating: 4.5,
    address: '789 Đường C, Quận 5',
    image: require('../assets/images/chocolate-berry-cupcake.png'),
    foods: [
      { id: 'f10', name: 'Cupcake socola', price: '35,000 ₫', rating: 4.6, image: require('../assets/images/chocolate-berry-cupcake.png') },
      { id: 'f11', name: 'Bánh kem dâu', price: '40,000 ₫', rating: 4.7, image: require('../assets/images/fresh-bowl-salad.png') },
    ],
  },
  {
    id: '5',
    name: 'Sushi Tokyo',
    rating: 4.9,
    address: '101 Đường D, Quận 7',
    image: require('../assets/images/assorted-sushi.png'),
    foods: [
      { id: 'f12', name: 'Sushi cá hồi', price: '90,000 ₫', rating: 4.9, image: require('../assets/images/assorted-sushi.png') },
      { id: 'f13', name: 'Sushi tôm', price: '85,000 ₫', rating: 4.8, image: require('../assets/images/fresh-salad-bowl.png') },
      { id: 'f14', name: 'Sushi trứng', price: '80,000 ₫', rating: 4.7, image: require('../assets/images/fresh-bowl-salad.png') },
    ],
  },
];

const StoreListScreen = () => {
  const navigation = useNavigation<any>();

  const renderItem = ({ item }: any) => {
    // Debug log for image value
    console.log('Store image:', item.image);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('StoreDetailScreenV2', {
          storeId: item.id,
          name: item.name,
          address: item.address,
          image: item.image,
          foods: item.foods,
          rating: item.rating,
          delivery: 'Miễn phí',
          time: '20 phút',
          vouchers: [
            {
              id: 'v1',
              percent: 20,
              minOrder: '200.000 VND',
              code: 'SAVE20',
              desc: 'Giảm 20% cho đơn hàng từ 200.000 VND',
            },
          ],
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ marginRight: 12 }}>
            <Image
              source={
                typeof item.image === 'string'
                  ? IMAGE_MAP[item.image]
                    || (item.image.startsWith('http') ? { uri: item.image } : require('../assets/images/placeholder.png'))
                  : item.image
              }
              style={{ width: 54, height: 54, borderRadius: 12 }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.row}>
              <Star size={16} color="#f59e0b" />
              <Text style={styles.rating}>{item.rating}</Text>
              <Text style={styles.foodCount}>• {item.foods.length} món</Text>
            </View>
            <Text style={styles.address}>{item.address}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={stores}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        ListHeaderComponent={<Text style={styles.header}>Danh sách cửa hàng</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed' },
  header: { fontSize: 20, fontWeight: 'bold', color: '#ea580c', marginBottom: 16, marginTop: -20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  name: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  foodCount: { marginLeft: 8, fontSize: 12, color: '#6b7280', fontWeight: 'bold' },
  rating: { marginLeft: 4, fontSize: 14, color: '#f59e0b', fontWeight: 'bold' },
  address: { fontSize: 12, color: '#6b7280' },
});

export default StoreListScreen;
