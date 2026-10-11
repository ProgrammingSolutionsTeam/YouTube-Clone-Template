/** Native (Capacitor) helpers. All no-ops in a normal browser. */
import { Capacitor } from "@capacitor/core";

export const isNativeApp = () => Capacitor.isNativePlatform();

/** Asks Android for storage / media permission before opening the file picker. */
export async function requestStorageAccess(): Promise<boolean> {
  if (!isNativeApp()) return true;
  try {
    const { Filesystem } = await import("@capacitor/filesystem");
    const current = await Filesystem.checkPermissions();
    if (current.publicStorage === "granted") return true;
    const next = await Filesystem.requestPermissions();
    return next.publicStorage === "granted";
  } catch {
    return true; // Android 13+ media picker works without the legacy permission
  }
}
