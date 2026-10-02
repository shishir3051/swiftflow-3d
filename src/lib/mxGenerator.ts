import type { ParsedMT103 } from '../types/swift';

/**
 * Generates standard ISO 20022 pacs.008.001.08 XML from a parsed MT103 object.
 * Complies with SWIFT CBPR+ (Cross-Border Payments and Reporting Plus) guidelines.
 */
export function generatePacs008Xml(parsed: ParsedMT103): string {
  const creationDate = new Date().toISOString();
  const settlementDate = formatSettlementDate(parsed.valueDate);
  const msgId = `MSG-${parsed.transactionReference.replace(/[^A-Za-z0-9]/g, '')}-${Date.now().toString().slice(-6)}`;

  // Charge Bearer translation
  const chargeBearerMap: Record<string, string> = {
    OUR: 'DEBT',
    BEN: 'CRED',
    SHA: 'SHAR',
  };
  const chrgBr = chargeBearerMap[parsed.detailsOfCharges] || 'SHAR';

  // Format amount with 2 decimals
  const formattedAmount = parsed.amount.toFixed(2);

  // Parse Debtor address elements
  const debtorName = parsed.orderingCustomer.nameAddress[0] || 'SIMULATED ORDERING CORP';
  const debtorStreet = parsed.orderingCustomer.nameAddress[1] || '450 LEXINGTON AVE';
  const debtorCity = parsed.orderingCustomer.nameAddress[2] || 'NEW YORK';
  const debtorCountry = extractCountryCode(parsed.orderingCustomer.nameAddress) || 'US';

  // Parse Creditor address elements
  const creditorName = parsed.beneficiary.nameAddress[0] || 'SIMULATED BENEFICIARY ENTITY';
  const creditorStreet = parsed.beneficiary.nameAddress[1] || '88 BISHOPSGATE';
  const creditorCity = parsed.beneficiary.nameAddress[2] || 'LONDON';
  const creditorCountry = extractCountryCode(parsed.beneficiary.nameAddress) || 'GB';

  return `<?xml version="1.0" encoding="UTF-8"?>
<BusMsg xmlns="urn:iso:std:iso:20022:tech:xsd:head.001.001.02">
  <AppHdr>
    <Fr>
      <FIId>
        <FinInstnId>
          <BICFI>${escapeXml(parsed.senderBic)}</BICFI>
        </FinInstnId>
      </FIId>
    </Fr>
    <To>
      <FIId>
        <FinInstnId>
          <BICFI>${escapeXml(parsed.receiverBic)}</BICFI>
        </FinInstnId>
      </FIId>
    </To>
    <BizMsgIdr>${escapeXml(msgId)}</BizMsgIdr>
    <MsgDefIdr>pacs.008.001.08</MsgDefIdr>
    <CreDt>${creationDate}</CreDt>
  </AppHdr>
  <Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">
    <FIToFICstmrCdtTrf>
      <GrpHdr>
        <MsgId>${escapeXml(msgId)}</MsgId>
        <CreDtTm>${creationDate}</CreDtTm>
        <NbOfTxs>1</NbOfTxs>
        <SttlmInf>
          <SttlmMtd>CLRG</SttlmMtd>
        </SttlmInf>
      </GrpHdr>
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${escapeXml(parsed.transactionReference)}</EndToEndId>
          <UETR>${escapeXml(parsed.uetr)}</UETR>
        </PmtId>
        <PmtTpInf>
          <SvcLvl>
            <Cd>G001</Cd>
          </SvcLvl>
          <LclInstrm>
            <Cd>CRED</Cd>
          </LclInstrm>
        </PmtTpInf>
        <IntrBkSttlmAmt Ccy="${escapeXml(parsed.currency)}">${formattedAmount}</IntrBkSttlmAmt>
        <IntrBkSttlmDt>${settlementDate}</IntrBkSttlmDt>
        <ChrgBr>${chrgBr}</ChrgBr>
        <Dbtr>
          <Nm>${escapeXml(debtorName)}</Nm>
          <PstlAdr>
            <StrtNm>${escapeXml(debtorStreet)}</StrtNm>
            <TwnNm>${escapeXml(debtorCity)}</TwnNm>
            <Ctry>${escapeXml(debtorCountry)}</Ctry>
          </PstlAdr>
        </Dbtr>
        <DbtrAcct>
          <Id>
            ${
              parsed.orderingCustomer.account?.startsWith('IBAN') ||
              (parsed.orderingCustomer.account && /^[A-Z]{2}[0-9]{2}/.test(parsed.orderingCustomer.account))
                ? `<IBAN>${escapeXml(parsed.orderingCustomer.account.replace(/^IBAN/i, ''))}</IBAN>`
                : `<Othr><Id>${escapeXml(parsed.orderingCustomer.account || 'ACC-990182')}</Id></Othr>`
            }
          </Id>
        </DbtrAcct>
        <DbtrAgt>
          <FinInstnId>
            <BICFI>${escapeXml(parsed.orderingInstitution?.bic || parsed.senderBic)}</BICFI>
          </FinInstnId>
        </DbtrAgt>
        <CdtrAgt>
          <FinInstnId>
            <BICFI>${escapeXml(parsed.accountWithInstitution?.bic || parsed.receiverBic)}</BICFI>
          </FinInstnId>
        </CdtrAgt>
        <Cdtr>
          <Nm>${escapeXml(creditorName)}</Nm>
          <PstlAdr>
            <StrtNm>${escapeXml(creditorStreet)}</StrtNm>
            <TwnNm>${escapeXml(creditorCity)}</TwnNm>
            <Ctry>${escapeXml(creditorCountry)}</Ctry>
          </PstlAdr>
        </Cdtr>
        <CdtrAcct>
          <Id>
            ${
              parsed.beneficiary.account && /^[A-Z]{2}[0-9]{2}/.test(parsed.beneficiary.account)
                ? `<IBAN>${escapeXml(parsed.beneficiary.account)}</IBAN>`
                : `<Othr><Id>${escapeXml(parsed.beneficiary.account || 'ACC-774019')}</Id></Othr>`
            }
          </Id>
        </CdtrAcct>
        ${
          parsed.remittanceInformation
            ? `<RmtInf>
          <Ustrd>${escapeXml(parsed.remittanceInformation.replace(/\r?\n/g, ' '))}</Ustrd>
        </RmtInf>`
            : ''
        }
      </CdtTrfTxInf>
    </FIToFICstmrCdtTrf>
  </Document>
</BusMsg>`;
}

function formatSettlementDate(valDateStr: string): string {
  if (valDateStr && valDateStr.length === 6) {
    const yy = parseInt(valDateStr.substring(0, 2), 10);
    const mm = valDateStr.substring(2, 4);
    const dd = valDateStr.substring(4, 6);
    const yyyy = yy >= 70 ? `19${yy}` : `20${yy.toString().padStart(2, '0')}`;
    return `${yyyy}-${mm}-${dd}`;
  }
  return new Date().toISOString().slice(0, 10);
}

function extractCountryCode(lines: string[]): string | null {
  for (const line of lines) {
    const match = line.match(/\b([A-Z]{2})\b$/);
    if (match) return match[1];
  }
  return null;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
