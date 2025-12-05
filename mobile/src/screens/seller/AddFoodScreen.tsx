import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, Alert, Keyboard, TouchableWithoutFeedback, Modal, Pressable } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft } from 'lucide-react-native';

import axios from 'axios';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/index';
import { API_CONFIG } from '@/constants';
import { Fonts } from '@/constants/Fonts';
import { SafeAreaView } from 'react-native-safe-area-context';

const categories = ['Món chính', 'Khai vị', 'Tráng miệng', 'Đồ uống', 'Món nướng', 'Món chiên', 'Món hấp', 'Salad', 'Súp', 'Khác'];

type AddFoodScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

const ORANGE = "#e95322";
const BORDER = "#e5e7eb";

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
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={['top', 'bottom']}>
        {/* Header giống EditFoodScreen */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thêm món ăn</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        >
          {/* Hình ảnh món ăn */}
          <View style={styles.imageSection}>
            <TouchableOpacity style={styles.imageBox} onPress={pickImage} activeOpacity={0.9}>
              {image ? (
                <Image source={{ uri: image }} style={styles.foodImage} />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Image 
                    source={require('../../assets/images/placeholder.png')} 
                    style={{ width: 40, height: 40, marginBottom: 8 }} 
                  />
                  <Text style={styles.imageText}>Thêm ảnh món ăn</Text>
                  <Text style={styles.imageSubText}>
                    Nhấn để chọn từ thư viện hoặc chụp ảnh
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Thông tin cơ bản */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Thông tin cơ bản</Text>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.label}>Tên món ăn</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Phở Bò Tái"
                placeholderTextColor="#9ca3af"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.label}>Giá tiền (VND)</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: 65000"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.label}>Danh mục</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 4 }}
              >
                {categoriesList.map((cat) => {
                  const active = category === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id.toString()}
                      style={[
                        styles.chip,
                        active && { backgroundColor: ORANGE, borderColor: ORANGE }
                      ]}
                      onPress={() => setCategory(cat.id)}
                      activeOpacity={0.9}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && { color: '#fff' }
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={{ marginBottom: 8 }}>
              <Text style={styles.label}>Mô tả món ăn</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                placeholder="Mô tả về hương vị, nguyên liệu..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          {/* Quản lý Size */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Quản lý Size (tùy chọn)</Text>
            <Text style={styles.helperText}>
              Thêm các size khác nhau cho món ăn. Giá size là giá phụ thêm vào giá gốc.
            </Text>

            {sizes.map((size, index) => (
              <View key={index} style={styles.sizeItem}>
                <View style={styles.sizeInfo}>
                  <Text style={styles.sizeName}>{size.size_name}</Text>
                  <Text style={styles.sizePrice}>
                    +{parseFloat(size.price).toLocaleString('vi-VN')}₫
                  </Text>
                </View>
                <View style={styles.sizeActions}>
                  <TouchableOpacity
                    onPress={() => handleEditSize(size, index)}
                    style={styles.sizeIconBtn}
                  >
                    <Text style={styles.sizeIconText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteSize(index)}
                    style={styles.sizeIconBtn}
                  >
                    <Text style={styles.sizeIconText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addSizeBtn}
              onPress={handleAddSize}
              activeOpacity={0.9}
            >
              <Text style={styles.addSizeText}>+ Thêm Size</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Bottom bar giống EditFoodScreen */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleAddFood}
            activeOpacity={0.9}
          >
            <Text style={styles.saveText}>Thêm món ăn</Text>
          </TouchableOpacity>
        </View>

        {/* Size Modal giống EditFoodScreen */}
        <Modal
          visible={showSizeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSizeModal(false)}
        >
          <View style={styles.modalRoot}>
            <Pressable
              style={styles.backdrop}
              onPress={() => {
                setShowSizeModal(false);
                setEditingSize(null);
              }}
            />
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingSize?.index !== undefined ? 'Sửa Size' : 'Thêm Size'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowSizeModal(false);
                    setEditingSize(null);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ fontSize: 18, color: '#6B7280' }}>×</Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={styles.label}>Tên size</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: Size L, Size M, Size lớn..."
                  placeholderTextColor="#9ca3af"
                  value={editingSize?.size_name || ''}
                  onChangeText={(text) =>
                    setEditingSize((prev) =>
                      prev ? { ...prev, size_name: text } : null
                    )
                  }
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={styles.label}>Giá thêm (VND)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: 10000"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={editingSize?.price || ''}
                  onChangeText={(text) =>
                    setEditingSize((prev) =>
                      prev ? { ...prev, price: text } : null
                    )
                  }
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#f3f4f6' }]}
                  onPress={() => {
                    setShowSizeModal(false);
                    setEditingSize(null);
                  }}
                >
                  <Text style={[styles.modalBtnText, { color: '#6b7280' }]}>
                    Hủy
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: ORANGE }]}
                  onPress={handleSaveSize}
                >
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                    Lưu
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

// Styles giống EditFoodScreen
const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 18,
    color: '#111827',
  },

  imageSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  imageBox: {
    width: 200,
    height: 150,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  imageText: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 15,
    color: ORANGE,
    textAlign: 'center',
  },
  imageSubText: {
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionLabel: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 14,
    color: '#111827',
    marginBottom: 8,
  },
  label: {
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 13,
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },

  chip: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  chipText: {
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 13,
    color: '#374151',
  },

  helperText: {
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 10,
  },

  sizeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  sizeInfo: { flex: 1 },
  sizeName: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 14,
    color: '#111827',
    marginBottom: 2,
  },
  sizePrice: {
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 13,
    color: ORANGE,
  },
  sizeActions: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 8,
  },
  sizeIconBtn: {
    padding: 6,
  },
  sizeIconText: {
    fontSize: 16,
  },
  addSizeBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ORANGE,
    backgroundColor: '#fff',
  },
  addSizeText: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 13,
    color: ORANGE,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fff',
    padding: 12,
    paddingBottom: 40,
  },
  saveBtn: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#fff',
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 15,
  },

  // Modal
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 16,
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 14,
  },
});

export default AddFoodScreen;
