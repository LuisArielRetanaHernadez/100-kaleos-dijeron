import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyAction, createGame, publicGame } from './game.js'
import { createGameStore } from './game-store.js'

const app = express()
const port = process.env.PORT || 3001
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let game = createGame()
let store
let mutationQueue = Promise.resolve()

app.use(express.json())

function mutateGame(mutation) {
  const operation = mutationQueue.then(mutation)
  mutationQueue = operation.then(() => undefined, () => undefined)
  return operation
}

app.get('/api/game', async (_request, response) => {
  await mutationQueue
  response.json(publicGame(game))
})

app.post('/api/game/action', async (request, response) => {
  const { action, ...payload } = request.body || {}
  const result = await mutateGame(async () => {
    game = applyAction(game, action, payload)
    await store.save(game)
    return publicGame(game)
  })
  response.json(result)
})

app.post('/api/game/reset', async (_request, response) => {
  const result = await mutateGame(async () => {
    const names = game.teams.map((team) => team.name)
    game = createGame()
    game.teams.forEach((team, index) => { team.name = names[index] })
    await store.save(game)
    return publicGame(game)
  })
  response.json(result)
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(root, 'dist')))
  app.use((_request, response) => response.sendFile(path.join(root, 'dist', 'index.html')))
}

async function start() {
  store = await createGameStore(process.env.MONGODB_URI)
  game = await store.load()
  app.listen(port, () => {
    console.log(`Servidor listo en el puerto ${port} con MongoDB conectado`)
  })
}

start().catch((error) => {
  console.error(`No se pudo iniciar el servidor: ${error.message}`)
  process.exit(1)
})
