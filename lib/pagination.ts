export const MAX_PAGE_SIZE = 25;

export function assertPage(offset: number, limit: number): void {
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new Error("Page must use a non-negative offset and a limit from 1 to 25.");
  }
}

export async function readConsistentPage<T>(
  getCount: () => Promise<number>,
  getPage: (offset: number, limit: number) => Promise<T[]>,
  offset: number,
  limit = MAX_PAGE_SIZE,
): Promise<{ count: number; rows: T[]; changedDuringRead: boolean }> {
  assertPage(offset, limit);
  const before = await getCount();
  const rows = await getPage(offset, limit);
  const after = await getCount();
  if (after < before) throw new Error("Canonical count moved backwards; retry this page.");
  if (after > before && offset + limit > before) {
    const retryRows = await getPage(offset, limit);
    const settledCount = await getCount();
    if (settledCount < after) throw new Error("Canonical count moved backwards during retry; reload this page.");
    return { count: settledCount, rows: retryRows, changedDuringRead: true };
  }
  return { count: after, rows, changedDuringRead: after !== before };
}

