export default {
  expo: {
    name: 'AI Tailor',
    slug: 'ai-tailor',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    android: {
      package: 'com.aitailor.app',
      permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE', 'INTERNET'],
    },
    plugins: [
      [
        'expo-image-picker',
        {
          cameraPermission: 'Allow AI Tailor to take full-body photos for measurements.',
          photosPermission: 'Allow AI Tailor to choose body photos from your gallery.',
        },
      ],
    ],
    extra: {
      // Leave empty to auto-detect from Expo (works on physical phone + emulator)
      // Or set: EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:5000
      apiUrl: process.env.EXPO_PUBLIC_API_URL || '',
    },
  },
};
