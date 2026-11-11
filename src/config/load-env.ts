import { loadEnvFile } from 'node:process';

export function loadEnvironment() {
  try {
    loadEnvFile();
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
      throw new Error('Unable to load the environment file.', { cause: error });
    }
  }
}
