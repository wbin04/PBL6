import React, { useState } from "react";
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types";

type ReviewScreenRouteProp = RouteProp<RootStackParamList, 'Review'>;

export default function ReviewScreen() {
  const route = useRoute<ReviewScreenRouteProp>();
  const navigation = useNavigation();
  
  // Lấy thông tin từ route params
  const { orderId } = route.params || { orderId: 1 };
  
  const food = {
    name: "Chicken Curry",
    image: { uri: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80" },
  };

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleSubmit = () => {
    console.log('Rating:', rating, 'Comment:', comment, 'OrderId:', orderId);
    // TODO: Gửi đánh giá lên server
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Header tự làm */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đánh giá món ăn</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Image source={food.image} style={styles.foodImage} />
        <Text style={styles.foodName}>{food.name}</Text>
        <Text style={styles.desc}>Chúng tôi rất muốn biết bạn nghĩ gì về món ăn này.</Text>
        <View style={styles.starsRow}>
          {[1,2,3,4,5].map((i) => (
            <TouchableOpacity key={i} onPress={() => setRating(i)}>
              <Ionicons
                name={i <= rating ? "star" : "star-outline"}
                size={36}
                color="#E95322"
                style={styles.star}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.commentLabel}>Để lại bình luận của bạn!</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Viết đánh giá..."
          placeholderTextColor="#B8A97F"
          value={comment}
          onChangeText={setComment}
          multiline
        />
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>Gửi đánh giá</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFE082" },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: 24,
    flex: 1,
    alignItems: "center",
    padding: 24,
  },
  foodImage: {
    width: 110,
    height: 110,
    borderRadius: 24,
    marginTop: 8,
    marginBottom: 12,
  },
  foodName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#3B1F0A",
    marginBottom: 8,
    textAlign: "center",
  },
  desc: {
    color: "#3B1F0A",
    fontSize: 16,
    marginBottom: 18,
    textAlign: "center",
    fontWeight: "500",
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
  star: {
    marginHorizontal: 2,
  },
  commentLabel: {
    fontSize: 15,
    color: "#3B1F0A",
    fontWeight: "500",
    marginTop: 8,
    marginBottom: 15,
    textAlign: "center",
  },
  textInput: {
    backgroundColor: "#FFF7D6",
    borderRadius: 16,
    minHeight: 50,
    padding: 12,
    fontSize: 15,
    color: "#3B1F0A",
    marginBottom: 18,
    width: "100%",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
    marginBottom: 8,
  },
  cancelBtn: {
    backgroundColor: "#FFE3D6",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 32,
    marginRight: 8,
    flex: 1,
    alignItems: 'center',
  },
  cancelText: {
    color: "#E95322",
    fontWeight: "bold",
    fontSize: 16,
  },
  submitBtn: {
    backgroundColor: "#E95322",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 32,
    flex: 1,
    alignItems: 'center',
  },
  submitText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});