import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

const categories = ['Món chính', 'Khai vị', 'Tráng miệng', 'Đồ uống', 'Món nướng', 'Món chiên', 'Món hấp', 'Salad', 'Súp', 'Khác'];

type EditFoodScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

const EditFoodScreen: React.FC<EditFoodScreenProps> = ({ navigation, route }) => {
  const foodEdit = route.params?.food;
  const onEditFood = route.params?.onEditFood;

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    if (foodEdit) {
      setName(foodEdit.name || '');
      setPrice(foodEdit.price ? String(foodEdit.price) : '');
      setCategory(foodEdit.category || categories[0]);
      setDescription(foodEdit.desc || '');
      setImage(foodEdit.image || null);
    }
  }, [foodEdit]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  const handleEditFood = () => {
    if (!name.trim() || !price.trim() || !category || !description.trim() || !image) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ thông tin và chọn ảnh!');
      return;
    }
    const updatedFood = {
      ...foodEdit,
      name,
      price: Number(price),
      category,
      desc: description,
      image,
    };
    if (onEditFood) {
      onEditFood(updatedFood);
    }
    navigation.goBack();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sửa món ăn</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.headerClose}>×</Text>
          </TouchableOpacity>
        </View>
        {/* Hình ảnh món ăn */}
        <View style={styles.imageSection}>
          <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.foodImage} />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Image source={require('../../assets/images/placeholder.png')} style={{ width: 40, height: 40, marginBottom: 8 }} />
                <Text style={styles.imageText}>Thêm ảnh món ăn</Text>
                <Text style={styles.imageSubText}>Nhấn để chọn từ thư viện hoặc chụp ảnh</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        {/* Thông tin cơ bản */}
        <View style={styles.sectionTitleBox}><Text style={styles.sectionTitle}>Thông tin cơ bản</Text></View>
        <View style={styles.formBox}>
          <Text style={styles.label}>Tên món ăn *</Text>
          <TextInput style={styles.input} placeholder="VD: Phở Bò Tái" value={name} onChangeText={setName} />
          <Text style={styles.label}>Giá tiền (VND) *</Text>
          <TextInput style={styles.input} placeholder="VD: 65000" value={price} onChangeText={setPrice} keyboardType="numeric" />
          <Text style={styles.label}>Danh mục *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((cat, idx) => (
              <TouchableOpacity key={cat} style={[styles.categoryBtn, category === cat && styles.categoryBtnActive]} onPress={() => setCategory(cat)}>
                <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.label}>Mô tả món ăn</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Mô tả về hương vị, nguyên liệu..." value={description} onChangeText={setDescription} multiline numberOfLines={3} />
        </View>
        {/* Nút hành động */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={handleEditFood}>
            <Text style={styles.addText}>Lưu thay đổi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff7ed', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTitle: { fontSize: 25, fontWeight: 'bold', color: '#ea580c', marginTop: 40 },
  headerClose: { fontSize: 28, color: '#ea580c', fontWeight: 'bold' },
  imageSection: { alignItems: 'center', padding: 20 },
  imageBox: { width: 180, height: 140, borderRadius: 16, borderWidth: 2, borderColor: '#fee2e2', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
  foodImage: { width: 180, height: 140, borderRadius: 16 },
  imageText: { fontSize: 16, color: '#ea580c', fontWeight: 'bold', textAlign: 'center' },
  imageSubText: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  sectionTitleBox: { backgroundColor: '#fff7ed', paddingVertical: 10, paddingHorizontal: 20 },
  sectionTitle: { fontWeight: 'bold', fontSize: 16, color: '#ea580c' },
  formBox: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginHorizontal: 20, marginTop: 8 },
  label: { fontSize: 14, color: '#6b7280', marginBottom: 4, marginTop: 12 },
  input: { backgroundColor: '#fff7ed', borderRadius: 8, borderWidth: 1, borderColor: '#f3f4f6', padding: 12, fontSize: 15, marginBottom: 8 },
  textArea: { height: 80, textAlignVertical: 'top' },
  categoryScroll: { marginVertical: 8 },
  categoryBtn: { backgroundColor: '#fff7ed', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginRight: 8, borderWidth: 1, borderColor: '#f3f4f6' },
  categoryBtnActive: { backgroundColor: '#ea580c', borderColor: '#ea580c' },
  categoryText: { color: '#ea580c', fontSize: 14 },
  categoryTextActive: { color: '#fff', fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff7ed' },
  cancelBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#f3f4f6', paddingVertical: 14, alignItems: 'center', marginRight: 12 },
  cancelText: { color: '#6b7280', fontWeight: 'bold', fontSize: 16 },
  addBtn: { flex: 1, backgroundColor: '#ea580c', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  addText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default EditFoodScreen;
