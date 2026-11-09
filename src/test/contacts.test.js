import { describe, it, expect } from 'vitest';
import { toVCard, followUpMailto, toCsv } from '../lib/contacts.js';

describe('Gesprächsnotiz', () => {
  it('vCard mit Name, Organisation, E-Mail und maskierten Sonderzeichen', () => {
    const v = toVCard({ name: 'Ana Souza', org: 'Ministério; Florestas', email: 'ana@example.org' }, 'EUDR, Kleinbauern');
    expect(v).toContain('BEGIN:VCARD');
    expect(v).toContain('N:Souza;Ana;;;');
    expect(v).toContain('ORG:Ministério\\; Florestas');
    expect(v).toContain('NOTE:EUDR\\, Kleinbauern');
    expect(v.endsWith('END:VCARD\r\n')).toBe(true);
  });
  it('mailto kodiert Betreff und Text', () => {
    const m = followUpMailto({ email: 'a@b.de' }, { subject: 'Hallo & Danke', body: 'Zeile 1\nZeile 2' });
    expect(m).toBe('mailto:a%40b.de?subject=Hallo%20%26%20Danke&body=Zeile%201%0AZeile%202');
  });
  it('CSV mit BOM, Semikolon und Anführungszeichen', () => {
    const c = toCsv([['A; B', 'x"y']], ['Name', 'Notiz']);
    expect(c.startsWith('\uFEFFName;Notiz')).toBe(true);
    expect(c).toContain('"A; B";"x""y"');
  });
});
