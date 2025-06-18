/**
 * Avatar upload utilities with image optimization
 */
import type { Database } from '@/lib/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface UploadAvatarOptions {
  file: File;
  userId: string;
  maxSizeMB?: number;
  quality?: number;
  maxDimension?: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Compress and resize image using canvas
 */
async function compressImage(file: File, maxDimension = 512, quality = 0.9): Promise<Blob | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        // Use better image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          'image/jpeg',
          quality,
        );
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Upload avatar to Supabase Storage with optimization
 */
export async function uploadAvatar(
  supabase: SupabaseClient<Database>,
  options: UploadAvatarOptions,
): Promise<UploadResult> {
  const { file, userId, maxSizeMB = 2, quality = 0.9, maxDimension = 512 } = options;

  try {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)',
      };
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      // Try to compress if too large
      const compressed = await compressImage(file, maxDimension, quality);
      if (!compressed) {
        return {
          success: false,
          error: 'Failed to compress image',
        };
      }

      // Check compressed size
      const compressedSizeMB = compressed.size / (1024 * 1024);
      if (compressedSizeMB > maxSizeMB) {
        return {
          success: false,
          error: `Image is too large. Maximum size is ${maxSizeMB}MB`,
        };
      }

      // Use compressed version
      const fileName = `${userId}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressed, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      return {
        success: true,
        url: publicUrl,
      };
    }

    // File is already small enough, but still optimize dimensions
    let uploadBlob: Blob = file;
    if (file.type !== 'image/gif') {
      // Don't compress GIFs to preserve animation
      const optimized = await compressImage(file, maxDimension, quality);
      if (optimized) {
        uploadBlob = optimized;
      }
    }

    // Generate unique filename
    const fileExt = file.type === 'image/gif' ? 'gif' : 'jpg';
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    // Upload to Supabase
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, uploadBlob, {
        contentType: file.type === 'image/gif' ? 'image/gif' : 'image/jpeg',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(fileName);

    return {
      success: true,
      url: publicUrl,
    };
  } catch (error) {
    console.error('Avatar upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload avatar',
    };
  }
}

/**
 * Delete old avatar files for a user
 */
export async function cleanupOldAvatars(
  supabase: SupabaseClient<Database>,
  userId: string,
  keepLatest = 1,
): Promise<void> {
  try {
    // List all files for the user
    const { data: files, error: listError } = await supabase.storage.from('avatars').list(userId, {
      sortBy: { column: 'created_at', order: 'desc' },
    });

    if (listError) throw listError;
    if (!files || files.length <= keepLatest) return;

    // Delete old files
    const filesToDelete = files.slice(keepLatest).map((file) => `${userId}/${file.name}`);

    const { error: deleteError } = await supabase.storage.from('avatars').remove(filesToDelete);

    if (deleteError) throw deleteError;
  } catch (error) {
    console.error('Failed to cleanup old avatars:', error);
  }
}

/**
 * Generate avatar URL with optimization parameters
 */
export function getOptimizedAvatarUrl(
  url: string,
  size: 'small' | 'medium' | 'large' = 'medium',
): string {
  if (!url || !url.includes('supabase')) return url;

  // Supabase Storage supports image transformation
  const dimensions = {
    small: 64,
    medium: 128,
    large: 256,
  };

  const dimension = dimensions[size];

  // Add transformation parameters
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}width=${dimension}&height=${dimension}&resize=cover`;
}
