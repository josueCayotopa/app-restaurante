// PM2 · API de CADE (api.chicharroneriacade.com → IIS → este proceso en el puerto 3001)
//
// Primera vez, en la carpeta server (después de npm run build):
//   pm2 start ecosystem.config.cjs
//   pm2 save
// Tras actualizar el código (git pull + npm run build):
//   pm2 restart cade-api
// Ver estado y registros:
//   pm2 status          pm2 logs cade-api
module.exports = {
  apps: [
    {
      name: 'cade-api',
      cwd: __dirname,                 // aquí está el .env (DATABASE_URL, PORT, JWT_SECRET, CLIENT_ORIGIN)
      script: 'dist/src/index.js',    // código compilado (npm run build)
      // UNA sola instancia: el tiempo real (socket.io), la caché de impresoras y el
      // historial de impresión viven en memoria; con varias instancias se desincronizan.
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,              // si se cae, se levanta solo
      max_restarts: 50,
      restart_delay: 3000,
      max_memory_restart: '600M',
      env: { NODE_ENV: 'production' },
      time: true,                     // fecha y hora en cada línea de registro
      out_file: './logs/api.log',
      error_file: './logs/api-error.log',
      merge_logs: true,
    },
  ],
}
