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
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Search } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { menuService } from '@/services';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, API_CONFIG } from '@/constants';
import { Fonts } from '@/constants/Fonts';
import { RootState, AppDispatch } from '@/store';
import { fetchCategories } from '@/store/slices/menuSlice';
import { Category } from '@/types';

interface FoodResult {
  id: number;
  title: string;
  price: number;
  image?: string | null;
  category_id?: number | null;
  category_name?: string | null;
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
    categoryId?: number;
    categoryName?: string;
  };
};

const normalizeImage = (img?: string | null) => {
  if (!img) return null;
  if (img.startsWith('http')) return img;
  const base = API_CONFIG.BASE_URL.replace('/api', '');
  const path = img.startsWith('/') ? img : `/media/${img}`;
  const full = `${base}${path}`;
  console.log('SearchResultsScreen normalizeImage', { img, path, full });
    const encoded = encodeURI(full);
    if (__DEV__) setDebugInfo(`normalize food img -> ${encoded}`);
    return encoded;
};

const SearchResultsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();
  const initialQuery = route.params?.query || '';
  const initialCategory = route.params?.categoryId || 0;
  const dispatch = useDispatch<AppDispatch>();
  const { categories } = useSelector((state: RootState) => state.menu);

  const [query, setQuery] = useState(initialQuery);
  const [rawResults, setRawResults] = useState<StoreResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number>(initialCategory);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    if (!categories || categories.length === 0) {
      dispatch(fetchCategories());
    }
  }, [categories, dispatch]);

  useEffect(() => {
    if (initialQuery || initialCategory) {
      fetchResults(initialQuery, initialCategory);
    }
  }, [initialQuery, initialCategory]);

  const fetchResults = async (q: string, category?: number) => {
    const trimmed = q.trim();
    if (!trimmed && !category) {
      setRawResults([]);
      setError('Vui lòng nhập từ khóa tìm kiếm');
      setDebugInfo('Empty query');
      return;
    }

    setLoading(true);
    setError(null);
    setDebugInfo(`Searching: ${trimmed || '(category only)'}`);
    try {
      console.log('SearchResultsScreen fetchResults start', { query: trimmed, category });
      const data = await menuService.searchFoodsGrouped(trimmed, category);
      console.log('SearchResultsScreen fetchResults success', {
        stores: data.results?.length || 0,
        total_foods: data.total_foods,
      });
      setDebugInfo(`Fetched stores=${data.results?.length || 0}, foods=${data.total_foods}`);
      if (data.results && data.results.length > 0) {
        const sample = data.results.slice(0, 2).map((s) => ({
          store: s.store_name,
          store_image: s.store_image,
          foods: (s.foods || []).slice(0, 3).map((f) => ({ title: f.title, image: f.image }))
        }));
        console.log('SearchResultsScreen sample results', sample);
      }
      const incoming = data.results || [];
      setRawResults(incoming);
      if (!data.results || data.results.length === 0) {
        setError('Không tìm thấy món ăn phù hợp');
        setDebugInfo('No results for query');
      }
    } catch (err: any) {
      console.log('SearchResultsScreen fetchResults error', err);
      setError(err?.message || 'Không thể tìm kiếm. Vui lòng thử lại.');
      setDebugInfo(`Error: ${err?.message || 'unknown'}`);
    } finally {
      setLoading(false);
    }
  };

  const filterByCategory = (stores: StoreResult[], categoryId: number) => {
    const catId = Number(categoryId || 0);
    if (!catId) return stores;
    return (stores || []).reduce<StoreResult[]>((acc, store) => {
      const foods = (store.foods || []).filter((f) => Number(f.category_id) === catId);
      if (foods.length > 0) {
        acc.push({ ...store, foods });
      }
      return acc;
    }, []);
  };

  const filteredResults = useMemo(
    () => filterByCategory(rawResults, selectedCategory),
    [rawResults, selectedCategory]
  );

  const sections = useMemo(() => {
    return (filteredResults || []).map((store) => ({
      title: store.store_name,
      store,
      data: store.foods || [],
    }));
  }, [filteredResults]);

  const categoriesWithAll = useMemo(() => {
    const allCategory: Category = {
      id: 0,
      cate_name: 'Tất cả',
      image: '',
    //   image_url: null,
      foods_count: undefined,
    };
    const list = [allCategory, ...(categories || [])];
    if (__DEV__ && list.length) {
      console.log('SearchResultsScreen categories sample', list.slice(0, 3));
    }
    return list;
  }, [categories]);

  const normalizeCategoryImage = (absolute?: string | null, fallback?: string | null) => {
    // Mirror home screen logic: prefer absolute image_url, otherwise build from image filename
    const candidate = absolute || fallback;
    if (!candidate) return null;
    if (candidate.startsWith('http')) return candidate;
    const base = API_CONFIG.BASE_URL.replace('/api', '');
    let path = candidate.replace(/\\/g, '/');
    // Remove a leading media/ if already present to avoid duplication
    if (path.startsWith('media/')) path = path.slice('media/'.length);
    path = path.startsWith('/') ? path : `/media/${path}`;
    path = path.replace('/media/media/', '/media/');
    const full = `${base}${path}`;
    const encoded = encodeURI(full);
    console.log('SearchResultsScreen category image', { image: fallback, image_url: absolute, path, full: encoded });
    if (__DEV__) setDebugInfo(`normalize category img -> ${encoded}`);
    return encoded;
  };

  const handleSelectCategory = (id: number) => {
    setSelectedCategory(id);
    // Trigger a refetch when switching category without changing query
    fetchResults(query, id);
    // Clear search errors when switching filters
    if (error && rawResults.length > 0) {
      setError(null);
    }
  };

  const renderCategories = () => (
    <View style={styles.categoryWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryContent}
      >
        {categoriesWithAll.map((cat) => {
          const active = selectedCategory === cat.id;
          const img = normalizeCategoryImage(cat.image_url, cat.image);
          const showFallback = !img;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
              onPress={() => handleSelectCategory(cat.id)}
              activeOpacity={0.85}
            >
              {img ? (
                <Image source={{ uri: img }} style={styles.categoryIcon} />
              ) : (
                <View style={[styles.categoryIcon, { backgroundColor: COLORS.gray100, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 16 }}>🍔</Text>
                </View>
              )}
              <Text
                style={[styles.categoryLabel, active && styles.categoryLabelActive]}
                numberOfLines={1}
              >
                {cat.cate_name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

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
        onSubmitEditing={() => fetchResults(query, selectedCategory)}
        returnKeyType="search"
        autoFocus={!initialQuery}
      />
      <TouchableOpacity
        onPress={() => fetchResults(query, selectedCategory)}
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
      {renderCategories()}

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

      {!loading && !error && rawResults.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Nhập từ khóa để tìm món ăn</Text>
        </View>
      )}

      {!loading && !error && rawResults.length > 0 && sections.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Không có món trong danh mục này</Text>
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

      {__DEV__ && !!debugInfo && (
        <View style={styles.debugBar}>
          <Text style={styles.debugText}>{debugInfo}</Text>
        </View>
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
  categoryWrapper: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  categoryContent: {
    gap: SPACING.sm,
    paddingRight: SPACING.sm,
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
    minWidth: 96,
    height: 44,
  },
  categoryChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#fff8f2',
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray100,
  },
  categoryLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: COLORS.text,
  },
  categoryLabelActive: {
    color: COLORS.primary,
    fontFamily: Fonts.LeagueSpartanSemiBold,
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
  debugBar: {
    position: 'absolute',
    bottom: 12,
    left: SPACING.lg,
    right: SPACING.lg,
    padding: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: BORDER_RADIUS.md,
  },
  debugText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
});

export default SearchResultsScreen;
