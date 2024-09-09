import type { IConfig } from '../../types';
import path from 'path';

/**
 * Function to get default config .
 * @returns Configuration for a logging middleware.
 */
export default function (): IConfig {
  return {
    path: path.resolve(process.cwd(), 'Toaster'),
    method: true,
    body: true,
    queryParams: true,
    headers: false,
    ip: false,
    obfuscate: ['password'],
  };
}
