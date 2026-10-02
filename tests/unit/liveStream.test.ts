import { describe, it, expect } from 'vitest';
import { getLiveTransactionStream, CORRIDOR_PRESETS } from '../../src/lib/liveStream';
import { parseMT103 } from '../../src/lib/mtParser';
import { generatePacs008Xml } from '../../src/lib/mxGenerator';
import { validateXmlWellFormedness } from '../../src/lib/xmlValidator';

describe('LiveTransactionStream Engine', () => {
  it('initializes with seed transactions', () => {
    const stream = getLiveTransactionStream();
    const txs = stream.getTransactions();
    expect(txs.length).toBeGreaterThan(0);
    const tx = txs[0];
    expect(tx.uetr).toBeDefined();
    expect(tx.amount).toBeGreaterThan(0);
    expect(tx.currency).toMatch(/^(USD|EUR|GBP|JPY|CHF|SGD|AUD)$/);
  });

  it('generates syntactically valid MT103 and pacs.008 XML for all live payments', () => {
    const stream = getLiveTransactionStream();
    const txs = stream.getTransactions();

    txs.forEach((tx) => {
      // 1. Validate raw MT103 parsing
      const parsed = parseMT103(tx.mt103Raw);
      expect(parsed.parseErrors.length).toBe(0);
      expect(parsed.transactionReference).toBeDefined();
      expect(parsed.amount).toBe(tx.amount);
      expect(parsed.currency).toBe(tx.currency);

      // 2. Validate pacs.008 XML generation
      const xml = generatePacs008Xml(parsed);
      expect(xml).toContain('pacs.008.001.08');
      expect(xml).toContain(tx.currency);

      // 3. Validate W3C XML well-formedness
      const validation = validateXmlWellFormedness(xml);
      expect(validation.isValid).toBe(true);
    });
  });

  it('provides real-time metrics for liquidity and TPS', () => {
    const stream = getLiveTransactionStream();
    const metrics = stream.getMetrics();
    expect(metrics.totalVolumeUsd).toBeGreaterThan(0);
    expect(metrics.settledCount).toBeGreaterThanOrEqual(0);
    expect(Number(metrics.tps)).toBeGreaterThan(1000);
  });

  it('supports speed changes between 0 (paused) and 5 (high-freq)', () => {
    const stream = getLiveTransactionStream();
    stream.setSpeed(0);
    expect(stream.getSpeed()).toBe(0);
    stream.setSpeed(2);
    expect(stream.getSpeed()).toBe(2);
    stream.setSpeed(1);
    expect(stream.getSpeed()).toBe(1);
  });

  it('exposes global institutional corridor presets', () => {
    expect(CORRIDOR_PRESETS.length).toBeGreaterThanOrEqual(4);
    const transatlantic = CORRIDOR_PRESETS.find((c) => c.id === 'transatlantic');
    expect(transatlantic).toBeDefined();
    expect(transatlantic?.fromHub).toBe('New York');
    expect(transatlantic?.toHub).toBe('London');
  });
});
