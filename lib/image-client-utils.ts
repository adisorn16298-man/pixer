/**
 * Client-side image compression utility using HTML5 Canvas.
 * Ensures images are under a specific size limit before upload.
 */

export async function compressImage(file: File, maxSizeMB: number = 4.5): Promise<File> {
    // If file is already smaller than limit, return as is
    if (file.size <= maxSizeMB * 1024 * 1024) {
        return file;
    }

    console.log(`[Compression] File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds ${maxSizeMB}MB limit. Starting compression...`);

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Step 1: Resize if too large (Max 3000px dimension)
                const MAX_DIM = 3000;
                if (width > MAX_DIM || height > MAX_DIM) {
                    if (width > height) {
                        height *= MAX_DIM / width;
                        width = MAX_DIM;
                    } else {
                        width *= MAX_DIM / height;
                        height = MAX_DIM;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Failed to get canvas context'));
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Step 2: Export as JPEG with increasing compression until it fits
                // We'll start with 0.8 quality
                let quality = 0.8;

                const tryCompress = () => {
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            return reject(new Error('Canvas toBlob failed'));
                        }

                        if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.1) {
                            quality -= 0.1;
                            console.log(`[Compression] Still too large (${(blob.size / 1024 / 1024).toFixed(2)}MB). Retrying with quality ${quality.toFixed(1)}`);
                            tryCompress();
                        } else {
                            console.log(`[Compression] Success! Final size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
                            resolve(new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            }));
                        }
                    }, 'image/jpeg', quality);
                };

                tryCompress();
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}
