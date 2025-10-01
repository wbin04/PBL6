import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, Alert, Keyboard, TouchableWithoutFeedback, Modal } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

import axios from 'axios';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/index';
import { API_CONFIG } from '@/constants';

const categories = ['Món chính', 'Khai vị', 'Tráng miệng', 'Đồ uống', 'Món nướng', 'Món chiên', 'Món hấp', 'Salad', 'Súp', 'Khác'];

type AddFoodScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

const AddFoodScreen: React.FC<AddFoodScreenProps> = ({ navigation, route }) => {
  // Get auth token and callback
  const { tokens } = useSelector((state: RootState) => state.auth);
  const onAddFood = route.params?.onAddFood;
  const onRefresh = route.params?.onRefresh;
  const receivedCategories = route.params?.categories;

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Array<{ size_name: string; price: string }>>([]);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [editingSize, setEditingSize] = useState<{ size_name: string; price: string; index?: number } | null>(null);

  // Build category list
  const categoriesList: Array<{ id: number; name: string }> =
    Array.isArray(receivedCategories) && receivedCategories.length > 0
      ? receivedCategories as any
      : categories.map((name, idx) => ({ id: idx, name }));

  // Set initial category
  React.useEffect(() => {
    if (categoriesList.length > 0 && category === null) {
      setCategory(categoriesList[0].id);
    }
  }, [categoriesList]);

  // Hàm chọn ảnh từ thư viện
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  // Hàm xử lý thêm món
  const handleAddFood = async () => {
    if (!name.trim() || !price.trim() || category === null || !description.trim() || !image) {
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
      formData.append('category_id', category.toString());
      formData.append('availability', 'Còn hàng');

      // Add image
      const filename = image.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image_file', {
        uri: image,
        name: filename,
        type: type,
      } as any);

      console.log('AddFoodScreen - Creating food with FormData...');

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/menu/admin/foods/`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${tokens.access}`,
          },
        }
      );

      console.log('AddFoodScreen - Create successful:', response.data);
      const newFoodId = response.data.id;

      // Add sizes if any
      if (sizes.length > 0) {
        await addFoodSizes(newFoodId);
      }

      Alert.alert('Thành công', 'Thêm món ăn thành công');

      // Refresh list
      if (onRefresh) {
        onRefresh();
      }

      if (onAddFood) {
        onAddFood(response.data);
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('Error creating food:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Không thể thêm món ăn';
      Alert.alert('Lỗi', errorMessage);
    }
  };

  const addFoodSizes = async (foodId: number) => {
    if (!tokens?.access) return;

    try {
      for (const size of sizes) {
        console.log('Adding size:', size.size_name);
        await axios.post(
          `${API_CONFIG.BASE_URL}/menu/admin/foods/${foodId}/sizes/`,
          { size_name: size.size_name, price: parseFloat(size.price) },
          {
            headers: { 'Authorization': `Bearer ${tokens.access}` }
          }
        );
      }
    } catch (error) {
      console.error('Error adding sizes:', error);
      // Don't throw - sizes are optional
    }
  };

  const handleAddSize = () => {
    setEditingSize({ size_name: '', price: '' });
    setShowSizeModal(true);
  };

  const handleEditSize = (size: any, index: number) => {
    setEditingSize({ ...size, index });
    setShowSizeModal(true);
  };

  const handleSaveSize = () => {
    if (!editingSize) return;

    if (!editingSize.size_name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên size');
      return;
    }

    if (!editingSize.price.trim() || isNaN(parseFloat(editingSize.price))) {
      Alert.alert('Lỗi', 'Vui lòng nhập giá hợp lệ');
      return;
    }

    if (editingSize.index !== undefined) {
      // Update existing
      const newSizes = [...sizes];
      newSizes[editingSize.index] = {
        size_name: editingSize.size_name,
        price: editingSize.price
      };
      setSizes(newSizes);
    } else {
      // Add new
      setSizes([...sizes, {
        size_name: editingSize.size_name,
        price: editingSize.price
      }]);
    }

    setShowSizeModal(false);
    setEditingSize(null);
  };

  const handleDeleteSize = (index: number) => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc muốn xóa size này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            const newSizes = sizes.filter((_, i) => i !== index);
            setSizes(newSizes);
          }
        }
      ]
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Thêm món</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.headerClose}>×</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView showsVerticalScrollIndicator={false}>
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
            {categoriesList.map((cat) => (
              <TouchableOpacity 
                key={cat.id.toString()} 
                style={[styles.categoryBtn, category === cat.id && styles.categoryBtnActive]} 
                onPress={() => setCategory(cat.id)}
              >
                <Text style={[styles.categoryText, category === cat.id && styles.categoryTextActive]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.label}>Mô tả món ăn</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Mô tả về hương vị, nguyên liệu..." value={description} onChangeText={setDescription} multiline numberOfLines={3} />
        </View>
        
        {/* Quản lý Size */}
        <View style={styles.sectionTitleBox}>
          <Text style={styles.sectionTitle}>Quản lý Size (Tùy chọn)</Text>
        </View>
        <View style={styles.formBox}>
          <Text style={styles.sizeDescription}>Thêm các size khác nhau cho món ăn. Giá size là giá phụ thêm vào giá gốc.</Text>
          
          {sizes.map((size, index) => (
            <View key={index} style={styles.sizeItem}>
              <View style={styles.sizeInfo}>
                <Text style={styles.sizeName}>{size.size_name}</Text>
                <Text style={styles.sizePrice}>+{parseFloat(size.price).toLocaleString('vi-VN')}₫</Text>
              </View>
              <View style={styles.sizeActions}>
                <TouchableOpacity onPress={() => handleEditSize(size, index)} style={styles.sizeActionBtn}>
                  <Text style={styles.sizeActionText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteSize(index)} style={styles.sizeActionBtn}>
                  <Text style={styles.sizeActionText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          
          <TouchableOpacity style={styles.addSizeBtn} onPress={handleAddSize}>
            <Text style={styles.addSizeText}>+ Thêm Size</Text>
          </TouchableOpacity>
        </View>
        
        {/* Nút hành động */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={handleAddFood}>
            <Text style={styles.addText}>Thêm món</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>

        {/* Size Modal */}
        <Modal
          visible={showSizeModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSizeModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowSizeModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                    {editingSize?.index !== undefined ? 'Sửa Size' : 'Thêm Size'}
                  </Text>
                  
                  <Text style={styles.modalLabel}>Tên size *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="VD: Size L, Size M, Size Lớn..."
                    value={editingSize?.size_name || ''}
                    onChangeText={(text) => setEditingSize(prev => prev ? { ...prev, size_name: text } : null)}
                  />
                  
                  <Text style={styles.modalLabel}>Giá thêm (VND) *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="VD: 10000"
                    value={editingSize?.price || ''}
                    onChangeText={(text) => setEditingSize(prev => prev ? { ...prev, price: text } : null)}
                    keyboardType="numeric"
                  />
                  
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.modalCancelBtn}
                      onPress={() => {
                        setShowSizeModal(false);
                        setEditingSize(null);
                      }}
                    >
                      <Text style={styles.modalCancelText}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalSaveBtn}
                      onPress={handleSaveSize}
                    >
                      <Text style={styles.modalSaveText}>Lưu</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
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
  
  // Size management styles
  sizeDescription: { fontSize: 13, color: '#6b7280', marginBottom: 12, fontStyle: 'italic' },
  sizeItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#fff7ed', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fed7aa'
  },
  sizeInfo: { flex: 1 },
  sizeName: { fontSize: 15, fontWeight: 'bold', color: '#ea580c', marginBottom: 2 },
  sizePrice: { fontSize: 14, color: '#6b7280' },
  sizeActions: { flexDirection: 'row', gap: 8 },
  sizeActionBtn: { padding: 8 },
  sizeActionText: { fontSize: 18 },
  addSizeBtn: { 
    backgroundColor: '#ea580c', 
    borderRadius: 8, 
    paddingVertical: 10, 
    alignItems: 'center', 
    marginTop: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#fb923c'
  },
  addSizeText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ea580c',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    padding: 12,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#6b7280',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#ea580c',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

export default AddFoodScreen;
