const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/** 1536 → "1.5 KB". */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), SIZE_UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${exponent === 0 ? value : Number(value.toFixed(1))} ${SIZE_UNITS[exponent]}`;
}

export type ConfidenceLevel = 'high' | 'good' | 'fair' | 'low';

/** Buckets used for confidence badges (same thresholds as the app). */
export function confidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'good';
  if (confidence >= 0.4) return 'fair';
  return 'low';
}

/** "same_as" → "Same As". */
export function formatRelationshipName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const ENTITY_LABELS: Record<string, string> = {
  PERSON: 'Person',
  ORG: 'Organisation',
  GPE: 'Place',
  LOC: 'Location',
  FAC: 'Facility',
  NORP: 'Group',
  EVENT: 'Event',
  PRODUCT: 'Product',
  WORK_OF_ART: 'Work',
  LAW: 'Law',
  LANGUAGE: 'Language',
  DATE: 'Date',
  TIME: 'Time',
  MONEY: 'Money',
  QUANTITY: 'Quantity',
  PERCENT: 'Percent',
  CARDINAL: 'Number',
  ORDINAL: 'Ordinal',
};

/** Human label for an entity type; unknown types are title-cased. */
export function entityLabel(type: string): string {
  return ENTITY_LABELS[type] ?? formatRelationshipName(type.toLowerCase());
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}
