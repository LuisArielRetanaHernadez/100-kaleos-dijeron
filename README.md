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

El estado completo de la partida se guarda en la colección `game_state` y las rondas editables en `rounds`. Desde **Administrar rondas** puedes crear, consultar, editar y eliminar rondas, preguntas y respuestas. El panel inferior también permite revelar respuestas, marcar errores, cambiar el turno, entregar el pozo y avanzar de pregunta.
