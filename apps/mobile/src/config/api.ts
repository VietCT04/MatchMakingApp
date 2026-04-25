// iOS simulator can use localhost because it shares the host machine network.
// For a physical device, set EXPO_PUBLIC_API_URL to your computer LAN address,
// for example: http://192.168.1.50:3000
const expoApiUrl =
  typeof globalThis === 'object' && 'process' in globalThis
    ? ((globalThis as { process?: { env?: { EXPO_PUBLIC_API_URL?: string } } }).process?.env
        ?.EXPO_PUBLIC_API_URL ??
      undefined)
    : undefined;

export const API_BASE_URL = expoApiUrl ?? 'http://localhost:3000';
