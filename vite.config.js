import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        allowedHosts: ['kefu-frontend.vercel.app']
        // allowedHosts: ['cfd17691bb95.ngrok-free.app']
    }
})
