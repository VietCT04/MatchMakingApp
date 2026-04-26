import { Platform } from 'react-native';
import { PushDevicePlatform } from '@sports-matchmaking/shared';

export type PushRegistrationResult = {
  expoPushToken?: string;
  platform: PushDevicePlatform;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
};

function platformToEnum(): PushDevicePlatform {
  if (Platform.OS === 'ios') return PushDevicePlatform.IOS;
  if (Platform.OS === 'android') return PushDevicePlatform.ANDROID;
  if (Platform.OS === 'web') return PushDevicePlatform.WEB;
  return PushDevicePlatform.UNKNOWN;
}

export async function registerForPushNotifications(): Promise<PushRegistrationResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications');

    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status as 'granted' | 'denied' | 'undetermined';
    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status as 'granted' | 'denied' | 'undetermined';
    }

    if (finalStatus !== 'granted') {
      return {
        permissionStatus: finalStatus,
        platform: platformToEnum(),
      };
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    return {
      expoPushToken: tokenResponse.data as string,
      permissionStatus: finalStatus,
      platform: platformToEnum(),
    };
  } catch {
    return {
      permissionStatus: 'undetermined',
      platform: platformToEnum(),
    };
  }
}
