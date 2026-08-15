import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          maxSize: 400_000,
          groups: [
            { name: "firebase-firestore", test: /node_modules[\\/]@firebase[\\/]firestore/ },
            { name: "firebase-auth", test: /node_modules[\\/]@firebase[\\/]auth/ },
            { name: "firebase-storage", test: /node_modules[\\/]@firebase[\\/]storage/ },
            { name: "firebase-functions", test: /node_modules[\\/]@firebase[\\/]functions/ },
            { name: "firebase-core", test: /node_modules[\\/](@firebase|firebase)[\\/]/ },
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: "validation", test: /node_modules[\\/]zod[\\/]/ }
          ]
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
