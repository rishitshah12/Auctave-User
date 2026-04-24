import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    historyApiFallback: true,
  },
  optimizeDeps: {
    include: ['react-is'],
  },
  build: {
    // Raise the warning threshold — some vendor chunks (jsPDF, TipTap) are legitimately large
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ── Supabase ──────────────────────────────────────────────────────────
          if (id.includes('@supabase')) return 'supabase';

          // ── PDF / Canvas export libs (only loaded by AdminTrendingPage) ───────
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf-export';

          // ── Rich-text editor (TipTap) — only used in AdminTrendingPage ────────
          if (id.includes('@tiptap')) return 'tiptap';

          // ── Charts (Recharts + D3) ────────────────────────────────────────────
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-') || id.includes('react-is') || id.includes('react-simple-maps')) return 'charts';

          // ── React core ───────────────────────────────────────────────────────
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react-core';

          // ── Lucide icons ──────────────────────────────────────────────────────
          if (id.includes('lucide-react')) return 'icons';
        },
      },
    },
  },
})
