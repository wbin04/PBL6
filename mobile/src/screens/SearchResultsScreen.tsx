import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SectionList,
  TouchableOpacity,
  Image,
  TextInput,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Search } from 'lucide-react-native';
import { menuService } from '@/services';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, API_CONFIG } from '@/constants';
import { Fonts } from '@/constants/Fonts';

interface FoodResult {
  id: number;
  title: string;
  price: number;
  image?: string | null;
}

interface StoreResult {
  store_id: number;
  store_name: string;
  store_image?: string | null;
  foods: FoodResult[];
}

type RouteParams = {
  params?: {
    query?: string;
  };
};

const normalizeImage = (img?: string | null) => {
  if (!img) return null;
  if (img.startsWith('http')) return img;
  const base = API_CONFIG.BASE_URL.replace('/api', '');
  const path = img.startsWith('/') ? img : `/media/${img}`;
  const full = `${base}${path}`;
  console.log('SearchResultsScreen normalizeImage', { img, path, full });
  return `${base}${path}`;
};

const SearchResultsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();
  const initialQuery = route.params?.query || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<StoreResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialQuery) {
      fetchResults(initialQuery);
    }
  }, [initialQuery]);

  const fetchResults = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setError('Vui lòng nhập từ khóa tìm kiếm');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('SearchResultsScreen fetchResults start', { query: q.trim() });
      const data = await menuService.searchFoodsGrouped(q.trim());
      console.log('SearchResultsScreen fetchResults success', {
        stores: data.results?.length || 0,
        total_foods: data.total_foods,
      });
      if (data.results && data.results.length > 0) {
        const sample = data.results.slice(0, 2).map((s) => ({
          store: s.store_name,
          store_image: s.store_image,
          foods: (s.foods || []).slice(0, 3).map((f) => ({ title: f.title, image: f.image }))
        }));
        console.log('SearchResultsScreen sample results', sample);
      }
      setResults(data.results || []);
      if (!data.results || data.results.length === 0) {
        setError('Không tìm thấy món ăn phù hợp');
      }
    } catch (err: any) {
      console.log('SearchResultsScreen fetchResults error', err);
      setError(err?.message || 'Không thể tìm kiếm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const sections = useMemo(() => {
    return (results || []).map((store) => ({
      title: store.store_name,
      store,
      data: store.foods || [],
    }));
  }, [results]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <ArrowLeft size={20} color={COLORS.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Kết quả tìm kiếm</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchBar}>
      <Search size={18} color={COLORS.textSecondary} />
      <TextInput
        style={styles.searchInput}
        placeholder="Tìm món ăn..."
        placeholderTextColor={COLORS.textSecondary}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => fetchResults(query)}
        returnKeyType="search"
        autoFocus={!initialQuery}
      />
      <TouchableOpacity
        onPress={() => fetchResults(query)}
        activeOpacity={0.8}
        style={styles.searchButton}
      >
        <Text style={styles.searchButtonText}>Tìm</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSectionHeader = ({ section }: any) => {
    const store: StoreResult = section.store;
    return (
      <TouchableOpacity
        style={styles.storeHeader}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('StoreDetail', { storeId: store.store_id })}
      >
        <Image
          source={normalizeImage(store.store_image) ? { uri: normalizeImage(store.store_image)! } : require('@/assets/images/placeholder.png')}
          style={styles.storeImage}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.storeName}>{store.store_name}</Text>
          <Text style={styles.storeMeta}>{store.foods.length} món</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item, section }: { item: FoodResult; section: any }) => (
    <TouchableOpacity
      style={styles.foodCard}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('FoodDetail', { foodId: item.id })}
    >
      <Image
        source={normalizeImage(item.image) ? { uri: normalizeImage(item.image)! } : require('@/assets/images/placeholder.png')}
        style={styles.foodImage}
      />
      <Text style={styles.foodTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.foodPrice}>{item.price.toLocaleString('vi-VN')} VND</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {renderHeader()}
      {renderSearchBar()}

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && !error && sections.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Nhập từ khóa để tìm món ăn</Text>
        </View>
      )}

      {!loading && sections.length > 0 && (
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.id}`}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          SectionSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZES.lg,
    fontFamily: Fonts.LeagueSpartanBold,
    color: COLORS.text,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: COLORS.text,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.md,
  },
  searchButtonText: {
    color: COLORS.white,
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: FONT_SIZES.sm,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  storeImage: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray100,
  },
  storeName: {
    fontSize: FONT_SIZES.lg,
    fontFamily: Fonts.LeagueSpartanBold,
    color: COLORS.text,
  },
  storeMeta: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontFamily: Fonts.LeagueSpartanRegular,
    marginTop: 2,
  },
  foodCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  foodImage: {
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray100,
  },
  foodTitle: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: COLORS.text,
  },
  foodPrice: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  foodStoreName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  loadingText: {
    marginTop: SPACING.sm,
    color: COLORS.text,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  errorText: {
    color: COLORS.error,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
});

export default SearchResultsScreen;
