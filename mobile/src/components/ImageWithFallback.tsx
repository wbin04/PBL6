import React, { useState } from 'react';
import { Image, ImageProps, StyleSheet } from 'react-native';
import { API_CONFIG } from '@/constants';

interface ImageWithFallbackProps extends ImageProps {
  fallbackSource?: any;
}

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  source,
  fallbackSource,
  style,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  // Process the source to ensure it's a valid URL
  const processSource = () => {
    if (hasError || !source || typeof source !== 'object' || !('uri' in source) || !source.uri) {
      return fallbackSource;
    }

    let { uri } = source;
    
    // If it's a relative URL, make it absolute
    if (uri && !uri.startsWith('http')) {
      const baseURL = API_CONFIG.BASE_URL.replace(/\/api\/?$/, '');
      uri = `${baseURL}/media/${uri.startsWith('/') ? uri.slice(1) : uri}`;
    }
    
    return { uri };
  };

  // Super simplified component - just a basic Image with error handling
  return (
    <Image
      {...props}
      defaultSource={fallbackSource}
      fadeDuration={0} // Disable fade transition that might be causing the overlay effect
      source={processSource()}
      style={[styles.image, style]}
      onError={() => {
        setHasError(true);
      }}
    />
  );
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});

export default ImageWithFallback;