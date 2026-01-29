import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Prevenir que Vite limpe a tela
  clearScreen: false,
  
  // Configuração do servidor dev
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Ignorar src-tauri para evitar reloads desnecessários
      ignored: ['**/src-tauri/**']
    }
  },
  
  // Variáveis de ambiente
  envPrefix: ['VITE_', 'TAURI_'],
  
  // Build config
  build: {
    // Tauri usa Chromium no Windows, suporte moderno
    target: process.env.TAURI_PLATFORM === 'windows' 
      ? 'chrome105' 
      : 'safari13',
    
    // Não minificar em dev
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    
    // Source maps em dev
    sourcemap: !!process.env.TAURI_DEBUG
  },
  
  // Aliases para imports limpos
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@core': path.resolve(__dirname, './src-tauri/core')
    }
  }
});