# Core System & Security Documentation

## 1. The Boot Sequence & State Machine
The boot sequence of the application is orchestrated entirely within the root `App.tsx`. It acts as a finite state machine ensuring the user only navigates past the splash screen when their authentication and configuration are fully retrieved.

### Boot Steps:
1. **Prolonging the Native Splash Screen**: Immediately upon execution, `SplashScreen.preventAutoHideAsync()` is called to freeze the native OS splash screen in place.
2. **Font & Asset Loading**: `useFonts` ensures Google Fonts (PlusJakartaSans and Outfit) map to native OS bridges.
3. **Session Verification**: The `useEffect` fires to poll Supabase (`supabase.auth.getSession()`). This triggers a check against the local `expo-secure-store` encrypted keychain.
4. **Profile Cross-Verification**: If a session exists, the app executes `checkProfile(session.user.id)` to confirm whether the user has completed onboarding by checking for a valid `username`.
5. **The Gateway Unlock**: Only when `appIsReady` resolves to `true` (fonts loaded AND auth/profile state known), the `onLayoutRootView` callback triggers `SplashScreen.hideAsync()`, lifting the splash screen.
6. **Navigation Routing**:
   - *Case 1 (Logged Out)*: Routes to `LoginScreen`.
   - *Case 2 (Logged In, Profile Null)*: Routes to `ProfileSetupScreen`.
   - *Case 3 (Logged In, Profile Exists)*: Routes straight into the `MainTabs` (`HomeScreen`).

## 2. Session Management (JWT Engine)
Supabase fundamentally uses JSON Web Tokens (JWT) for the application state. In a typical React web app, these are written to `localStorage`. In DayLi, this would be dangerously accessible on a rooted device. 

In `src/config/supabase.ts`, DayLi overrides the standard JSON interface with the `ExpoSecureStoreAdapter`:
- `SecureStore` (from `expo-secure-store`) backs up the JWTs physically inside the device's keychain (iOS) or Keystore (Android). 
- Every `getItem`, `setItem`, and `removeItem` command from Supabase Auth relies on AES-256 encryption native to the device.
- We utilize `AppState.addEventListener` to tell Supabase to `startAutoRefresh()` when the app foregrounds, ensuring the user is never caught with an expired active token hitting RLS (Row Level Security) failures.

## 3. Security Layers
### A. The 5-Minute Inactivity Guillotine
In `App.tsx`, an `AppState` listener is specifically assigned to monitor backgrounding:
- **On Background**: A `lastBackgroundTime.current` timestamp is established.
- **On Foreground**: The app calculates the elapsed time. If `Date.now() - lastBackgroundTime > 5 * 60 * 1000` (5 minutes), the app forcefully triggers `await supabase.auth.signOut()`. 
- This ensures that if the user walks away from their un-locked device, sensitive budget and academic data is re-secured.

### B. Biometric Identity Guards (FaceID / TouchID)
Inside `src/hooks/useBiometrics.ts`, the app integrates `expo-local-authentication`.
- It dynamically detects `hasHardwareAsync()` and `isEnrolledAsync()`.
- The `authenticate()` function allows any component (such as deleting an entire academic term or exposing unmasked expense totals) to halt the UI thread until the user biometrically verifies.
- It leverages the secure enclave on Apple chips, using a customized `promptMessage` natively rejecting access on failure hooks (`disableDeviceFallback: false` allows standard PIN fallbacks).

## 4. Authentication Flows
### A. Email OTP (With the "Invisible Input" Trick)
Housed in `LoginScreen.tsx` and `OTPModal.tsx`:
- When a user signs up via `signUp`, Supabase halts creation and emails an OTP code.
- To drastically improve UX, the `OTPModal` incorporates the **Invisible Input Trick**:
  - iOS disables `autoComplete="one-time-code"` on fragmented visual box arrays. 
  - The modal instead renders one massive `TextInput` set to `opacity: 0.01` hovering above 6 stylized empty squares. 
  - The user taps the invisible input, triggering native auto-fill from the iOS messages app. The hidden string is digested by React and parsed outward to light up the matching CSS boxes, providing native convenience with custom aesthetics.

### B. Google OAuth
- Instead of using the browser-based OAuth pipeline which forces a jarring Safari pop-out on iOS, DayLi imports `@react-native-google-signin/google-signin` within `LoginScreen.tsx`.
- It triggers a native, lower-level system popup via the iOS/Android framework using `WEB`, `IOS`, and `ANDROID` Client IDs.
- We extract the returned `idToken` and manually feed it securely into Supabase via `supabase.auth.signInWithIdToken()`. This binds and issues a DayLi JWT without exposing standard browser callback loops to interception parameters.
