export default {
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/socket.io': {
        target: 'http://kirby-server-prod:3000',
        ws: true,
        changeOrigin: true
      }
    }
  }
}