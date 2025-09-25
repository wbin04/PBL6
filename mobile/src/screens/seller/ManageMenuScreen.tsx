import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Switch, TouchableWithoutFeedback } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Swipeable } from 'react-native-gesture-handler';
import { Trash2 } from 'lucide-react-native';

interface ManageMenuScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

const menuData = [
  {
    id: '1',
    name: 'Phở Bò Tái',
    desc: 'Phở bò tái thơm ngon, nước dùng đậm đà',
    price: 65000,
    image: require('../../assets/images/assorted-sushi.png'),
    rating: 4.6,
    orders: 156,
    available: true,
  },
  {
    id: '2',
    name: 'Bún Bò Huế',
    desc: 'Bún bò Huế cay nồng, đúng vị xứ Huế',
    price: 55000,
    image: require('../../assets/images/assorted-sushi.png'),
    rating: 4.3,
    orders: 89,
    available: true,
  },
  {
    id: '3',
    name: 'Bánh Mì Thịt',
    desc: 'Bánh mì thịt nướng giòn rụm, thơm lừng',
    price: 25000,
    image: require('../../assets/images/assorted-sushi.png'),
    rating: 4.4,
    orders: 234,
    available: false,
  },
];

const ManageMenuScreen: React.FC<ManageMenuScreenProps> = ({ navigation }) => {
  const [menu, setMenu] = React.useState(menuData);

  const handleToggle = (id: string) => {
    setMenu(prev => prev.map(item => item.id === id ? { ...item, available: !item.available } : item));
  };

  // Callback nhận món mới hoặc sửa món
  const handleAddOrEditFood = (food: any, editId?: string) => {
    if (editId) {
      setMenu(prev => prev.map(item => item.id === editId ? { ...item, ...food } : item));
    } else {
      setMenu(prev => [food, ...prev]);
    }
  };

  // Xử lý xóa món ăn
  const handleDeleteFood = (id: string) => {
    setMenu(prev => prev.filter(item => item.id !== id));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
      </View>
      {/* Section title + button */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Thực đơn của tôi</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddFoodScreen', { onAddFood: handleAddOrEditFood })}>
          <Text style={styles.addBtnText}>+ Thêm món</Text>
        </TouchableOpacity>
      </View>
      {/* Menu list */}
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {menu.map(item => (
          <Swipeable
            key={item.id}
            renderRightActions={() => (
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteFood(item.id)}>
                <Trash2 color="#fff" size={28} />
              </TouchableOpacity>
            )}
          >
            <TouchableWithoutFeedback onPress={() => navigation.navigate('FoodDetailScreen', { ...item, description: item.desc, desc: item.desc })}>
              <View style={styles.menuCard}>
                <View style={styles.menuLeft}>
                  <Image source={item.image} style={styles.menuImage} />
                </View>
                <View style={styles.menuCenter}>
                  <Text style={styles.menuName}>{item.name}</Text>
                  <Text style={styles.menuDesc}>{item.desc}</Text>
                  <Text style={styles.menuPrice}>{item.price.toLocaleString()} đ</Text>
                  <View style={styles.menuInfoRow}>
                    <Text style={styles.menuStar}>⭐ {item.rating}</Text>
                    <Text style={styles.menuOrders}>{item.orders} đơn</Text>
                  </View>
                </View>
                <View style={styles.menuRight}>
                  <Switch value={item.available} onValueChange={() => handleToggle(item.id)} style={{ transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }] }} />
                  <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditFoodScreen', { food: item, onEditFood: (foodData: any) => handleAddOrEditFood(foodData, item.id) })}>
                    <Text style={styles.editIcon}>✏️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Swipeable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8, backgroundColor: '#fff7ed' },
  headerTitle: { fontSize: 22, color: '#1e293b', fontWeight: 'bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f3f4f6', marginLeft: 6 },
  icon: { fontSize: 18 },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ea580c', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: 'bold' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F4A460', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  subtitle: { fontSize: 13, color: '#64748b', marginLeft: 18, marginBottom: 2 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 18, marginTop: -10, marginBottom: 20},
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#ea580c' },
  addBtn: { backgroundColor: '#ea580c', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  menuCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginHorizontal: 18, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  menuLeft: { marginRight: 12 },
  menuImage: { width: 54, height: 54, borderRadius: 12, backgroundColor: '#fffde7' },
  menuCenter: { flex: 1 },
  menuName: { fontWeight: 'bold', fontSize: 15, color: '#1e293b' },
  menuDesc: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  menuPrice: { fontSize: 15, color: '#ea580c', fontWeight: 'bold', marginTop: 4 },
  menuInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12 },
  menuStar: { fontSize: 13, color: '#f59e0b' },
  menuOrders: { fontSize: 13, color: '#64748b' },
  menuRight: { alignItems: 'center', justifyContent: 'space-between', marginLeft: 12 },
  editBtn: { marginTop: 12 },
  editIcon: { fontSize: 20 },
  deleteBtn: { backgroundColor: '#ea580c', justifyContent: 'center', alignItems: 'center', width: 100, height: '90%', borderRadius: 16, marginRight: 10 },
  deleteIcon: { fontSize: 24, color: '#fff', fontWeight: 'bold' },
});

export default ManageMenuScreen;
