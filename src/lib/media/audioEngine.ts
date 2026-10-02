/**
 * Equalizer + volume boost through Web Audio.
 *
 * One AudioContext for the app. Each media element can be wired only once
 * (createMediaElementSource), so graphs are cached per element in a WeakMap.
 * Graph: source -> 10 peaking filters -> gain (boost) -> limiter -> output.
 * Only same-origin / blob sources are wired: a cross-origin source without
 * CORS would be silenced by the browser.
 */
import { EQ_FREQUENCIES } from "@/lib/vault/settings";

interface Graph {
  filters: BiquadFilterNode[];
  gain: GainNode;
  limiter: DynamicsCompressorNode;
}

let ctx: AudioContext | null = null;
const graphs = new WeakMap<HTMLMediaElement, Graph>();

export interface AudioOptions {
  enabled: boolean;
  bands: number[];
  boost: number;
  limiter: boolean;
}

function wireable(media: HTMLMediaElement): boolean {
  const src = media.currentSrc || media.src;
  if (!src) return false;
  if (src.startsWith("blob:")) return true;
  try {
    return new URL(src, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

function graphFor(media: HTMLMediaElement): Graph | null {
  const existing = graphs.get(media);
  if (existing) return existing;
  if (!wireable(media)) return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx ??= new AC();
    const source = ctx.createMediaElementSource(media);
    const filters = EQ_FREQUENCIES.map((frequency, index) => {
      const f = ctx!.createBiquadFilter();
      f.type = index === 0 ? "lowshelf" : index === EQ_FREQUENCIES.length - 1 ? "highshelf" : "peaking";
      f.frequency.value = frequency;
      f.Q.value = 1.1;
      return f;
    });
    const gain = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor();
    limiter.knee.value = 0;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.15;
    let node: AudioNode = source;
    for (const f of filters) {
      node.connect(f);
      node = f;
    }
    node.connect(gain);
    gain.connect(limiter);
    limiter.connect(ctx.destination);
    const graph = { filters, gain, limiter };
    graphs.set(media, graph);
    return graph;
  } catch {
    return null;
  }
}

/** True when the EQ / boost path is needed for these options. */
export function needsGraph(o: AudioOptions): boolean {
  return o.boost > 1.001 || (o.enabled && o.bands.some((b) => b !== 0));
}

/** Applies options; wires the element lazily the first time it is needed. */
export function applyAudio(media: HTMLMediaElement | null, o: AudioOptions): boolean {
  if (!media) return false;
  const graph = graphs.get(media) ?? (needsGraph(o) ? graphFor(media) : null);
  if (!graph) return false;
  if (ctx?.state === "suspended") void ctx.resume().catch(() => undefined);
  const now = ctx!.currentTime;
  graph.filters.forEach((f, i) => f.gain.setTargetAtTime(o.enabled ? o.bands[i] ?? 0 : 0, now, 0.03));
  graph.gain.gain.setTargetAtTime(Math.max(0, Math.min(2, o.boost)), now, 0.03);
  // limiter off = a transparent compressor
  graph.limiter.threshold.value = o.limiter ? -3 : 0;
  graph.limiter.ratio.value = o.limiter ? 20 : 1;
  return true;
}

export function resumeAudio() {
  if (ctx?.state === "suspended") void ctx.resume().catch(() => undefined);
}
