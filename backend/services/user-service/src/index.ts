import fs from 'fs';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import { db, redis } from './config/database';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 8000);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : true,
    credentials: true,
  })
);
app.use(express.json());

app.get('/health', async (_req: Request, res: Response) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ status: 'error' });
  }
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

const resolveSchemaPath = (): string | null => {
  const candidates = [
    path.resolve(__dirname, 'config', 'schema.sql'),
    path.resolve(process.cwd(), 'src', 'config', 'schema.sql'),
    path.resolve(process.cwd(), 'dist', 'config', 'schema.sql'),
  ];

  const schemaPath = candidates.find((candidate) => fs.existsSync(candidate));
  return schemaPath || null;
};

const initializeSchema = async (): Promise<void> => {
  const shouldInit = (process.env.INIT_DB_SCHEMA || 'true').toLowerCase() === 'true';
  if (!shouldInit) {
    return;
  }

  const schemaPath = resolveSchemaPath();
  if (!schemaPath) {
    console.warn('Schema file not found. Skipping database schema initialization.');
    return;
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  if (!schemaSql.trim()) {
    console.warn('Schema file is empty. Skipping database schema initialization.');
    return;
  }

  await db.query(schemaSql);
  console.log(`Database schema initialized from: ${schemaPath}`);
};

const start = async (): Promise<void> => {
  try {
    await initializeSchema();
    app.listen(PORT, () => {
      console.log(`User service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start user service:', error);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  await Promise.allSettled([db.end(), redis.quit()]);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await Promise.allSettled([db.end(), redis.quit()]);
  process.exit(0);
});

start();
