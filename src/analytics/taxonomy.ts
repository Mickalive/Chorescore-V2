/**
 * ChoreScore V2 — TaskTaxonomyService
 *
 * Transforms free-text task labels into statistical categories.
 * The product keeps free text; analytics never sees raw labels.
 *
 * Versioned and deterministic: the same label always maps to the
 * same category for a given taxonomy version. No randomness,
 * no ML inference, no network calls.
 */

import {
  TaxonomyCategoryId,
  TaxonomyVersion,
} from './types';

/**
 * Default taxonomy mapping (v1.0.0).
 *
 * Each pattern is a keyword/prefix match against the normalized label.
 * The first matching pattern wins. Unmatched labels fall back to 'other'.
 *
 * The mapping is case-insensitive and accent-insensitive.
 */
const DEFAULT_MAPPINGS: Record<string, TaxonomyCategoryId> = {
  // Kitchen / cooking
  cuisine: 'kitchen',
  cuisson: 'kitchen',
  repas: 'kitchen',
  preparer: 'kitchen',
  diner: 'kitchen',
  dejeuner: 'kitchen',
  petit_dejeuner: 'kitchen',
  cooking: 'kitchen',

  // Dishes / washing up
  vaisselle: 'dishes',
  couverts: 'dishes',
  assiettes: 'dishes',
  dishes: 'dishes',

  // Cleaning
  menage: 'cleaning',
  nettoyage: 'cleaning',
  epoussetage: 'cleaning',
  aspirateur: 'cleaning',
  balayer: 'cleaning',
  passer_l_aspirateur: 'cleaning',
  cleaning: 'cleaning',
  clean: 'cleaning',

  // Laundry
  linge: 'laundry',
  machine: 'laundry',
  buanderie: 'laundry',
  repassage: 'laundry',
  secher: 'laundry',
  plier: 'laundry',
  laundry: 'laundry',

  // Groceries / supplies
  courses: 'groceries',
  approvisionnement: 'groceries',
  supermarche: 'groceries',
  market: 'groceries',
  achat: 'groceries',
  groceries: 'groceries',

  // Administrative
  administratif: 'administrative',
  facture: 'administrative',
  paperasse: 'administrative',
  impots: 'administrative',
  administration: 'administrative',
  courrier: 'administrative',
  administrative: 'administrative',

  // Childcare / persons care
  enfant: 'childcare',
  soins: 'childcare',
  bebe: 'childcare',
  berceau: 'childcare',
  devoirs: 'childcare',
  lecture: 'childcare',
  bain: 'childcare',
  childcare: 'childcare',

  // Maintenance / DIY
  entretien: 'maintenance',
  bricolage: 'maintenance',
  reparation: 'maintenance',
  tonte: 'maintenance',
  jardinage: 'maintenance',
  maintenance: 'maintenance',
  repair: 'maintenance',

  // Waste
  dechets: 'waste',
  poubelle: 'waste',
  tri: 'waste',
  recyclage: 'waste',
  waste: 'waste',
};

const DEFAULT_TAXONOMY: TaxonomyVersion = {
  version: '1.0.0',
  mappings: DEFAULT_MAPPINGS,
  fallback: 'other',
};

/**
 * Normalize a label for matching: lowercase, remove accents, trim.
 */
function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .trim()
    .replace(/\s+/g, '_'); // spaces to underscores for matching
}

/**
 * TaskTaxonomyService — transforms free-text labels to taxonomy IDs.
 *
 * Deterministic: same input → same output for a given version.
 * No network calls, no randomness, no ML.
 */
export class TaskTaxonomyService {
  private readonly taxonomy: TaxonomyVersion;

  constructor(taxonomy?: TaxonomyVersion) {
    this.taxonomy = taxonomy ?? DEFAULT_TAXONOMY;
  }

  /**
   * Get the current taxonomy version.
   */
  getVersion(): string {
    return this.taxonomy.version;
  }

  /**
   * Get the full taxonomy definition (for audit/export).
   */
  getTaxonomy(): TaxonomyVersion {
    return { ...this.taxonomy };
  }

  /**
   * Map a free-text label to a taxonomy category ID.
   *
   * Deterministic: same label always maps to the same category
   * for the same taxonomy version.
   *
   * @param label - The free-text task label (e.g., "Faire la vaisselle")
   * @returns The taxonomy category ID
   */
  mapLabel(label: string): TaxonomyCategoryId {
    const normalized = normalizeLabel(label);

    // Try exact match first
    if (this.taxonomy.mappings[normalized]) {
      return this.taxonomy.mappings[normalized];
    }

    // Try longest keyword match (most specific wins)
    let bestMatch: TaxonomyCategoryId | null = null;
    let bestMatchLength = 0;
    for (const [keyword, categoryId] of Object.entries(this.taxonomy.mappings)) {
      if (normalized.includes(keyword) && keyword.length > bestMatchLength) {
        bestMatch = categoryId;
        bestMatchLength = keyword.length;
      }
    }
    if (bestMatch) return bestMatch;

    // Try reverse substring match (keyword contains label)
    for (const [keyword, categoryId] of Object.entries(this.taxonomy.mappings)) {
      if (keyword.includes(normalized)) {
        return categoryId;
      }
    }

    // Fallback
    return this.taxonomy.fallback;
  }

  /**
   * Map multiple labels in batch.
   * Deterministic and efficient.
   */
  mapLabels(labels: string[]): Map<string, TaxonomyCategoryId> {
    const result = new Map<string, TaxonomyCategoryId>();
    for (const label of labels) {
      result.set(label, this.mapLabel(label));
    }
    return result;
  }

  /**
   * Get all valid taxonomy category IDs.
   */
  getValidCategories(): TaxonomyCategoryId[] {
    const categories = new Set<TaxonomyCategoryId>(
      Object.values(this.taxonomy.mappings)
    );
    categories.add(this.taxonomy.fallback);
    return Array.from(categories);
  }
}

/**
 * Create a TaskTaxonomyService with the default v1.0.0 taxonomy.
 */
export function createDefaultTaxonomy(): TaskTaxonomyService {
  return new TaskTaxonomyService();
}
