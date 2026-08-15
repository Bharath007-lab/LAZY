import { MongoClient } from 'mongodb'

// Portable connection singleton. Only depends on env vars so the whole
// data layer can be swapped for Supabase later without touching callers.
let client
let db

export async function getDb() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME || 'lazy')
  }
  return db
}

export function clean(doc) {
  if (!doc) return doc
  if (Array.isArray(doc)) return doc.map(clean)
  const { _id, ...rest } = doc
  return rest
}
