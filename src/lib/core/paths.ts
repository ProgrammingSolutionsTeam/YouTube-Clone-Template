/**
 * URL variable scheme.
 *
 * Every location in the library is fully addressable, so a link from the home
 * grid, the history or the favorites always lands inside the right folder:
 *
 *   root=F            the root key given by the admin (F:\#Videos)
 *   c=aj+             the channel (first folder inside the root)
 *   c1=s01            first nested folder (playlist)
 *   c2=others         second nested folder ... and so on
 *   v=<opaqueId>      the media item being watched
 *
 * Real disk paths never appear in a URL — only the root key and folder names.
 */

export interface MediaLocation {
  rootKey: string;
  /** channel + nested folders, relative to the root */
  segments: string[];
  videoId?: string;
}

export function buildQuery(location: MediaLocation): string {
  const params = new URLSearchParams();
  if (location.rootKey) params.set("root", location.rootKey);
  location.segments.forEach((segment, index) => {
    params.set(index === 0 ? "c" : `c${index}`, segment);
  });
  if (location.videoId) params.set("v", location.videoId);
  return params.toString();
}

export function parseQuery(params: URLSearchParams): MediaLocation {
  const rootKey = params.get("root") ?? "";
  const segments: string[] = [];
  const first = params.get("c");
  if (first) {
    segments.push(first);
    for (let i = 1; ; i++) {
      const value = params.get(`c${i}`);
      if (!value) break;
      segments.push(value);
    }
  }
  return { rootKey, segments, videoId: params.get("v") ?? undefined };
}

export function browseHref(location: MediaLocation): string {
  return `/browse?${buildQuery({ ...location, videoId: undefined })}`;
}

export function watchHref(location: MediaLocation): string {
  return `/watch?${buildQuery(location)}`;
}

/** Human readable trail, e.g. `F / aj+ / s01`. */
export function locationLabel(location: MediaLocation): string {
  return [location.rootKey, ...location.segments].filter(Boolean).join(" / ");
}

/** Variable form shown in the UI, e.g. `root=F  c=aj+  c1=s01`. */
export function locationVars(location: MediaLocation): string[] {
  const out = [`root=${location.rootKey}`];
  location.segments.forEach((segment, index) => {
    out.push(`${index === 0 ? "c" : `c${index}`}=${segment}`);
  });
  if (location.videoId) out.push(`v=${location.videoId}`);
  return out;
}
