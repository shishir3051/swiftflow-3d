import { describe, it, expect } from 'vitest';
import { validateXmlWellFormedness } from '../../src/lib/xmlValidator';

describe('XML Well-Formedness Validator', () => {
  it('validates a correct XML string', () => {
    const validXml = `<?xml version="1.0" encoding="UTF-8"?>
    <Document xmlns="urn:iso:pacs.008">
      <GrpHdr>
        <MsgId>MSG-1001</MsgId>
        <NbOfTxs>1</NbOfTxs>
      </GrpHdr>
      <CdtTrfTxInf>
        <IntrBkSttlmAmt Ccy="EUR">500.00</IntrBkSttlmAmt>
      </CdtTrfTxInf>
    </Document>`;

    const res = validateXmlWellFormedness(validXml);
    expect(res.isValid).toBe(true);
    expect(res.errors).toEqual([]);
    expect(res.rootElement).toBe('Document');
  });

  it('catches mismatched closing tags', () => {
    const invalidXml = `<Document><GrpHdr><MsgId>MSG-1001</WrongId></GrpHdr></Document>`;
    const res = validateXmlWellFormedness(invalidXml);
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain('Mismatched closing tag');
  });

  it('catches unclosed tags', () => {
    const unclosedXml = `<Document><GrpHdr><MsgId>MSG-1001</MsgId></Document>`;
    const res = validateXmlWellFormedness(unclosedXml);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes('Unclosed XML tag'))).toBe(true);
  });

  it('catches unquoted attributes', () => {
    const unquotedAttrXml = `<Document><Amount Ccy=EUR>100</Amount></Document>`;
    const res = validateXmlWellFormedness(unquotedAttrXml);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes('must be quoted'))).toBe(true);
  });
});
