import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface AuthPayload {
  userId: number;
  username: string | null;
}

export async function authGuard(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing auth token' });
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, config.jwtSecret) as AuthPayload;
    (req as any).userId = decoded.userId;
  } catch {
    return reply.status(401).send({ error: 'Invalid auth token' });
  }
}
