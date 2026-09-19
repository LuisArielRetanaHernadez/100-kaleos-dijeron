import { MongoClient } from 'mongodb'
import { createGame } from './game.js'

const gameId = 'main'

export async function createGameStore(uri) {
  if (!uri) throw new Error('Falta la variable MONGODB_URI')

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 })
  await client.connect()
  const collection = client.db().collection('game_state')

  return {
    async load() {
      const document = await collection.findOne({ _id: gameId })
      if (!document) {
        const game = createGame()
        await this.save(game)
        return game
      }

      const { _id, ...savedGame } = document
      return { ...createGame(), ...savedGame }
    },

    async save(game) {
      await collection.replaceOne(
        { _id: gameId },
        { _id: gameId, ...game },
        { upsert: true },
      )
    },

    close() {
      return client.close()
    },
  }
}
