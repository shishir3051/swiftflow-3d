import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  vite: {
    resolve: {
      alias: {
        'detect-gpu': path.resolve(__dirname, 'node_modules/detect-gpu/dist/detect-gpu.esm.js'),
        'gsap': path.resolve(__dirname, 'node_modules/gsap/dist/gsap.js'),
      },
    },
    ssr: {
      noExternal: ['three', '@react-three/fiber', '@react-three/drei', 'detect-gpu', 'gsap'],
    },
    optimizeDeps: {
      include: ['three', 'gsap', 'detect-gpu'],
    },
  },
});
