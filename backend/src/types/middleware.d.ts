declare module '../middleware/auth' {
  import { Request, Response, NextFunction } from 'express';
  
  export interface AuthenticatedRequest extends Request {
    user?: {
      id: string;
      email: string;
      role: string;
    };
  }
  
  export function authenticate(req: Request, res: Response, next: NextFunction): void;
}

declare module '../middleware/authorize' {
  import { Request, Response, NextFunction } from 'express';
  
  export function authorize(roles: string[]): (req: Request, res: Response, next: NextFunction) => void;
}

declare module '../utils/routeWrappers' {
  import express, { Request, Response, NextFunction } from 'express';
  
  export function wrapMiddleware(middleware: Function): express.RequestHandler;
  export function wrapController(controller: Function): express.RequestHandler;
  export function wrapAuthorize(roles: string[]): express.RequestHandler;
}
