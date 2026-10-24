import type { Category, Product } from '../../types';

export type TryOnKind = 'earrings' | 'necklace' | 'ring' | 'bracelet';

/** How well a category is tracked. Only "supported" kinds are presented as reliable. */
export type SupportLevel = 'supported' | 'experimental';

export interface KindInfo {
  kind: TryOnKind;
  label: string;
  /** Category slug used to fetch products from the existing products API. */
  categorySlugs: string[];
  tracker: 'face' | 'hand';
  support: SupportLevel;
  howTo: string;
}

export const KINDS: KindInfo[] = [
  {
    kind: 'earrings',
    label: 'Earrings',
    categorySlugs: ['earrings'],
    tracker: 'face',
    support: 'supported',
    howTo: 'Face the camera with your ears visible. Tie hair back for the best result.',
  },
  {
    kind: 'necklace',
    label: 'Necklaces',
    categorySlugs: ['necklaces', 'bridal-sets'],
    tracker: 'face',
    support: 'experimental',
    howTo: 'Keep your face and neckline in the frame. Placement is estimated from your jawline.',
  },
  {
    kind: 'ring',
    label: 'Rings',
    categorySlugs: ['rings'],
    tracker: 'hand',
    support: 'experimental',
    howTo: 'Hold one open hand, palm facing the camera, fingers apart.',
  },
  {
    kind: 'bracelet',
    label: 'Bracelets',
    categorySlugs: ['bracelets-bangles'],
    tracker: 'hand',
    support: 'experimental',
    howTo: 'Show one hand and your wrist, palm or back facing the camera.',
  },
];

export const kindInfo = (kind: TryOnKind) => KINDS.find((k) => k.kind === kind)!;

/** Works out which try-on kind a product belongs to (no catalogue data is invented). */
export function kindForProduct(product: Product): TryOnKind | null {
  const cat = product.category as Category | string | undefined;
  const slug = typeof cat === 'object' && cat ? cat.slug : '';
  const catName = typeof cat === 'object' && cat ? cat.name : '';
  const fromText = (text: string): TryOnKind | null => {
    const t = text.toLowerCase();
    if (/earring|jhumk|\bstuds?\b|hoops?\b|huggie/.test(t)) return 'earrings';
    if (/bracelet|bangle|\bkara\b|\bcuff\b/.test(t)) return 'bracelet';
    if (/\brings?\b/.test(t)) return 'ring';
    if (/necklace|choker|pendant|\bchain\b|bridal set|\bset\b/.test(t)) return 'necklace';
    return null;
  };
  // The product name is the most specific signal, then its category, then the legacy "Type" field
  return (
    fromText(product.name) ||
    KINDS.find((k) => k.categorySlugs.includes(slug))?.kind ||
    fromText(`${slug} ${catName}`) ||
    fromText(product.specifications?.movement || '')
  );
}
