import { Request, Response, NextFunction } from 'express';

export const basicAuth = (req: Request, res: Response, next: NextFunction) => {
  const { BASIC_USER, BASIC_PASS } = process.env;
  
  // If basic auth is not configured, skip
  if (!BASIC_USER || !BASIC_PASS) {
    return next();
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Private Area"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  if (username === BASIC_USER && password === BASIC_PASS) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Private Area"');
  return res.status(401).json({ error: 'Invalid credentials' });
};
