// iOS simulator can use localhost because it shares the host machine network.
// For a physical device, set EXPO_PUBLIC_API_URL to your computer LAN address,
// for example: http://192.168.1.50:3000
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
