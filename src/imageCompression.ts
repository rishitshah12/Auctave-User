/**
 * Factory image compression utility.
 *
 * Strategy: resize to the maximum pixels a screen will ever display, then
 * encode as WebP (which gives 30-40% smaller files than JPEG at identical
 * visual quality). Quality is set high (0.92) so the output is
 * indistinguishable from the original at any zoom level.
 *
 * Non-image files (PDFs, etc.) are returned untouched.
 */

export type ImageTarget = 'cover' | 'gallery' | 'catalog' | 'swatch';

const TARGET_CONFIG: Record<ImageTarget, { maxPx: number; quality: number }> = {
    // Cover / hero — shown fullscreen on detail page, needs to look sharp on 4K retina
    cover:   { maxPx: 1920, quality: 0.92 },
    // Gallery slideshow — same as cover
    gallery: { maxPx: 1920, quality: 0.92 },
    // Product catalog thumbnails — shown at ~300px, 1200px covers retina
    catalog: { maxPx: 1200, quality: 0.90 },
    // Fabric swatch tiles — shown at ~120px, 600px covers retina
    swatch:  { maxPx: 600,  quality: 0.90 },
};

/**
 * Compress and resize an image File before uploading.
 * Returns the original file unchanged if it is not an image (e.g. PDF).
 *
 * @param file    The file selected by the user
 * @param target  Where the image will be displayed — drives max resolution
 */
export function compressImage(file: File, target: ImageTarget = 'gallery'): Promise<File> {
    // Skip non-image files (PDFs, docs, etc.)
    if (!file.type.startsWith('image/')) return Promise.resolve(file);

    const { maxPx, quality } = TARGET_CONFIG[target];

    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const { width, height } = img;

                // Only scale DOWN — never upscale a small image
                const scale = Math.min(1, maxPx / Math.max(width, height));
                const newWidth  = Math.round(width  * scale);
                const newHeight = Math.round(height * scale);

                const canvas = document.createElement('canvas');
                canvas.width  = newWidth;
                canvas.height = newHeight;

                const ctx = canvas.getContext('2d')!;
                // Smooth interpolation for best quality when downscaling
                ctx.imageSmoothingEnabled  = true;
                ctx.imageSmoothingQuality  = 'high';
                ctx.drawImage(img, 0, 0, newWidth, newHeight);

                // Prefer WebP — same visual quality, 30-40% smaller than JPEG
                // Falls back to JPEG on browsers that don't support WebP encoding
                const useWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
                const mime    = useWebP ? 'image/webp' : 'image/jpeg';
                const ext     = useWebP ? 'webp'      : 'jpg';

                canvas.toBlob(
                    (blob) => {
                        if (!blob) { resolve(file); return; }

                        // If compression somehow made the file LARGER, keep the original
                        if (blob.size >= file.size) { resolve(file); return; }

                        const baseName = file.name.replace(/\.[^.]+$/, '');
                        resolve(new File([blob], `${baseName}.${ext}`, { type: mime }));
                    },
                    mime,
                    quality,
                );
            };

            img.onerror = () => resolve(file); // fail gracefully — upload original
            img.src = e.target!.result as string;
        };

        reader.onerror = () => resolve(file); // fail gracefully
        reader.readAsDataURL(file);
    });
}
