import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Send, ShoppingCart } from 'lucide-react-native';
import { Fonts } from '@/constants/Fonts';
import { CopilotIcon } from '@/assets/images/CopilotIcon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import chatbotService from '@/services/chatbotService';
import { FoodListMessage } from '@/components/chatbot/FoodListMessage';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  intent?: string;
  foods?: Array<{
    id: number;
    title: string;
    description?: string;
    price: string;
    image: string;
    store_id: number;
    store_name: string;
  }>;
}

export default function ChatbotScreen() {
  const navigation = useNavigation<any>();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Xin chào! Tôi là trợ lý ảo. Tôi có thể giúp bạn đặt món ăn, xem menu, hoặc tìm cửa hàng. Bạn muốn làm gì?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const flatListRef = useRef<FlatList>(null);

  // Initialize session ID
  useEffect(() => {
    const initSession = async () => {
      try {
        let sid = await AsyncStorage.getItem('chatbot_session_id');
        if (!sid) {
          sid = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await AsyncStorage.setItem('chatbot_session_id', sid);
        }
        setSessionId(sid);
      } catch (error) {
        console.error('Error initializing session:', error);
        setSessionId(`session_${Date.now()}`);
      }
    };
    initSession();
  }, []);

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      console.log('[ChatbotScreen] Sending message:', userMessage.text);
      console.log('[ChatbotScreen] Session ID:', sessionId);
      
      const data = await chatbotService.sendMessage(userMessage.text);
      
      console.log('[ChatbotScreen] Received response:', data);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply || 'Xin lỗi, tôi không hiểu. Bạn có thể nói rõ hơn không?',
        isUser: false,
        timestamp: new Date(),
        intent: data.intent,
        foods: data.data?.foods || undefined, // Thêm danh sách foods nếu có
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      console.error('[ChatbotScreen] Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error.message || 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={styles.messageWrapper}>
      <View
        style={[
          styles.messageContainer,
          item.isUser ? styles.userMessageContainer : styles.botMessageContainer,
        ]}
      >
        {!item.isUser && (
          <View style={styles.botIconContainer}>
            <CopilotIcon size={20} color="#e95322" />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            item.isUser ? styles.userMessageBubble : styles.botMessageBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              item.isUser ? styles.userMessageText : styles.botMessageText,
            ]}
          >
            {item.text}
          </Text>
          <Text style={styles.timestamp}>
            {item.timestamp.toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
      
      {/* Hiển thị danh sách món ăn nếu có */}
      {!item.isUser && item.foods && item.foods.length > 0 && (
        <View style={styles.foodListContainer}>
          <FoodListMessage foods={item.foods} />
        </View>
      )}
    </View>
  );

  const clearChat = () => {
    Alert.alert(
      'Xóa lịch sử chat',
      'Bạn có chắc muốn xóa toàn bộ lịch sử trò chuyện?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            setMessages([
              {
                id: '1',
                text: 'Xin chào! Tôi là trợ lý ảo. Tôi có thể giúp bạn đặt món ăn, xem menu, hoặc tìm cửa hàng. Bạn muốn làm gì?',
                isUser: false,
                timestamp: new Date(),
              },
            ]);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#3a1a12" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <CopilotIcon size={28} color="#e95322" />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Trợ lý ảo</Text>
            <Text style={styles.headerSubtitle}>Đang hoạt động</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Cart')}
            style={styles.iconButton}
          >
            <ShoppingCart size={24} color="#3a1a12" />
          </TouchableOpacity>
          <TouchableOpacity onPress={clearChat} style={styles.iconButton}>
            <Text style={styles.clearButton}>Xóa</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#e95322" />
          <Text style={styles.loadingText}>Đang trả lời...</Text>
        </View>
      )}

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            editable={!loading}
          />
          <TouchableOpacity
            onPress={sendMessage}
            style={[
              styles.sendButton,
              (!inputText.trim() || loading) && styles.sendButtonDisabled,
            ]}
            disabled={!inputText.trim() || loading}
          >
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  headerTextContainer: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: '#10b981',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  clearButton: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#e95322',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageWrapper: {
    marginBottom: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  botMessageContainer: {
    justifyContent: 'flex-start',
  },
  botIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userMessageBubble: {
    backgroundColor: '#e95322',
    borderBottomRightRadius: 4,
  },
  botMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanRegular,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  botMessageText: {
    color: '#111827',
  },
  timestamp: {
    fontSize: 11,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: '#9CA3AF',
    marginTop: 4,
  },
  foodListContainer: {
    marginTop: 8,
    width: '100%',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: '#6B7280',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: '#111827',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e95322',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
});
