import type { CapacitorConfig } from "@capacitor/cli";

/**
 * LocalTube — Android build config.
 * The app ships fully bundled from `dist/` (works offline). Set
 * CAP_LIVE_RELOAD=1 before `npx cap sync` to load the Lovable preview instead.
 */
const live = process.env.CAP_LIVE_RELOAD === "1";

const config: CapacitorConfig = {
  appId: "app.lovable.a0dac13907b8465bad558e01a534d832",
  appName: "LocalTube",
  webDir: "dist",
  android: {
    allowMixedContent: true,
    backgroundColor: "#0f0f0f",
  },
  server: live
    ? { url: "https://a0dac139-07b8-465b-ad55-8e01a534d832.lovableproject.com?forceHideBadge=true", cleartext: true }
    : { androidScheme: "https", cleartext: true },
  plugins: {
    SplashScreen: { launchShowDuration: 1200, backgroundColor: "#0f0f0f", showSpinner: false },
    StatusBar: { backgroundColor: "#0f0f0f", style: "DARK" },
  },
};

export default config;
