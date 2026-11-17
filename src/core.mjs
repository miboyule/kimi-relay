import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const coreDirectory = process.env.KIMI_RELAY_CORE
  || fileURLToPath(new URL('../vendor/kimi-work-gateway/', import.meta.url));
export const loadCore = relative => import(pathToFileURL(path.join(coreDirectory, relative)).href);
