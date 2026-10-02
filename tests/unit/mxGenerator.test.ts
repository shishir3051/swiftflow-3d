import { describe, it, expect } from 'vitest';
import { parseMT103 } from '../../src/lib/mtParser';
import { generatePacs008Xml } from '../../src/lib/mxGenerator';
import { validateXmlWellFormedness } from '../../src/lib/xmlValidator';

describe('ISO 20022 pacs.008 Generator', () => {
  const sampleMT = `{1:F01USNYUS33AXXX0001000001}{2:I103GB2LGB2LXXXXN}{3:{108:FT26100290018}{121:4f7b2a19-90d3-481e-84bf-9c7811ef42a0}}{4:
:20:FT26100290018
:23B:CRED
:32A:261002USD14250000,00
:50K:/US120000000987654321
NORTHERN MERIDIAN CAPITAL LLC
450 LEXINGTON AVENUE, FL 32
NEW YORK, NY 10017 US
:52A:USNYUS33XXX
:57A:GB2LGB2LXXX
:59:/GB82WEST12345698765432
THAMES INFRASTRUCTURE HOLDINGS PLC
88 BISHOPSGATE
LONDON EC2N 4AG GB
:70:/INV/2026-COUPON-88192
BOND COUPON PAYMENT OCT 2026
:71A:SHA
-}`;

  it('generates valid pacs.008 XML containing required Business Application Header and Document', () => {
    const parsed = parseMT103(sampleMT);
    const xml = generatePacs008Xml(parsed);

    expect(xml).toContain('<BusMsg xmlns="urn:iso:std:iso:20022:tech:xsd:head.001.001.02">');
    expect(xml).toContain('<MsgDefIdr>pacs.008.001.08</MsgDefIdr>');
    expect(xml).toContain('<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">');
    expect(xml).toContain('<FIToFICstmrCdtTrf>');
  });

  it('correctly maps transaction reference and UETR into Payment Identification', () => {
    const parsed = parseMT103(sampleMT);
    const xml = generatePacs008Xml(parsed);

    expect(xml).toContain('<EndToEndId>FT26100290018</EndToEndId>');
    expect(xml).toContain('<UETR>4f7b2a19-90d3-481e-84bf-9c7811ef42a0</UETR>');
  });

  it('maps currency attribute and settlement amount', () => {
    const parsed = parseMT103(sampleMT);
    const xml = generatePacs008Xml(parsed);

    expect(xml).toContain('<IntrBkSttlmAmt Ccy="USD">14250000.00</IntrBkSttlmAmt>');
    expect(xml).toContain('<IntrBkSttlmDt>2026-10-02</IntrBkSttlmDt>');
  });

  it('translates details of charges SHA to SHAR', () => {
    const parsed = parseMT103(sampleMT);
    const xml = generatePacs008Xml(parsed);

    expect(xml).toContain('<ChrgBr>SHAR</ChrgBr>');
  });

  it('produces 100% well-formed XML passing validator tests', () => {
    const parsed = parseMT103(sampleMT);
    const xml = generatePacs008Xml(parsed);

    const validation = validateXmlWellFormedness(xml);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(validation.rootElement).toBe('BusMsg');
  });
});
