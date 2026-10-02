import type { ParsedMT103, SWIFTTag } from '../types/swift';
import { MT_TO_MX_MAPPINGS } from '../data/mtIsoMappings';

/**
 * Parses a SWIFT MT103 (Single Customer Credit Transfer) FIN text message into structured data.
 */
export function parseMT103(rawInput: string): ParsedMT103 {
  const cleanInput = rawInput.trim();
  const parseErrors: string[] = [];

  // Extract Blocks: {1:...}{2:...}{3:...}{4:...}{5:...}
  const block1Match = cleanInput.match(/\{1:([^\}]+)\}/);
  const block2Match = cleanInput.match(/\{2:([^\}]+)\}/);
  
  // Block 3 can have nested tags like {3:{108:...}{121:...}}
  const block3Match = cleanInput.match(/\{3:([\s\S]*?)\}(?=\{[45]:|$)/);
  
  // Block 4 ends with -\r?\n} or -} or \n-}
  const block4Match = cleanInput.match(/\{4:\s*([\s\S]*?)(?:\r?\n-|\s*-\s*\})/);

  // Extract Sender BIC from Block 1 (e.g., F01USNYUS33AXXX0001000001 -> USNYUS33XXX)
  let senderBic = 'UNKNOWNBIC';
  let sessionNumber: string | undefined;
  let sequenceNumber: string | undefined;
  if (block1Match) {
    const b1 = block1Match[1];
    if (b1.length >= 15) {
      // 3 chars (F01) + 12 chars LT identifier (8 BIC + 1 terminal + 3 branch)
      senderBic = b1.substring(3, 11) + (b1.length >= 15 ? b1.substring(12, 15) : 'XXX');
      if (b1.length >= 21) {
        sessionNumber = b1.substring(15, 19);
        sequenceNumber = b1.substring(19, 25);
      }
    }
  }

  // Extract Receiver BIC from Block 2 (e.g., I103GB2LGB2LXXXXN -> GB2LGB2LXXX)
  let receiverBic = 'UNKNOWNBIC';
  let messageType: '103' | '103+' = '103';
  if (block2Match) {
    const b2 = block2Match[1];
    if (b2.includes('103')) {
      const mtIndex = b2.indexOf('103');
      const rest = b2.substring(mtIndex + 3);
      if (rest.length >= 8) {
        receiverBic = rest.substring(0, 11).trim();
        if (receiverBic.length === 8) receiverBic += 'XXX';
      }
    }
  }

  // Extract UETR from Block 3 or anywhere in text (Tag 121 UUID)
  let uetr = '';
  let serviceIdentifier: string | undefined;
  const uetrMatch = cleanInput.match(/\{?121:([a-f0-9\-]{36})\}?/i);
  if (uetrMatch) {
    uetr = uetrMatch[1].toLowerCase();
  }
  const serviceMatch = cleanInput.match(/\{?111:([0-9]{3})\}?/);
  if (serviceMatch) {
    serviceIdentifier = serviceMatch[1];
  }

  // If no block 4 wrapper found, fallback to searching for MT tags in the whole text
  const textContent = block4Match ? block4Match[1] : cleanInput;

  // Split into tags by searching for `:XX:` or `:XX[A-Z]:`
  const tagRegex = /(^|\n):([0-9]{2}[A-Z]?):/g;
  const tagIndices: { tag: string; index: number; length: number }[] = [];

  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(textContent)) !== null) {
    tagIndices.push({
      tag: match[2],
      index: match.index + match[1].length,
      length: match[0].length - match[1].length,
    });
  }

  const rawTagsMap = new Map<string, string>();
  const parsedTagsList: SWIFTTag[] = [];

  for (let i = 0; i < tagIndices.length; i++) {
    const current = tagIndices[i];
    const startIndex = current.index + current.length;
    const endIndex = i + 1 < tagIndices.length ? tagIndices[i + 1].index : textContent.length;
    const value = textContent.substring(startIndex, endIndex).trim();

    rawTagsMap.set(current.tag, value);

    const mapping = MT_TO_MX_MAPPINGS.find(
      (m) => m.mtTag === `:${current.tag}:` || m.mtTag.includes(`:${current.tag}`)
    );

    parsedTagsList.push({
      tag: current.tag,
      value,
      name: mapping ? mapping.mtFieldName : `Field ${current.tag}`,
      description: mapping ? mapping.rule : 'Standard MT field',
      isoPath: mapping ? mapping.mxPath : 'Document > FIToFICstmrCdtTrf',
      raw: `:${current.tag}:${value}`,
    });
  }

  // Mandatory Tag 20: Transaction Reference
  const transactionReference = rawTagsMap.get('20') || '';
  if (!transactionReference) {
    parseErrors.push('Missing mandatory field :20: (Transaction Reference Number)');
  }

  // Tag 23B: Bank Operation Code
  const bankOperationCode = rawTagsMap.get('23B') || 'CRED';

  // Mandatory Tag 32A: Value Date, Currency, Interbank Settled Amount
  // Format: 6!n3!a15d (e.g., 261002USD14250000,00)
  const tag32A = rawTagsMap.get('32A') || '';
  let valueDate = '';
  let currency = 'USD';
  let amount = 0;
  let formattedAmount = '$0.00';

  if (tag32A) {
    const match32A = tag32A.match(/^([0-9]{6})([A-Z]{3})([0-9]+(?:,[0-9]+)?)$/);
    if (match32A) {
      valueDate = match32A[1];
      currency = match32A[2];
      const numericString = match32A[3].replace(',', '.');
      amount = parseFloat(numericString);
      formattedAmount = formatCurrency(amount, currency);
    } else {
      parseErrors.push(`Field :32A: has invalid syntax: "${tag32A}". Expected YYMMDDCCCAmount.`);
    }
  } else {
    parseErrors.push('Missing mandatory field :32A: (Value Date, Currency, Amount)');
  }

  // Tag 50A or 50K: Ordering Customer
  const tag50 = rawTagsMap.get('50K') || rawTagsMap.get('50A') || '';
  const orderingCustomer = parseCustomerLines(tag50);
  if (orderingCustomer.nameAddress.length === 0 && !orderingCustomer.account) {
    parseErrors.push('Missing or empty ordering customer field (:50A: or :50K:)');
  }

  // Tag 52A: Ordering Institution
  const tag52A = rawTagsMap.get('52A');
  const orderingInstitution = tag52A ? { bic: tag52A.trim() } : undefined;

  // Tag 57A: Account With Institution
  const tag57A = rawTagsMap.get('57A');
  const accountWithInstitution = tag57A ? { bic: tag57A.trim() } : undefined;

  // Mandatory Tag 59 or 59A: Beneficiary Customer
  const tag59 = rawTagsMap.get('59') || rawTagsMap.get('59A') || '';
  const beneficiary = parseCustomerLines(tag59);
  if (beneficiary.nameAddress.length === 0 && !beneficiary.account) {
    parseErrors.push('Missing or empty beneficiary customer field (:59: or :59A:)');
  }

  // Tag 70: Remittance Information
  const remittanceInformation = rawTagsMap.get('70');

  // Mandatory Tag 71A: Details of Charges (OUR / BEN / SHA)
  const tag71A = (rawTagsMap.get('71A') || 'SHA').trim().toUpperCase() as 'OUR' | 'BEN' | 'SHA';
  if (!['OUR', 'BEN', 'SHA'].includes(tag71A)) {
    parseErrors.push(`Invalid Details of Charges :71A: "${tag71A}". Must be OUR, BEN, or SHA.`);
  }

  // Tag 71F / 71G
  const senderCharges = rawTagsMap.get('71F');
  const receiverCharges = rawTagsMap.get('71G');

  // Fallback UETR generation if not present in Block 3
  if (!uetr) {
    uetr = generateFallbackUETR(transactionReference || 'SWIFT');
  }

  return {
    senderBic,
    receiverBic,
    sessionNumber,
    sequenceNumber,
    messageType,
    uetr,
    serviceIdentifier,
    transactionReference,
    bankOperationCode,
    valueDate,
    currency,
    amount,
    formattedAmount,
    orderingCustomer,
    orderingInstitution,
    accountWithInstitution,
    beneficiary,
    remittanceInformation,
    detailsOfCharges: tag71A,
    senderCharges,
    receiverCharges,
    rawText: cleanInput,
    tags: parsedTagsList,
    parseErrors,
  };
}

/**
 * Splits MT address block (lines starting with / for account, rest for name/address).
 */
function parseCustomerLines(fieldContent: string): { account?: string; nameAddress: string[] } {
  if (!fieldContent) return { nameAddress: [] };

  const lines = fieldContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let account: string | undefined;
  const nameAddress: string[] = [];

  for (const line of lines) {
    if (line.startsWith('/') && !account) {
      account = line.substring(1).trim();
    } else {
      nameAddress.push(line);
    }
  }

  return { account, nameAddress };
}

/**
 * Formats currency amounts with standard decimal points and symbol.
 */
export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Deterministically generates a valid UUIDv4 from a seed string.
 */
function generateFallbackUETR(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex.slice(0, 8)}-481e-42a0-84bf-${hex.slice(0, 12).padEnd(12, 'a')}`;
}
