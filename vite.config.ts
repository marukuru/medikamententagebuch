import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [
    angular({
      tsconfig: 'tsconfig.json'
    })
  ],
  build: {
    outDir: 'www' // Capacitor's default web asset directory
  }
});
