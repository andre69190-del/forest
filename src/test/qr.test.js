import { describe, it, expect } from 'vitest';
import { treeUrl, parseTreeId, qrDataUrl } from '../lib/qr.js';

const id = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';
describe('QR-Plakette', () => {
  it('Adresse und Rückweg', () => {
    const url = treeUrl(id, 'https://forest.arndt-software.de');
    expect(url).toBe(`https://forest.arndt-software.de/#/baum/${id}`);
    expect(parseTreeId(url)).toBe(id);
    expect(parseTreeId(id.toUpperCase())).toBe(id);
    expect(parseTreeId('hallo')).toBeNull();
  });
  it('erzeugt ein PNG', async () => {
    expect((await qrDataUrl('x')).startsWith('data:image/png;base64,')).toBe(true);
  });
});
