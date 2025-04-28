const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeImages() {
  const imagePath = path.join(__dirname, '../public/assets/preview-DiqrwRpn.png');
  
  try {
    // Create WebP version (better compression)
    await sharp(imagePath)
      .resize(800) // Set appropriate size
      .webp({ quality: 80 })
      .toFile(path.join(__dirname, '../public/assets/preview-optimized.webp'));
      
    // Create resized PNG as fallback
    await sharp(imagePath)
      .resize(800)
      .png({ compressionLevel: 9 })
      .toFile(path.join(__dirname, '../public/assets/preview-optimized.png'));
      
    console.log('Images optimized successfully!');
  } catch (error) {
    console.error('Error optimizing images:', error);
  }
}

optimizeImages();