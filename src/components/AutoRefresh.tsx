/** Re-indexes every root on the interval chosen in Settings (1 min .. 24 h). */
import { useEffect } from "react";
import { useSession } from "@/context/SessionProvider";
import { rootsStore } from "@/lib/core/indexdb";
import { handlePermission } from "@/lib/core/filesystem";
import { scanner } from "@/lib/scanner/scanner";
import { invalidateLibrary } from "@/lib/media/library";
import { invalidateNetwork } from "@/lib/share/network";

export const LAST_AUTO_REFRESH_KEY = "localtube.autoRefresh.last";

export async function refreshAllRoots(deepDetect: boolean) {
  const roots = await rootsStore.all();
  for (const root of roots) {
    // never prompt from a timer: only roots already granted are walked
    if (root.handle && (await handlePermission(root.handle)) === "granted") {
      await scanner.enqueue(root, "incremental", deepDetect);
    }
  }
  invalidateNetwork();
  invalidateLibrary();
  localStorage.setItem(LAST_AUTO_REFRESH_KEY, String(Date.now()));
}

export function AutoRefresh() {
  const { settings, user } = useSession();
  const minutes = settings.scanner.autoRefreshMinutes;
  const deep = settings.scanner.deepDetect;

  useEffect(() => {
    if (!user || !minutes || minutes < 1) return;
    const period = Math.min(1440, minutes) * 60_000;
    let busy = false;
    const tick = () => {
      if (busy || scanner.isRunning) return;
      busy = true;
      void refreshAllRoots(deep).finally(() => (busy = false));
    };
    const last = Number(localStorage.getItem(LAST_AUTO_REFRESH_KEY) ?? 0);
    const first = window.setTimeout(tick, Math.max(5_000, period - (Date.now() - last)));
    const timer = window.setInterval(tick, period);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [user, minutes, deep]);

  return null;
}
