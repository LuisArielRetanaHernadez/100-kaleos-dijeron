# 100 Kaleos Dijeron

Trivia familiar inspirada en concursos de encuestas populares, construida con React y Express.

## Desarrollo

Configura la conexión en un archivo `.env` que no se debe subir al repositorio:

```bash
MONGODB_URI=mongodb+srv://...
```

```bash
npm install
npm run dev
```

La interfaz estará en `http://localhost:5173` y la API en el puerto `3001`.

## Producción

```bash
npm run build
npm start
```

El estado completo de la partida se guarda en la colección `game_state` de MongoDB. Puedes cambiar los nombres de los equipos haciendo clic sobre ellos. El panel inferior permite seleccionar secciones, revelar respuestas, marcar errores, cambiar el turno, entregar el pozo y avanzar de pregunta.
