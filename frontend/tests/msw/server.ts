/**
 * Mock backend for component tests. Tests add handlers per case with server.use().
 */
import { setupServer } from "msw/node";

export const server = setupServer();

/** Absolute URL for a backend path as the app requests it (through /api). */
export const apiUrl = (path: string) => `http://localhost:3000/api${path}`;
