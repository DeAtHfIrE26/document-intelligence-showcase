import type { Chunk, ExtractedEntity } from '../types';

/**
 * Rebuild the full document text from overlapping chunks (each chunk's
 * offsets are document offsets, so overlaps are dropped by position).
 */
export function documentText(chunks: readonly Chunk[]): string {
  let text = '';
  for (const chunk of [...chunks].sort((a, b) => a.start - b.start)) {
    if (chunk.end <= text.length) continue;
    text += chunk.text.slice(Math.max(text.length - chunk.start, 0));
  }
  return text;
}

/**
 * The pipeline extracts per chunk, so an entity inside an overlap appears
 * once per chunk. Keep one per (start, end, type), with the highest confidence.
 */
export function uniqueEntities(entities: readonly ExtractedEntity[]): ExtractedEntity[] {
  const byKey = new Map<string, ExtractedEntity>();
  for (const entity of entities) {
    const key = `${entity.start}:${entity.end}:${entity.type}`;
    const existing = byKey.get(key);
    if (!existing || entity.confidence > existing.confidence) byKey.set(key, entity);
  }
  return [...byKey.values()].sort((a, b) => a.start - b.start);
}

export interface TypeCount {
  type: string;
  count: number;
}

export function countByType(entities: readonly ExtractedEntity[]): TypeCount[] {
  const counts = new Map<string, number>();
  for (const entity of entities) counts.set(entity.type, (counts.get(entity.type) ?? 0) + 1);
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}

export function averageConfidence(entities: readonly ExtractedEntity[]): number {
  if (entities.length === 0) return 0;
  return entities.reduce((sum, entity) => sum + entity.confidence, 0) / entities.length;
}
