/** Text matching for catalogue search: token-based, case-insensitive, with an optional typo-tolerant mode. */

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Fields a shopper's words may match. Customer data is never searched here. */
export const SEARCH_FIELDS = ['name', 'brand', 'model', 'sku', 'shortDescription', 'description', 'tags'] as const;

/** Lower-cases, trims and collapses whitespace; caps length so a pasted essay can't build a huge regex. */
export function normaliseQuery(q: string | undefined): string {
  return (q || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80);
}

/**
 * Pattern for one word. In fuzzy mode a word of 4+ letters also matches with any one letter
 * wrong, missing or extra ("neckles" → necklace, "jumka" → jhumka).
 */
function tokenPattern(token: string, fuzzy: boolean): string {
  const exact = escape(token);
  // Strict pass matches from the start of a word, so "ring" finds rings but not "earrings"
  if (!fuzzy) return `\\b${exact}`;
  if (token.length < 4) return exact;
  const variants = new Set<string>([exact]);
  for (let i = 0; i < token.length; i++) {
    const before = escape(token.slice(0, i));
    const after = escape(token.slice(i + 1));
    variants.add(`${before}.?${after}`); // substitution or deletion
    variants.add(`${before}.${escape(token.slice(i))}`); // insertion
  }
  // Long words: the opening letters are enough ("neckles" → "neckl…")
  if (token.length >= 6) variants.add(escape(token.slice(0, token.length - 2)));
  return `(?:${Array.from(variants).join('|')})`;
}

/** Orders matches so that words found in the product name rank above description-only matches. */
export function nameRelevance(name: string, query: string): number {
  const n = name.toLowerCase();
  return query.split(' ').reduce((score, t) => {
    if (!t) return score;
    if (new RegExp(`\\b${escape(t)}`).test(n)) return score + 2;
    return n.includes(t) ? score + 1 : score;
  }, 0);
}

/**
 * Mongo filter requiring every word to appear in at least one searchable field,
 * so "jhumka gold" finds "Mehr Gold Jhumka".
 */
export function buildTextFilter(query: string, fuzzy = false): Record<string, unknown> | null {
  const tokens = Array.from(new Set(query.split(' ').filter(Boolean))).slice(0, 6);
  if (tokens.length === 0) return null;
  return {
    $and: tokens.map((t) => {
      const regex = new RegExp(tokenPattern(t, fuzzy), 'i');
      return { $or: SEARCH_FIELDS.map((f) => ({ [f]: regex })) };
    }),
  };
}

/** The price a shopper actually pays: a valid sale price, otherwise the regular price. */
export const EFFECTIVE_PRICE = {
  $cond: [
    { $and: [{ $gt: [{ $ifNull: ['$salePrice', 0] }, 0] }, { $lt: ['$salePrice', '$price'] }] },
    '$salePrice',
    '$price',
  ],
};
