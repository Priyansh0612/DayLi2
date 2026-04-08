# Frontend Design System & Architecture

## Design System & Tokens
The application relies on a unified, high-fidelity design system defined within token files such as `src/components/Home/homeTokens.ts`. 

### Color Palette
The central `C` object manages consistent rendering across domains:
- **Foundations**: Canvas/Surfaces use stark whites (`#FFFFFF`), with ink lines matching soft neutral greys (`#EBEBEB` and `#F2F2F0`).
- **Typography/Ink**: High-contrast dark charcoal (`#1A1916`) paired with readable muted stones (`#7A6E68`).
- **Domain Signatures**: 
  - Academics: Vibrant Periwinkle/Indigo (`#6366f1`)
  - Meals: Warm Burnt Orange/Terracotta (`#C4663A`)
  - Work scheduling: Cool Ocean Blue (`#0077B6`)
  - Expenses: Organic Forest Green (`#2F5233`)

### Advanced Component Styling
Rather than directly styling every interface, the codebase relies on reusable exported CSS-style configurations:
- **Glassmorphism**: Achieved using the `glass` object which maps backgrounds to `rgba(255,255,255,0.60)` accompanied by sharp, high-opacity white borders `rgba(255,255,255,0.86)` to catch the light edges.
- **Card Styling**: The `titaniumCard` object defines solid interactive surfaces. It ditches rudimentary drop-shadows for a polished look featuring specific iOS shadow parameters (`elevation: 4`, `shadowOffset: { width: 0, height: 6 }`, `shadowOpacity: 0.06`, and `shadowRadius: 16`).

## Animation Logic (Reanimated vs. Animated)
The DayLi UI orchestrates dual-animation pipelines based on performance requirements.

### 1. `react-native-reanimated` (UI Thread Animations)
Heavy background animations (such as the breathable home orbs) run entirely on the native UI thread, bypassing the JavaScript bridge. 
- A `sharedValue` (e.g., `breath = useSharedValue(0);`) is bound to a `withRepeat` and `withTiming` function looping over 8,000ms.
- An `Easing.inOut(Easing.sin)` curve generates the natural "lung-like" breathing rhythm.
- `useAnimatedStyle` safely applies mathematical scaling to the orbs (`transform: [{ scale: 1 + (breath.value * 0.08) }]`), guaranteeing 60/120fps background animations regardless of heavy DB fetches executing on the JS thread.

### 2. Standard `Animated` (Interactive UI Modals)
Used for micro-interactions and layout transitions (e.g., in `CustomEventEditSheet.tsx` and `QuickTile.tsx`).
- **Bottom Sheets**: `Animated.parallel` is utilized alongside React state changes to simultaneously run a bouncy `Animated.spring` sliding the sheet up (via a `translateY` offset on a `slideAnim` ref), while `Animated.timing` fades the dark overlay in. 
- Includes `.start()` commands mapped to lifecycle cleanup and component unmounting to orchestrate seamless destruction of views.

## Skia Graphics Pipeline
The `EtherealBackground.tsx` screen renders complex gradient environments using `@shopify/react-native-skia`, which binds Skia's C++ rendering engine to React Native.
- **Safe Rendering Pattern**: A known bug with Skia on Android (panicking the GPU thread on mount during React Navigation transitions) is solved using `InteractionManager.runAfterInteractions` paired with a 150ms `setTimeout`. It forces Skia to wait until screen transitions are finished before mounting.
- **The Vector Landscape**: The canvas builds depth through three discrete `<Path>` nodes (`topWavePath`, `midWavePath`, `bottomWavePath`) constructed mathematically using SVG string coordinates (`M` and bezier cubic curves `C`).
- **Gradient Stacking**: A base `<Rect>` clears the canvas, followed by `<LinearGradient>` passes bound perfectly inside the path shapes. It incorporates native `<Shadow>` nodes pointing opposite directions (`dy={-15}` vs `dy={15}`) to simulate 3D ambient light occlusion.

## Micro-Interactions & UX Tricks
A hallmark of DayLi is its attention to physical device interaction layers:
- **Tactile Overlays**: Using background image patterns (e.g., `transparenttextures.com/patterns/stardust.png` at 6% opacity) with `pointerEvents="none"` simulates a film grain effect overlapping the Skia vectors.
- **Native Blurs**: Extensive use of `expo-blur` (`<BlurView>`) handles frosted-glass overlays (like in `OTPModal.tsx`) rather than generic transparent black HEX codes.
- **The "Invisible Input Trick"**: In `OTPModal.tsx`, a massive custom input issue (iOS refusing to autofill native One-Time-Passwords from Messages into custom box arrays) is bypassed. A singular transparent text input (`opacity: 0.01`, `zIndex: 10`) covers the view and carries `autoComplete="one-time-code"`. The user physically interacts with this invisible native input, while a separated visual array of polished boxes merely "reads" the state array to appear as if they are distinct text boxes.

## Component Library (Core Reusables)
The `src/components/Home/` directory operates as a central design repository.
- **`ProgressRing`**: An SVG-powered custom ring tracker used to map circular visualizations for grades, battery, or budgets.
  - *Props*: `size`, `stroke`, `pct`, `color`, `trackColor`, `children`.
  - Mathematically subtracts the target percentage from `2 * Math.PI * radius` utilizing SVG `strokeDasharray` to "unfill" the circle.
- **`QuickTile`**: Standardized interactive square-button blocks utilized widely on the main dashboard.
  - *Props*: `label`, `accentColor`, `icon` (Lucide React Native node), `onPress`.
  - Automatically handles physical touch scale shrinking (`onPressIn`) and natural release rebounding (`onPressOut`) via a localized `Animated.spring` instance wrapped around the `titaniumCard` style block.
