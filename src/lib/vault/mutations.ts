/** A failed commit never advances the snapshot used by the next mutation. */
export function createMutationQueue<T>(initial: T, persist: (value: T) => Promise<void>, applied: (value: T) => void) {
  let current = initial;
  let tail: Promise<unknown> = Promise.resolve();
  return {
    replace(value: T) { current = value; },
    get: () => current,
    mutate(change: (value: T) => T): Promise<void> {
      const work = tail.catch(() => undefined).then(async () => {
        const next = change(current);
        await persist(next);
        current = next;
        applied(next);
      });
      tail = work;
      return work;
    },
  };
}

export const LOCAL_PASSWORD_MIN = 6;
export function validateLocalPassword(password: string) {
  if (password.length < LOCAL_PASSWORD_MIN || password.length > 200) throw new Error("account.invalidPassword");
}