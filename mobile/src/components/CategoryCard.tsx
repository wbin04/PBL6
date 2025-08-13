import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Category } from '@/types';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '@/constants';

interface CategoryCardProps {
  category: Category;
  onPress: () => void;
  style?: ViewStyle;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity style={[styles.container, style]} onPress={onPress}>
      <View style={styles.content}>
        <Text style={styles.name}>{category.cate_name}</Text>
        <Text style={styles.count}>{category.foods_count} món</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    margin: SPACING.xs,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  
  content: {
    alignItems: 'center',
  },
  
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  
  count: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
