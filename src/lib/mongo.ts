import { MongoClient } from 'mongodb'

const uri = process.env.DB_URI ?? 'mongodb://localhost:27017'
const client = new MongoClient(uri)

export const db = client.db()
