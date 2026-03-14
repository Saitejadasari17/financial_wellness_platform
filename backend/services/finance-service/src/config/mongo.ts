import { MongoClient } from 'mongodb';

const mongoUrl = process.env.MONGODB_URL || '';

let client: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient | null> {
  if (!mongoUrl) {
    return null;
  }

  if (!client) {
    client = new MongoClient(mongoUrl);
    await client.connect();
  }

  return client;
}

export async function logFinanceEvent(event: Record<string, unknown>) {
  const mongoClient = await getMongoClient();
  if (!mongoClient) {
    return;
  }

  const dbName = process.env.MONGODB_DB || 'financial_wellness_logs';
  const collectionName = process.env.MONGODB_COLLECTION || 'events';
  await mongoClient
    .db(dbName)
    .collection(collectionName)
    .insertOne({ ...event, timestamp: new Date() });
}
