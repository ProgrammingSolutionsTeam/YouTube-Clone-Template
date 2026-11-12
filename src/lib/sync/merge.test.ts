import { describe, expect, it } from "vitest";
import { mergeCollection, mergeHistory, mergeSettingsConflict } from "./merge";
describe("synchronization reconciliation", () => {
  it("retains all three imported likes", () => {
    expect(mergeCollection([], {}, ["a","b","c"].map(media_id => ({ media_id, deleted: false, at: 10 }))).items).toEqual(["a","b","c"]);
  });
  it("a stale device cannot resurrect an unlike", () => {
    const result = mergeCollection([], { a: { at: 20, deleted: true } }, [{ media_id: "a", at: 10, deleted: false }]);
    expect(result.items).toEqual([]); expect(result.mutations.a.deleted).toBe(true);
  });
  it("accepts newer playback progress", () => {
    const local = [{ id:"a", title:"A", rootKey:"", segments:[], channel:"", at:10, position:2, duration:30, count:1 }];
    expect(mergeHistory(local, {}, [{ media_id:"a", title:"A", at:20, position:15, duration:30, deleted:false }]).entries[0].position).toBe(15);
  });
  it("merges edits to different settings", () => {
    expect(mergeSettingsConflict({language:"en",volume:1}, {language:"ar",volume:1}, {language:"en",volume:0.5})).toEqual({value:{language:"ar",volume:0.5},conflict:false});
  });
  it("requires a choice for different edits to the same setting", () => {
    expect(mergeSettingsConflict({volume:1}, {volume:0.5}, {volume:0.7}).conflict).toBe(true);
  });
});