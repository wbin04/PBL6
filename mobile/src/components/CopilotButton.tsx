import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants';

type Props = {
  onPress?: (e: GestureResponderEvent) => void;
  style?: ViewStyle;
  testID?: string;
};

const CopilotButton: React.FC<Props> = ({ onPress, style, testID }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityLabel="Copilot"
      testID={testID}
      style={[styles.button, style]}
    >
      <Ionicons name="chatbubbles" size={22} color={COLORS.white} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.xl || 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
});

export default CopilotButton;
