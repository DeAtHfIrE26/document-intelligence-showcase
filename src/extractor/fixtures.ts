import type { ExtractionResult } from '../types';
import gettysburg from '../fixtures/gettysburg-address.json';
import tideGauge from '../fixtures/tide-gauge-data-summary.json';
import grant from '../fixtures/grant-and-appomattox.json';
import kestrel from '../fixtures/brief-kestrel-first-flight.json';
import poster from '../fixtures/salt-marsh-monitoring-poster.json';

/**
 * Pre-computed outputs for the five sample documents in /samples.
 * They were produced by running the real (private) pipeline once on these
 * public-domain, original and synthetic files; only the resulting JSON is included.
 */
export const SAMPLE_RESULTS: readonly ExtractionResult[] = [
  gettysburg, grant, tideGauge, kestrel, poster,
] as ExtractionResult[];

export function findSample(id: string): ExtractionResult | undefined {
  return SAMPLE_RESULTS.find((result) => result.document.id === id);
}
