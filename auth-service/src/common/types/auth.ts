import type { IncomingMessage } from 'node:http';

export interface AuthenticatedRequestUser {
  sub: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends IncomingMessage {
  user?: AuthenticatedRequestUser;
  headers: IncomingMessage['headers'] & { authorization?: string };
}
