import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, Alert, Keyboard, TouchableWithoutFeedback, Modal, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft } from "lucide-react-native";

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import axios from 'axios';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/index';

import { API_CONFIG } from '@/constants';
import { IMAGE_MAP, type ImageName } from "@/assets/imageMap";
import { Fonts } from "@/constants/Fonts";
import { SafeAreaView } from 'react-native-safe-area-context';

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

const ORANGE = "#e95322";
const BORDER = "#e5e7eb";

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
  const [sizes, setSizes] = useState<Array<{ id?: number; size_name: string; price: string; isNew?: boolean }>>([]);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [editingSize, setEditingSize] = useState<{ id?: number; size_name: string; price: string; index?: number } | null>(null);

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
      
      // Load existing sizes
      if (foodEdit.sizes && Array.isArray(foodEdit.sizes)) {
        setSizes(foodEdit.sizes.map((s: any) => ({
          id: s.id,
          size_name: s.size_name || s.name,
          price: String(s.price || 0)
        })));
      } else {
        setSizes([]);
      }
      
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
        `${API_CONFIG.BASE_URL}/menu/store/foods/${foodEdit.id}/`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${tokens.access}`,
            // Don't set Content-Type manually for FormData, axios will handle it with boundary
          },
        }
      );

      console.log('EditFoodScreen - Update successful:', response.data);

      // Update sizes (add new, update existing, delete removed)
      await updateFoodSizes();

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
          sizes: sizes,
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

  const updateFoodSizes = async () => {
    if (!tokens?.access) return;

    try {
      // Get original sizes from foodEdit
      const originalSizes = foodEdit.sizes || [];
      const originalSizeIds = originalSizes.map((s: any) => s.id);
      const currentSizeIds = sizes.filter(s => s.id).map(s => s.id);

      // Delete removed sizes
      for (const origSize of originalSizes) {
        if (!currentSizeIds.includes(origSize.id)) {
          console.log('Deleting size:', origSize.id);
          await axios.delete(
            `${API_CONFIG.BASE_URL}/menu/store/foods/${foodEdit.id}/sizes/${origSize.id}/`,
            {
              headers: { 'Authorization': `Bearer ${tokens.access}` }
            }
          );
        }
      }

      // Add or update sizes
      for (const size of sizes) {
        if (size.id) {
          // Update existing size
          const originalSize = originalSizes.find((s: any) => s.id === size.id);
          if (originalSize && (originalSize.size_name !== size.size_name || String(originalSize.price) !== size.price)) {
            console.log('Updating size:', size.id);
            await axios.put(
              `${API_CONFIG.BASE_URL}/menu/store/foods/${foodEdit.id}/sizes/${size.id}/`,
              { size_name: size.size_name, price: parseFloat(size.price) },
              {
                headers: { 'Authorization': `Bearer ${tokens.access}` }
              }
            );
          }
        } else {
          // Add new size
          console.log('Adding new size:', size.size_name);
          await axios.post(
            `${API_CONFIG.BASE_URL}/menu/store/foods/${foodEdit.id}/sizes/`,
            { size_name: size.size_name, price: parseFloat(size.price) },
            {
              headers: { 'Authorization': `Bearer ${tokens.access}` }
            }
          );
        }
      }
    } catch (error) {
      console.error('Error updating sizes:', error);
      // Don't throw - sizes update is secondary to food update
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
        id: editingSize.id,
        size_name: editingSize.size_name,
        price: editingSize.price
      };
      setSizes(newSizes);
    } else {
      // Add new
      setSizes([...sizes, {
        size_name: editingSize.size_name,
        price: editingSize.price,
        isNew: true
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
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chỉnh sửa món ăn</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        >
          {/* Ảnh món ăn */}
          <View style={styles.imageSection}>
            <TouchableOpacity style={styles.imageBox} onPress={pickImage} activeOpacity={0.9}>
              {getDisplayImage() ? (
                <Image source={getDisplayImage()} style={styles.foodImage} />
              ) : (
                <View style={{ alignItems: "center" }}>
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
            {hasNewImage && (
              <Text style={styles.newImageIndicator}>Ảnh mới đã được chọn</Text>
            )}
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
                {categoriesList.map((catObj) => {
                  const active = selectedCategoryId === catObj.id;
                  return (
                    <TouchableOpacity
                      key={catObj.id.toString()}
                      onPress={() => {
                        setSelectedCategoryId(catObj.id);
                        console.log("EditFoodScreen - Selected category id:", catObj.id);
                      }}
                      style={[
                        styles.chip,
                        active && { backgroundColor: ORANGE, borderColor: ORANGE },
                      ]}
                      activeOpacity={0.9}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && { color: "#fff" },
                        ]}
                      >
                        {catObj.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={{ marginBottom: 8 }}>
              <Text style={styles.label}>Mô tả món ăn</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: "top" }]}
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
                    +{parseFloat(size.price).toLocaleString("vi-VN")}₫
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
              onPress={handleAddSize}
              style={styles.addSizeBtn}
              activeOpacity={0.9}
            >
              <Text style={styles.addSizeText}>+ Thêm Size</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Bottom bar như add.tsx */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            onPress={handleEditFood}
            style={styles.saveBtn}
            activeOpacity={0.9}
          >
            <Text style={styles.saveText}>Lưu món ăn</Text>
          </TouchableOpacity>
        </View>

        {/* Modal Size – chỉ đổi style, giữ logic */}
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
                  {editingSize?.index !== undefined ? "Sửa Size" : "Thêm Size"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowSizeModal(false);
                    setEditingSize(null);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ fontSize: 18, color: "#6B7280" }}>×</Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={styles.label}>Tên size</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: Size L, Size M, Size lớn..."
                  placeholderTextColor="#9ca3af"
                  value={editingSize?.size_name || ""}
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
                  value={editingSize?.price || ""}
                  onChangeText={(text) =>
                    setEditingSize((prev) =>
                      prev ? { ...prev, price: text } : null
                    )
                  }
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: "#f3f4f6" }]}
                  onPress={() => {
                    setShowSizeModal(false);
                    setEditingSize(null);
                  }}
                >
                  <Text style={[styles.modalBtnText, { color: "#6b7280" }]}>
                    Hủy
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: ORANGE }]}
                  onPress={handleSaveSize}
                >
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>
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

// CHỈ styles mới, dựa theo address/add.tsx
const styles = StyleSheet.create({
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f3f4f6",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 18,
    color: "#111827",
  },

  imageSection: {
    alignItems: "center",
    marginBottom: 16,
  },
  imageBox: {
    width: 200,
    height: 150,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  foodImage: {
    width: "100%",
    height: "100%",
  },
  imageText: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 15,
    color: ORANGE,
    textAlign: "center",
  },
  imageSubText: {
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 4,
  },
  newImageIndicator: {
    marginTop: 6,
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 12,
    color: "#10b981",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionLabel: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 14,
    color: "#111827",
    marginBottom: 8,
  },
  label: {
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 13,
    color: "#374151",
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
    color: "#111827",
    backgroundColor: "#fff",
  },

  chip: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: "#fff",
  },
  chipText: {
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 13,
    color: "#374151",
  },

  helperText: {
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 10,
  },

  sizeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  sizeInfo: { flex: 1 },
  sizeName: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 14,
    color: "#111827",
    marginBottom: 2,
  },
  sizePrice: {
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 13,
    color: ORANGE,
  },
  sizeActions: {
    flexDirection: "row",
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
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ORANGE,
    backgroundColor: "#fff",
  },
  addSizeText: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 13,
    color: ORANGE,
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#fff",
    padding: 12,
    paddingBottom: 40,
  },
  saveBtn: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    color: "#fff",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 15,
  },

  // Modal (dựa theo add.tsx)
  modalRoot: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 16,
    color: "#111827",
  },
  modalActions: {
    flexDirection: "row",
    marginTop: 16,
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnText: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 14,
  },
});

export default EditFoodScreen;