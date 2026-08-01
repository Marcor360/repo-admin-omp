declare global {
  namespace Express {
    interface Request {
      owner?: { uid: string; email: string };
      userEmail?: string;
    }
  }
}

export {};
