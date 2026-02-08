import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        allowedHosts: ['kefu-frontend.vercel.app']
        // allowedHosts: ['31d6-122-100-97-97.ngrok-free.app']
    }
})
