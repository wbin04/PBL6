import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { FoodListMessage } from './FoodListMessage';

// Mock data for testing
const mockFoods = [
  {
    id: 1,
    title: 'Pizza Hải Sản',
    description: 'Pizza với hải sản tươi ngon',
    price: '150000',
    image: 'https://via.placeholder.com/150',
    store_id: 1,
    store_name: 'Pizza House',
    sizes: [
      { id: 1, size_name: 'M', price: '150000' },
      { id: 2, size_name: 'L', price: '200000' },
    ],
  },
  {
    id: 2,
    title: 'Burger Bò',
    description: 'Burger bò Úc thượng hạng',
    price: '89000',
    image: 'https://via.placeholder.com/150',
    store_id: 1,
    store_name: 'Pizza House',
  },
  {
    id: 3,
    title: 'Phở Bò',
    description: 'Phở bò truyền thống Hà Nội',
    price: '60000',
    image: 'https://via.placeholder.com/150',
    store_id: 2,
    store_name: 'Nhà Hàng Việt',
  },
  {
    id: 4,
    title: 'Bún Chả',
    description: 'Bún chả Hà Nội đặc trưng',
    price: '55000',
    image: 'https://via.placeholder.com/150',
    store_id: 2,
    store_name: 'Nhà Hàng Việt',
  },
  {
    id: 5,
    title: 'Gỏi Cuốn',
    description: 'Gỏi cuốn tươi ngon',
    price: '45000',
    image: 'https://via.placeholder.com/150',
    store_id: 2,
    store_name: 'Nhà Hàng Việt',
  },
  {
    id: 6,
    title: 'Sushi Set',
    description: 'Set sushi đa dạng',
    price: '250000',
    image: 'https://via.placeholder.com/150',
    store_id: 3,
    store_name: 'Tokyo Sushi',
    sizes: [
      { id: 3, size_name: 'Set 10', price: '250000' },
      { id: 4, size_name: 'Set 20', price: '450000' },
    ],
  },
];

/**
 * Demo component để test FoodListMessage
 * 
 * Usage:
 * 1. Import component này vào một screen để test
 * 2. Hoặc thay thế mock data để test với dữ liệu thực
 */
export default function FoodListMessageDemo() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Food List Message Demo</Text>
        <Text style={styles.subtitle}>
          Testing component với {mockFoods.length} món từ{' '}
          {new Set(mockFoods.map(f => f.store_name)).size} cửa hàng
        </Text>
      </View>

      <View style={styles.content}>
        <FoodListMessage foods={mockFoods} />
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>Test Cases:</Text>
        <Text style={styles.instructionsText}>
          ✓ Click vào tên cửa hàng để navigate{'\n'}
          ✓ Click vào món ăn để xem chi tiết{'\n'}
          ✓ Tăng/giảm số lượng với nút +/-{'\n'}
          ✓ Thêm vào giỏ hàng
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  content: {
    padding: 16,
  },
  instructions: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fef3f0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e95322',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e95322',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#3a1a12',
    lineHeight: 22,
  },
});
