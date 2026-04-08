import * as LocalAuthentication from 'expo-local-authentication';
import { useState, useEffect } from 'react';
import { Alert } from 'react-native';

export const useBiometrics = () => {
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricSupported(compatible && enrolled);
    })();
  }, []);

  const authenticate = async (reason: string = 'Confirm your identity to continue') => {
    if (!isBiometricSupported) {
      // If biometrics not available, we could fall back to a PIN or just allow
      // (For strict security, you'd enforce a PIN)
      return true;
    }

    setIsAuthenticating(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return true;
      } else {
        if (result.error !== 'user_cancel') {
          Alert.alert('Authentication Failed', 'Could not verify your identity.');
        }
        return false;
      }
    } catch (error) {
      console.error('Biometric error:', error);
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  };

  return {
    isBiometricSupported,
    isAuthenticating,
    authenticate,
  };
};
