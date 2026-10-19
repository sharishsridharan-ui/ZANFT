/** Resizes an image while preserving its proportions and returns an optimized JPEG data URL. */
export function compressImage(file: File, maxWidth: number, maxHeight: number, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Upload failed: please select an image file (PNG, JPG, WebP, GIF or HEIC).'));
      return;
    }
    if (file.size === 0) {
      reject(new Error('Upload failed: the selected image file is empty.'));
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      reject(new Error('Upload failed: this image is larger than 25 MB. Choose a smaller file.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Upload failed: the image could not be read.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Upload failed: this image format is not supported by your browser.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Upload failed: image compression is not supported by this browser.'));
          return;
        }
        context.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
