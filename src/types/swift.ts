export interface SWIFTTag {
  tag: string;
  qualifier?: string;
  value: string;
  name: string;
  description: string;
  isoPath: string;
  raw: string;
}

export interface ParsedMT103 {
  senderBic: string;
  receiverBic: string;
  sessionNumber?: string;
  sequenceNumber?: string;
  messageType: '103' | '103+';
  uetr: string; // Unique End-to-End Transaction Reference (Block 3 Tag 121)
  serviceIdentifier?: string; // Tag 111 (e.g., 001 for gpi)
  transactionReference: string; // Tag 20
  bankOperationCode: string; // Tag 23B
  valueDate: string; // Tag 32A (YYMMDD)
  currency: string; // Tag 32A (e.g. USD, EUR, GBP)
  amount: number; // Tag 32A
  formattedAmount: string;
  orderingCustomer: {
    account?: string; // Tag 50A/50K
    nameAddress: string[];
  };
  orderingInstitution?: {
    bic?: string; // Tag 52A
    nameAddress?: string[];
  };
  sendersCorrespondent?: {
    bic?: string; // Tag 53A
  };
  receiversCorrespondent?: {
    bic?: string; // Tag 54A
  };
  accountWithInstitution?: {
    bic?: string; // Tag 57A
    nameAddress?: string[];
  };
  beneficiary: {
    account?: string; // Tag 59/59A
    nameAddress: string[];
  };
  remittanceInformation?: string; // Tag 70
  detailsOfCharges: 'OUR' | 'BEN' | 'SHA'; // Tag 71A
  senderCharges?: string; // Tag 71F
  receiverCharges?: string; // Tag 71G
  rawText: string;
  tags: SWIFTTag[];
  parseErrors: string[];
}

export interface MTtoMXMapping {
  mtTag: string;
  mtFieldName: string;
  mxPath: string;
  mxElement: string;
  rule: string;
  legacyLimitNote?: string;
}

export interface PaymentArcData {
  id: string;
  reference: string;
  uetr: string;
  sourceHubId: string;
  targetHubId: string;
  sourceCity: string;
  targetCity: string;
  sourceBank: string;
  targetBank: string;
  senderBic: string;
  receiverBic: string;
  currency: string;
  amount: number;
  formattedAmount: string;
  status: 'SETTLED' | 'IN_FLIGHT' | 'PENDING';
  latencyMs: number;
  mt103Raw: string;
  description: string;
  isoType: 'pacs.008.001.08';
}
