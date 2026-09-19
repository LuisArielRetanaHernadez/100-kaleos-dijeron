import { MongoClient, ObjectId } from 'mongodb'
import { createGame, sections as defaultSections } from './game.js'

const gameId = 'main'

export async function createGameStore(uri) {
  if (!uri) throw new Error('Falta la variable MONGODB_URI')

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 })
  await client.connect()
  const collection = client.db().collection('game_state')
  const rounds = client.db().collection('rounds')

  const serializeRound = ({ _id, ...round }) => ({ id: _id.toString(), ...round })

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

    async loadRounds() {
      let documents = await rounds.find().sort({ order: 1 }).toArray()
      if (!documents.length) {
        await rounds.insertMany(defaultSections.map((round, order) => ({ ...round, order })))
        documents = await rounds.find().sort({ order: 1 }).toArray()
      }
      return documents.map(serializeRound)
    },

    async createRound(round) {
      const order = await rounds.countDocuments()
      const result = await rounds.insertOne({ ...round, order })
      return serializeRound({ _id: result.insertedId, ...round, order })
    },

    async updateRound(id, round) {
      if (!ObjectId.isValid(id)) return null
      const document = await rounds.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: round },
        { returnDocument: 'after' },
      )
      return document ? serializeRound(document) : null
    },

    async deleteRound(id) {
      if (!ObjectId.isValid(id)) return false
      const result = await rounds.deleteOne({ _id: new ObjectId(id) })
      return result.deletedCount === 1
    },

    close() {
      return client.close()
    },
  }
}
