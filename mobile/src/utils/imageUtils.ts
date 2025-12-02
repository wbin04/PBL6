import { IMAGE_MAP, ImageName } from '@/assets/imageMap';
import { API_CONFIG } from '@/constants';

/**
 * Safely get image source for React Native Image component
 * Handles local images, URLs, and fallback to placeholder
 */
export function getImageSource(img?: ImageName | string) {
  // Return default placeholder if no image provided
  if (!img || img === null || img === undefined || img === '') {
    return IMAGE_MAP["placeholder.png"];
  }

  try {
    // Check if it's a valid IMAGE_MAP key
    if (typeof img === "string" && IMAGE_MAP[img]) {
      return IMAGE_MAP[img];
    }

    // Check if it's a valid HTTP/HTTPS URL
    if (typeof img === "string" && /^https?:\/\//i.test(img)) {
      return { uri: img };
    }

    // Handle relative paths that might come from API
    if (typeof img === "string") {
      // Remove leading slash if present
      const cleanPath = img.startsWith('/') ? img.slice(1) : img;
      
      // Normalize base URL: remove trailing /api if present (API_CONFIG.BASE_URL often contains /api)
      const base = API_CONFIG.BASE_URL.replace(/\/api$/, '');

      // If it starts with media/, it's already a media path -> use directly
      if (cleanPath.startsWith('media/')) {
        const fullUrl = `${base}/${cleanPath}`;
        return { uri: encodeURI(fullUrl) };
      }

      // If it starts with assets/, server serves those under /media/assets/
      if (cleanPath.startsWith('assets/')) {
        const fullUrl = `${base}/media/${cleanPath}`;
        return { uri: encodeURI(fullUrl) };
      }

      // For other relative paths, assume they live under /media
      const fullUrl = `${base}/media/${cleanPath}`;
      return { uri: encodeURI(fullUrl) };
    }

    // Return default placeholder for any other case
    return IMAGE_MAP["placeholder.png"];
  } catch (error) {
    console.warn('Error in getImageSource:', error);
    return IMAGE_MAP["placeholder.png"];
  }
}

/**
 * Validate if an image URL is accessible
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}