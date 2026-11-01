- One app-wide Player lives in PlayerProvider; the watch page only provides an anchor, other pages show it as a mini player — so two videos never play at once.
- Video links are `/?v=<opaqueId>`; the id is resolved to its file only inside the app (getItem), never via the URL.
- LAN sharing runs as a Vite middleware (server/sharePlugin.ts) reading localtube.shared.json; clients see opaque ids only, and only loopback requests may change shares.

- Android build uses Capacitor bundling dist/ (no server.url by default) and scripts/android-setup.mjs patches permissions/version after `cap add android` — keeps the app offline and the native folder regenerable.
- Synced accounts run as Vite middleware (server/syncPlugin.ts + server/db.ts) talking to Neon over HTTP; DATABASE_URL (or the Lovable gateway keys) is read via loadEnv on the server only, clients use src/lib/sync/client.ts — local accounts stay fully offline.
