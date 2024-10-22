import type { IConfig } from '../../types/index.js';
import path from 'path';

/**
 * Function to get default config .
 * @returns Configuration for a logging middleware.
 * @default
 */
export default function (): IConfig {
  return {
    path: path.resolve(process.cwd(), 'Toaster'),
    shouldThrow: false,
    method: true,
    body: true,
    queryParams: true,
    headers: true,
    ip: false,
    obfuscate: ['password'],
    disableProto: false,
    statusCode: true,
    countTime: false,
  };
}
