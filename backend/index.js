import dotenv from 'dotenv'
import cors from 'cors'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyAction, createGame, publicGame } from './game.js'
import { createGameStore } from './game-store.js'

const app = express()
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.env') })
const port = process.env.PORT || 3001
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let game = createGame()
let gameSections = []
let store
let mutationQueue = Promise.resolve()
let initialization

app.use(express.json())
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}))

async function initialize() {
  if (!initialization) {
    initialization = (async () => {
      store = await createGameStore(process.env.MONGODB_URI)
      game = await store.load()
      await reloadRounds()
    })()
  }
  return initialization
}

app.use(async (_request, _response, next) => {
  try {
    await initialize()
    next()
  } catch (error) {
    next(error)
  }
})

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

function mutateGame(mutation) {
  const operation = mutationQueue.then(mutation)
  mutationQueue = operation.then(() => undefined, () => undefined)
  return operation
}

function roundFromRequest(body) {
  const title = String(body?.title || '').trim().slice(0, 100)
  const shortTitle = String(body?.shortTitle || title).trim().slice(0, 45)
  const questions = Array.isArray(body?.questions) ? body.questions.slice(0, 20).map((item) => ({
    question: String(item?.question || '').trim().slice(0, 240),
    multiplier: Math.min(10, Math.max(1, Number(item?.multiplier) || 1)),
    answers: Array.isArray(item?.answers) ? item.answers.slice(0, 8).map((answer) => ({
      text: String(answer?.text || '').trim().slice(0, 100),
      points: Math.min(999, Math.max(0, Number(answer?.points) || 0)),
    })).filter((answer) => answer.text) : [],
  })).filter((question) => question.question && question.answers.length) : []

  if (!title || !shortTitle || !questions.length) {
    const error = new Error('La ronda necesita título y al menos una pregunta con respuestas.')
    error.status = 400
    throw error
  }
  return { title, shortTitle, questions }
}

async function reloadRounds({ resetBoard = false } = {}) {
  gameSections = await store.loadRounds()
  game.section = Math.min(game.section, gameSections.length - 1)
  game.round = Math.min(game.round, gameSections[game.section].questions.length - 1)
  if (resetBoard) {
    game.round = 0
    game.revealed = []
    game.strikes = 0
    game.bank = 0
    game.status = 'playing'
    await store.save(game)
  }
}

app.get('/api/game', async (_request, response) => {
  await mutationQueue
  response.json(publicGame(game, gameSections))
})

app.post('/api/game/action', async (request, response) => {
  const { action, ...payload } = request.body || {}
  const result = await mutateGame(async () => {
    game = applyAction(game, action, payload, gameSections)
    await store.save(game)
    return publicGame(game, gameSections)
  })
  response.json(result)
})

app.post('/api/game/reset', async (_request, response) => {
  const result = await mutateGame(async () => {
    const names = game.teams.map((team) => team.name)
    game = createGame()
    game.teams.forEach((team, index) => { team.name = names[index] })
    await store.save(game)
    return publicGame(game, gameSections)
  })
  response.json(result)
})

app.get('/api/rounds', (_request, response) => {
  response.json(gameSections)
})

app.post('/api/rounds', async (request, response) => {
  const round = await store.createRound(roundFromRequest(request.body))
  await reloadRounds()
  response.status(201).json(round)
})

app.put('/api/rounds/:id', async (request, response) => {
  const round = await store.updateRound(request.params.id, roundFromRequest(request.body))
  if (!round) return response.status(404).json({ error: 'Ronda no encontrada.' })
  await reloadRounds({ resetBoard: true })
  response.json(round)
})

app.delete('/api/rounds/:id', async (request, response) => {
  if (gameSections.length === 1) return response.status(400).json({ error: 'Debe existir al menos una ronda.' })
  const deleted = await store.deleteRound(request.params.id)
  if (!deleted) return response.status(404).json({ error: 'Ronda no encontrada.' })
  await reloadRounds({ resetBoard: true })
  response.status(204).end()
})

if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  app.use(express.static(path.join(root, 'public')))
  app.use((_request, response) => response.sendFile(path.join(root, 'public', 'index.html')))
}

app.use((error, _request, response, _next) => {
  console.error(`Error de API: ${error.message}`)
  response.status(error.status || 500).json({ error: error.status ? error.message : 'No se pudo completar la operación.' })
})

async function start() {
  await initialize()
  app.listen(port, () => {
    console.log(`Servidor listo en el puerto ${port} con MongoDB conectado`)
  })
}

export { app, initialize }
export default app

if (!process.env.VERCEL) {
  start().catch((error) => {
    console.error(`No se pudo iniciar el servidor: ${error.message}`)
    process.exit(1)
  })
}
