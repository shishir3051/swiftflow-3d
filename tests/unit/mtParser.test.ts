import { describe, it, expect } from 'vitest';
import { parseMT103, formatCurrency } from '../../src/lib/mtParser';

describe('SWIFT MT103 Parser', () => {
  const sampleMT = `{1:F01USNYUS33AXXX0001000001}{2:I103GB2LGB2LXXXXN}{3:{108:FT26100290018}{121:4f7b2a19-90d3-481e-84bf-9c7811ef42a0}}{4:
:20:FT26100290018
:23B:CRED
:32A:261002USD14250000,00
:33B:USD14250000,00
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

  it('correctly extracts header metadata and BICs from blocks 1 and 2', () => {
    const parsed = parseMT103(sampleMT);
    expect(parsed.senderBic).toBe('USNYUS33XXX');
    expect(parsed.receiverBic).toBe('GB2LGB2LXXX');
    expect(parsed.uetr).toBe('4f7b2a19-90d3-481e-84bf-9c7811ef42a0');
  });

  it('extracts mandatory tag 20 reference and tag 23B bank operation code', () => {
    const parsed = parseMT103(sampleMT);
    expect(parsed.transactionReference).toBe('FT26100290018');
    expect(parsed.bankOperationCode).toBe('CRED');
  });

  it('parses tag 32A into date, currency, and numerical amount', () => {
    const parsed = parseMT103(sampleMT);
    expect(parsed.valueDate).toBe('261002');
    expect(parsed.currency).toBe('USD');
    expect(parsed.amount).toBe(14250000.0);
    expect(parsed.formattedAmount).toContain('14,250,000.00');
  });

  it('splits tag 50K and tag 59 into account and address lines', () => {
    const parsed = parseMT103(sampleMT);
    expect(parsed.orderingCustomer.account).toBe('US120000000987654321');
    expect(parsed.orderingCustomer.nameAddress[0]).toBe('NORTHERN MERIDIAN CAPITAL LLC');
    expect(parsed.beneficiary.account).toBe('GB82WEST12345698765432');
    expect(parsed.beneficiary.nameAddress[0]).toBe('THAMES INFRASTRUCTURE HOLDINGS PLC');
  });

  it('parses charge details and remittance narrative', () => {
    const parsed = parseMT103(sampleMT);
    expect(parsed.detailsOfCharges).toBe('SHA');
    expect(parsed.remittanceInformation).toContain('BOND COUPON PAYMENT');
  });

  it('detects missing mandatory tag :20: gracefully', () => {
    const invalidMT = sampleMT.replace(':20:FT26100290018', '');
    const parsed = parseMT103(invalidMT);
    expect(parsed.parseErrors.some((e) => e.includes('Missing mandatory field :20:'))).toBe(true);
  });

  it('formats currency correctly with standard locales', () => {
    expect(formatCurrency(1000, 'USD')).toContain('1,000.00');
    expect(formatCurrency(2500000.5, 'EUR')).toContain('2,500,000.50');
  });
});
