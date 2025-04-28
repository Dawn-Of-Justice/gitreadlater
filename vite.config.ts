import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,         // Open the bundle stats in browser after build
      gzipSize: true,     // Show gzipped sizes
      brotliSize: true,   // Show brotli sizes
      filename: 'stats.html'
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br'
    }),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz'
    }),
    ViteImageOptimizer({
      png: {
        quality: 80,
      },
      jpeg: {
        quality: 80,
      },
      jpg: {
        quality: 80,
      },
      webp: {
        quality: 80,
      }
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Extract React and related libraries into a separate chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Additional libraries you might be using
          'ui-vendor': ['framer-motion', 'react-icons'],
          // Add more chunks as needed
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase warning limit if needed
    sourcemap: false, // Disable source maps in production to reduce size
  }
})