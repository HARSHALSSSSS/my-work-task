type Searchable = {
  id?: string;
  _id?: string;
  name?: string;
};

function normalize(input: string): string {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreMatch(targetRaw: string, queryRaw: string): number {
  const target = normalize(targetRaw);
  const query = normalize(queryRaw);

  if (!target || !query) return 0;
  if (target === query) return 1000;

  const targetWords = target.split(' ').filter(Boolean);
  const queryWords = query.split(' ').filter(Boolean);

  if (target.startsWith(query)) {
    return 850 - Math.min(200, Math.max(0, target.length - query.length));
  }

  const wordStarts = targetWords.some((word) => word.startsWith(query));
  if (wordStarts) {
    return 760;
  }

  const phraseInOrder = queryWords.every((word) => target.includes(word));
  if (phraseInOrder) {
    return 650;
  }

  const includesAt = target.indexOf(query);
  if (includesAt >= 0) {
    return 560 - Math.min(120, includesAt * 2);
  }

  const sharedTokens = queryWords.filter((word) => targetWords.includes(word)).length;
  if (sharedTokens > 0) {
    return 300 + sharedTokens * 20;
  }

  return 0;
}

export function extractSearchItems<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.products)) return payload.products as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.items)) return payload.items as T[];
  return [];
}

export function rankSearchResults<T extends Searchable>(
  items: T[],
  query: string,
  limit = 30,
): T[] {
  const seen = new Set<string>();

  const ranked = (items || [])
    .filter((item) => {
      const key = String(item?.id || item?._id || '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item, idx) => ({
      item,
      idx,
      score: scoreMatch(item?.name || '', query),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.idx - b.idx;
    })
    .slice(0, limit)
    .map((entry) => entry.item);

  return ranked;
}
