import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import axios from 'axios';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/index';

import { API_CONFIG } from '@/constants';
import { IMAGE_MAP, type ImageName } from "@/assets/imageMap";

// Fallback categories nếu không nhận được từ ManageMenuScreen
const fallbackCategories = ['Món chính', 'Khai vị', 'Tráng miệng', 'Đồ uống', 'Món nướng', 'Món chiên', 'Món hấp', 'Salad', 'Súp', 'Khác'];

type EditFoodScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

function getImageSource(img?: ImageName | string) {
  // If it's a path starting with "assets/", prepend with /media/
  if (typeof img === "string" && img.startsWith("assets/")) {
    const baseUrl = API_CONFIG.BASE_URL.replace("/api", ""); // Remove /api from base URL
    const fullUrl = `${baseUrl}/media/${img}`;
    console.log('getImageSource - Assets path detected, constructed URL:', fullUrl);
    return { uri: fullUrl };
  }
  
  // If it's a relative path without leading slash, add it with /media/ prefix
  if (typeof img === "string" && !img.startsWith("/") && !img.includes("://")) {
    const baseUrl = API_CONFIG.BASE_URL.replace("/api", ""); // Remove /api from base URL
    const fullUrl = `${baseUrl}/media/${img}`;
    console.log('getImageSource - Relative path without slash, constructed URL:', fullUrl);
    return { uri: fullUrl };
  }
  
  return require("@/assets/images/gourmet-burger.png");
}

const EditFoodScreen: React.FC<EditFoodScreenProps> = ({ navigation, route }) => {
  const foodEdit = route.params?.food;
  const onEditFood = route.params?.onEditFood;
  const onRefresh = route.params?.onRefresh; // Callback để refresh ManageMenuScreen
  // Get auth token for API
  const { tokens } = useSelector((state: RootState) => state.auth);
  const receivedCategories = route.params?.categories; // Nhận categories từ ManageMenuScreen

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null); // Lưu ảnh gốc
  const [hasNewImage, setHasNewImage] = useState(false); // Flag để biết có ảnh mới không

  // Sử dụng categories từ ManageMenuScreen hoặc fallback
  // Build list of category objects
  const categoriesList: Array<{ id: number; name: string }> =
    Array.isArray(receivedCategories) && receivedCategories.length > 0
      ? receivedCategories as any
      : fallbackCategories.map((name, idx) => ({ id: idx, name }));

  console.log('EditFoodScreen - Received categories:', receivedCategories);
  console.log('EditFoodScreen - Using categoriesList:', categoriesList);

  // Chỉ set giá trị ban đầu một lần khi component mount
  useEffect(() => {
    if (foodEdit) {
      // Initialize form fields
      setName(foodEdit.title || foodEdit.name || '');
      setPrice(foodEdit.price ? String(foodEdit.price) : '');
      setDescription(foodEdit.description || '');
      setImage(foodEdit.image || null);
      setOriginalImage(foodEdit.image || null); // Lưu ảnh gốc
      setHasNewImage(false); // Reset flag
      
      // Determine initial category ID
      const initialCat = foodEdit.category?.id
        ?? (typeof foodEdit.category_name === 'string'
            ? categoriesList.find(c => c.name === foodEdit.category_name)?.id
            : null);
      if (initialCat !== null && categoriesList.some(c => c.id === initialCat)) {
        setSelectedCategoryId(initialCat);
        console.log('EditFoodScreen - Set initial category ID to', initialCat);
      } else if (categoriesList.length > 0) {
        setSelectedCategoryId(categoriesList[0].id);
        console.log('EditFoodScreen - Default category ID to', categoriesList[0].id);
      }
    }
  }, [foodEdit]); // Chỉ chạy khi foodEdit thay đổi

  const pickImage = async () => {
    try {
      // Sử dụng cú pháp cũ để tránh lỗi với phiên bản expo-image-picker hiện tại
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Giữ lại cú pháp cũ vì MediaType không tồn tại
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImageUri = result.assets[0].uri;
        setImage(newImageUri);
        setHasNewImage(true); // Đánh dấu có ảnh mới
        console.log('EditFoodScreen - New image selected:', newImageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const handleEditFood = async () => {
    if (!name.trim() || !price.trim() || selectedCategoryId === null || !description.trim() || !image) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ thông tin và chọn ảnh!');
      return;
    }

    if (!tokens?.access) {
      Alert.alert('Lỗi', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', name);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category_id', selectedCategoryId.toString());
      formData.append('availability', foodEdit.availability || 'Còn hàng');

      // Nếu có ảnh mới, thêm vào FormData
      if (hasNewImage && image) {
        console.log('EditFoodScreen - Adding new image to FormData...');
        const filename = image.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('image_file', {
          uri: image,
          name: filename,
          type: type,
        } as any);
      }
      // Nếu không có ảnh mới, không cần gửi image_file (giữ nguyên ảnh cũ)

      console.log('EditFoodScreen - Updating food with FormData...');

      const response = await axios.put(
        `${API_CONFIG.BASE_URL}/menu/admin/foods/${foodEdit.id}/`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${tokens.access}`,
            // Don't set Content-Type manually for FormData, axios will handle it with boundary
          },
        }
      );

      console.log('EditFoodScreen - Update successful:', response.data);
      Alert.alert('Thành công', 'Cập nhật món ăn thành công');

      // Gọi onRefresh để làm mới danh sách
      if (onRefresh) {
        onRefresh();
      }

      // Update local state (nếu có callback)
      if (onEditFood) {
        const updatedFood = {
          ...foodEdit,
          title: name,
          price: Number(price),
          description,
          category: selectedCategoryId,
          ...(hasNewImage && { image }) // Chỉ update image nếu có ảnh mới
        };
        onEditFood(updatedFood);
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('Error updating food:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Không thể cập nhật món ăn';
      Alert.alert('Lỗi', errorMessage);
    }
  };

  // Hàm để hiển thị ảnh (ưu tiên ảnh mới nếu có)
  const getDisplayImage = () => {
    if (hasNewImage && image) {
      // Hiển thị ảnh mới được chọn
      return { uri: image };
    } else if (originalImage) {
      // Hiển thị ảnh gốc
      return getImageSource(originalImage);
    }
    return null;
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
            {getDisplayImage() ? (
              <Image source={getDisplayImage()} style={styles.foodImage} />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Image source={require('../../assets/images/placeholder.png')} style={{ width: 40, height: 40, marginBottom: 8 }} />
                <Text style={styles.imageText}>Thêm ảnh món ăn</Text>
                <Text style={styles.imageSubText}>Nhấn để chọn từ thư viện hoặc chụp ảnh</Text>
              </View>
            )}
          </TouchableOpacity>
          {hasNewImage && (
            <Text style={styles.newImageIndicator}>Ảnh mới đã được chọn</Text>
          )}
        </View>
        
        {/* Thông tin cơ bản */}
        <View style={styles.sectionTitleBox}>
          <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
        </View>
        <View style={styles.formBox}>
          <Text style={styles.label}>Tên món ăn *</Text>
          <TextInput style={styles.input} placeholder="VD: Phở Bò Tái" value={name} onChangeText={setName} />
          
          <Text style={styles.label}>Giá tiền (VND) *</Text>
          <TextInput style={styles.input} placeholder="VD: 65000" value={price} onChangeText={setPrice} keyboardType="numeric" />
          
          <Text style={styles.label}>Danh mục *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categoriesList.map(catObj => (
              <TouchableOpacity
                key={catObj.id.toString()}
                style={[
                  styles.categoryBtn,
                  selectedCategoryId === catObj.id && styles.categoryBtnActive
                ]}
                onPress={() => {
                  setSelectedCategoryId(catObj.id);
                  console.log('EditFoodScreen - Selected category id:', catObj.id);
                }}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategoryId === catObj.id && styles.categoryTextActive
                  ]}
                >
                  {catObj.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <Text style={styles.label}>Mô tả món ăn</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Mô tả về hương vị, nguyên liệu..." 
            value={description} 
            onChangeText={setDescription} 
            multiline 
            numberOfLines={3} 
          />
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
  newImageIndicator: { 
    fontSize: 12, 
    color: '#10b981', 
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center'
  },
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