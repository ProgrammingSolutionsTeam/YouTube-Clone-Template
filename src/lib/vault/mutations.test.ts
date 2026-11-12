import { describe, expect, it } from "vitest";
import { createMutationQueue, validateLocalPassword } from "./mutations";

describe("committed profile mutations", () => {
  it("retains two overlapping settings changes", async () => {
    const writes: { language: string; volume: number }[] = [];
    const q = createMutationQueue({ language: "en", volume: 1 }, async (v) => { writes.push(v); }, () => {});
    await Promise.all([q.mutate(v => ({ ...v, language: "ar" })), q.mutate(v => ({ ...v, volume: 0.5 }))]);
    expect(writes[1]).toEqual({ language: "ar", volume: 0.5 });
  });
  it("does not report or carry forward a failed save", async () => {
    let fail = true;
    const applied: number[] = [];
    const q = createMutationQueue(0, async () => { if (fail) throw new Error("quota"); }, v => applied.push(v));
    await expect(q.mutate(v => v + 1)).rejects.toThrow("quota");
    expect(applied).toEqual([]);
    fail = false;
    await q.mutate(v => v + 1);
    expect(q.get()).toBe(1);
  });
  it("enforces six-character local passwords for signup and changes", () => {
    expect(() => validateLocalPassword("12345")).toThrow();
    expect(() => validateLocalPassword("123456")).not.toThrow();
  });
});