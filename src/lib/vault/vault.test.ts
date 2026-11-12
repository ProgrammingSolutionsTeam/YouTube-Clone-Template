import "fake-indexeddb/auto";
import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { migrateFolder, readSealed, vaultFiles, writeSealed } from "./vault";

beforeAll(() => { Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true }); });
const key = () => crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
describe("atomic guest migration", () => {
  it("keeps every source row if any row cannot be decrypted", async () => {
    const from = await key(), to = await key();
    await writeSealed("guest-failure", "settings", from, { language: "ar" });
    await writeSealed("guest-failure", "likes", await key(), ["a"]);
    await expect(migrateFolder({ folder: "guest-failure", key: from }, { folder: "user-failure", key: to })).rejects.toBeDefined();
    expect(await vaultFiles.list("guest-failure")).toHaveLength(2);
    expect(await vaultFiles.list("user-failure")).toHaveLength(0);
  });
  it("moves all rows with the new key only after successful preparation", async () => {
    const from = await key(), to = await key();
    await writeSealed("guest-success", "likes", from, ["a", "b", "c"]);
    await migrateFolder({ folder: "guest-success", key: from }, { folder: "user-success", key: to });
    expect(await readSealed("user-success", "likes", to)).toEqual(["a", "b", "c"]);
    expect(await vaultFiles.list("guest-success")).toHaveLength(0);
  });
});