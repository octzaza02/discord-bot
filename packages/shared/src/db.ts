import mongoose, { type ConnectOptions } from 'mongoose';

let connectingPromise: Promise<typeof mongoose> | null = null;

export async function connectMongo(uri: string): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connectingPromise) return connectingPromise;
  connectingPromise = mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 } as ConnectOptions);
  return connectingPromise;
}
