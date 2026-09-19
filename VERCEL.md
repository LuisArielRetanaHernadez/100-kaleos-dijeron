# Despliegue en Vercel

1. Sube el repositorio a GitHub y conéctalo desde Vercel.
2. En la configuración del proyecto usa la raíz del repositorio.
3. Define la variable de entorno `MONGODB_URI` con la cadena de MongoDB. Actívala para `Production` y `Preview`.
4. Vercel usará `npm run build`, generará el frontend en `public/` y detectará `server.js` como servidor Express.
5. Haz el despliegue con `vercel --prod` o desde la rama de producción conectada.

No subas `.env` al repositorio. Si MongoDB Atlas restringe las IP de acceso, agrega las IP permitidas para que Vercel pueda conectarse.

Para probar localmente el mismo modo de producción:

```bash
npm run build
npm start
```

La variable `VITE_API_URL` es opcional. Déjala vacía cuando frontend y backend estén en el mismo proyecto de Vercel.
