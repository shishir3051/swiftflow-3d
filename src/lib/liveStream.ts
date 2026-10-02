import type { PaymentArcData } from '../types/swift';
import { parseMT103 } from './mtParser';
import { generatePacs008Xml } from './mxGenerator';
import { soundFx } from './soundFx';

export interface LiveTransaction extends PaymentArcData {
  progress: number; // 0 to 1
  clearingSystem: string;
  senderCustomer: string;
  receiverCustomer: string;
  settlementLatencySec: number;
  clearingTimeFormatted: string;
}

export type StreamSpeed = 0 | 1 | 2 | 5;

export interface CorridorPreset {
  id: string;
  name: string;
  description: string;
  center: [number, number, number];
  fromHub: string;
  toHub: string;
}

export const CORRIDOR_PRESETS: CorridorPreset[] = [
  {
    id: 'transatlantic',
    name: 'Transatlantic Corridor',
    description: 'New York (Fedwire / CHIPS) ↔ London (CHAPS / BACS)',
    center: [0.8, 1.2, 2.5],
    fromHub: 'New York',
    toHub: 'London',
  },
  {
    id: 'eurosystem',
    name: 'Eurosystem TARGET2',
    description: 'Frankfurt (Bundesbank) ↔ Paris (Banque de France)',
    center: [0.4, 1.5, 2.2],
    fromHub: 'Frankfurt',
    toHub: 'Paris',
  },
  {
    id: 'apac',
    name: 'Asia-Pacific Liquidity Hub',
    description: 'Tokyo (BOJ-NET) ↔ Singapore (MEPS+)',
    center: [-2.2, 0.9, 1.4],
    fromHub: 'Tokyo',
    toHub: 'Singapore',
  },
  {
    id: 'gulf-chf',
    name: 'Swiss-Gulf Capital Gateway',
    description: 'Zurich (SIC) ↔ Dubai (UAEFTS)',
    center: [-0.6, 1.1, 2.3],
    fromHub: 'Zurich',
    toHub: 'Dubai',
  },
];

interface BankNodeInfo {
  hubId: string;
  bic: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  clearingSystem: string;
}

export const INSTITUTIONAL_HUBS: Record<string, BankNodeInfo> = {
  CHASUS33: {
    hubId: 'nyc',
    bic: 'CHASUS33XXX',
    name: 'JPMorgan Chase Bank, N.A.',
    city: 'New York',
    country: 'United States',
    lat: 40.7128,
    lng: -74.006,
    clearingSystem: 'Fedwire / CHIPS',
  },
  BARCGB22: {
    hubId: 'lon',
    bic: 'BARCGB22XXX',
    name: 'Barclays Bank PLC',
    city: 'London',
    country: 'United Kingdom',
    lat: 51.5074,
    lng: -0.1278,
    clearingSystem: 'CHAPS / RTGS',
  },
  DEUTDEDD: {
    hubId: 'fra',
    bic: 'DEUTDEDDXXX',
    name: 'Deutsche Bank AG',
    city: 'Frankfurt',
    country: 'Germany',
    lat: 50.1109,
    lng: 8.6821,
    clearingSystem: 'TARGET2 / EBA EURO1',
  },
  BNPAFRPP: {
    hubId: 'par',
    bic: 'BNPAFRPPXXX',
    name: 'BNP Paribas SA',
    city: 'Paris',
    country: 'France',
    lat: 48.8566,
    lng: 2.3522,
    clearingSystem: 'TARGET2 / Paris SEPA',
  },
  BOTKJPJT: {
    hubId: 'tyo',
    bic: 'BOTKJPJTXXX',
    name: 'MUFG Bank, Ltd.',
    city: 'Tokyo',
    country: 'Japan',
    lat: 35.6762,
    lng: 139.6503,
    clearingSystem: 'BOJ-NET FXYCS',
  },
  DBSSSGSG: {
    hubId: 'sin',
    bic: 'DBSSSGSGXXX',
    name: 'DBS Bank Ltd',
    city: 'Singapore',
    country: 'Singapore',
    lat: 1.3521,
    lng: 103.8198,
    clearingSystem: 'MEPS+ RTGS',
  },
  UBSWCHZH: {
    hubId: 'zur',
    bic: 'UBSWCHZHXXX',
    name: 'UBS Switzerland AG',
    city: 'Zurich',
    country: 'Switzerland',
    lat: 47.3769,
    lng: 8.5417,
    clearingSystem: 'SIC RTGS',
  },
  EBILAEAD: {
    hubId: 'dxb',
    bic: 'EBILAEADXXX',
    name: 'Emirates NBD PJSC',
    city: 'Dubai',
    country: 'United Arab Emirates',
    lat: 25.2048,
    lng: 55.2708,
    clearingSystem: 'UAEFTS RTGS',
  },
  CTBAAU2S: {
    hubId: 'syd',
    bic: 'CTBAAU2SXXX',
    name: 'Commonwealth Bank of Australia',
    city: 'Sydney',
    country: 'Australia',
    lat: -33.8688,
    lng: 151.2093,
    clearingSystem: 'RBA RITS',
  },
  BSBRBRSP: {
    hubId: 'sao',
    bic: 'BSBRBRSPXXX',
    name: 'Banco Santander Brasil S.A.',
    city: 'São Paulo',
    country: 'Brazil',
    lat: -23.5505,
    lng: -46.6333,
    clearingSystem: 'STR BACEN RTGS',
  },
  CITIUS33: {
    hubId: 'nyc',
    bic: 'CITIUS33XXX',
    name: 'Citibank, N.A.',
    city: 'New York',
    country: 'United States',
    lat: 40.7128,
    lng: -74.006,
    clearingSystem: 'CHIPS / Fedwire',
  },
  HBUKGB41: {
    hubId: 'lon',
    bic: 'HBUKGB41XXX',
    name: 'HSBC Bank plc',
    city: 'London',
    country: 'United Kingdom',
    lat: 51.5074,
    lng: -0.1278,
    clearingSystem: 'CHAPS / Faster Payments',
  },
};

const CORRIDOR_PAIRS: [string, string, string, number, number][] = [
  ['CHASUS33', 'BARCGB22', 'USD', 1200000, 24500000],
  ['DEUTDEDD', 'BNPAFRPP', 'EUR', 850000, 18200000],
  ['BOTKJPJT', 'DBSSSGSG', 'JPY', 150000000, 1800000000],
  ['UBSWCHZH', 'EBILAEAD', 'CHF', 2500000, 31000000],
  ['BARCGB22', 'DEUTDEDD', 'GBP', 950000, 14200000],
  ['CITIUS33', 'BOTKJPJT', 'USD', 3400000, 42000000],
  ['DBSSSGSG', 'CHASUS33', 'USD', 4100000, 29000000],
  ['HBUKGB41', 'BSBRBRSP', 'GBP', 620000, 8900000],
  ['BNPAFRPP', 'UBSWCHZH', 'EUR', 1800000, 15000000],
  ['CTBAAU2S', 'DBSSSGSG', 'AUD', 2200000, 19500000],
];

const CORPORATE_ENTITIES = [
  { sender: 'Apple Treasury Operations', receiver: 'Foxconn Industrial Tech' },
  { sender: 'Siemens AG Global Liquidity', receiver: 'Alstom Transport SA' },
  { sender: 'Toyota Motor North America', receiver: 'Denso Corporation HQ' },
  { sender: 'Glencore International AG', receiver: 'ADNOC Distribution PJSC' },
  { sender: 'Pfizer Global Capital Ireland', receiver: 'BioNTech SE Mainz' },
  { sender: 'LVMH Moët Hennessy Paris', receiver: 'Harrods International London' },
  { sender: 'Microsoft Global Finance', receiver: 'Sony Interactive Entertainment' },
  { sender: 'AstraZeneca Global Treasury', receiver: 'CSL Behring Melbourne' },
];

function generateUETR(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatRawMt103(
  senderBic: string,
  receiverBic: string,
  currency: string,
  amount: number,
  uetr: string,
  senderCust: string,
  receiverCust: string
): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const dateStr = `${yy}${mm}${dd}`;
  const amountStr = amount.toFixed(2).replace('.', ',');
  const ref = `SWF${Math.floor(10000000 + Math.random() * 90000000)}`;

  return `{1:F01${senderBic.padEnd(12, 'A')}0000000000}{2:I103${receiverBic.padEnd(12, 'X')}N}{3:{121:${uetr}}}{4:
:20:${ref}
:23B:CRED
:32A:${dateStr}${currency}${amountStr}
:50K:/US${Math.floor(1000000000 + Math.random() * 9000000000)}
${senderCust.toUpperCase()}
GLOBAL TREASURY DEPT
:59:/GB${Math.floor(1000000000 + Math.random() * 9000000000)}
${receiverCust.toUpperCase()}
BENEFICIARY ACCOUNT
:70:INVOICE ${Math.floor(100000 + Math.random() * 900000)} / SETTLEMENT
:71A:SHA
-}`;
}

export class LiveTransactionStream {
  private transactions: LiveTransaction[] = [];
  private speed: StreamSpeed = 1;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<(txs: LiveTransaction[]) => void> = new Set();
  private totalSettledVolumeUsd: number = 38450120000;
  private totalSettledCount: number = 18452;

  constructor() {
    this.seedInitialTransactions();
    this.startStreaming();
  }

  private seedInitialTransactions() {
    for (let i = 0; i < 6; i++) {
      const tx = this.createRandomTransaction(i * 0.15 + 0.1);
      this.transactions.push(tx);
    }
  }

  public getTransactions(): LiveTransaction[] {
    return [...this.transactions];
  }

  public getMetrics() {
    return {
      totalVolumeUsd: this.totalSettledVolumeUsd,
      settledCount: this.totalSettledCount,
      inFlightCount: this.transactions.filter((t) => t.status === 'IN_FLIGHT').length,
      clearingCount: this.transactions.filter((t) => t.status === 'PENDING').length,
      tps: (1420 + Math.sin(Date.now() / 5000) * 120).toFixed(0),
    };
  }

  public subscribe(cb: (txs: LiveTransaction[]) => void): () => void {
    this.listeners.add(cb);
    cb(this.getTransactions());
    return () => this.listeners.delete(cb);
  }

  private notify() {
    const list = this.getTransactions();
    this.listeners.forEach((cb) => cb(list));
  }

  public setSpeed(speed: StreamSpeed) {
    this.speed = speed;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.speed > 0) {
      this.startStreaming();
    }
    soundFx.playBlip(520);
  }

  public getSpeed(): StreamSpeed {
    return this.speed;
  }

  private createRandomTransaction(initialProgress = 0): LiveTransaction {
    const pair = CORRIDOR_PAIRS[Math.floor(Math.random() * CORRIDOR_PAIRS.length)];
    const sender = INSTITUTIONAL_HUBS[pair[0]];
    const receiver = INSTITUTIONAL_HUBS[pair[1]];
    const entity = CORPORATE_ENTITIES[Math.floor(Math.random() * CORPORATE_ENTITIES.length)];
    const uetr = generateUETR();

    const min = pair[3];
    const max = pair[4];
    const rawAmt = Math.floor(min + Math.random() * (max - min));
    const currency = pair[2];

    const rawMt103 = formatRawMt103(
      sender.bic,
      receiver.bic,
      currency,
      rawAmt,
      uetr,
      entity.sender,
      entity.receiver
    );

    const mtMsg = parseMT103(rawMt103);
    // generate pacs.008 XML
    generatePacs008Xml(mtMsg);

    const id = `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = new Date();
    const status: 'SETTLED' | 'IN_FLIGHT' | 'PENDING' =
      initialProgress >= 1 ? 'SETTLED' : initialProgress > 0.7 ? 'PENDING' : 'IN_FLIGHT';

    return {
      id,
      reference: mtMsg.transactionReference || id,
      uetr,
      sourceHubId: sender.hubId,
      targetHubId: receiver.hubId,
      sourceCity: sender.city,
      targetCity: receiver.city,
      sourceBank: sender.name,
      targetBank: receiver.name,
      senderBic: sender.bic,
      receiverBic: receiver.bic,
      currency,
      amount: rawAmt,
      formattedAmount: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(rawAmt),
      status,
      latencyMs: Math.round((1.8 + Math.random() * 2.2) * 1000),
      mt103Raw: rawMt103,
      description: `${entity.sender} ➔ ${entity.receiver}`,
      isoType: 'pacs.008.001.08',
      progress: initialProgress,
      clearingSystem: `${sender.clearingSystem} ➔ ${receiver.clearingSystem}`,
      senderCustomer: entity.sender,
      receiverCustomer: entity.receiver,
      settlementLatencySec: Number((1.8 + Math.random() * 2.2).toFixed(2)),
      clearingTimeFormatted: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} UTC`,
    };
  }

  private startStreaming() {
    const tickInterval = 250;

    this.intervalId = setInterval(() => {
      if (this.speed === 0) return;

      const step = 0.015 * this.speed;
      let stateChanged = false;

      // Update in-flight transactions
      this.transactions.forEach((tx) => {
        if (tx.status === 'IN_FLIGHT') {
          tx.progress += step;
          if (tx.progress >= 0.75) {
            tx.status = 'PENDING'; // Clearing status
          }
          stateChanged = true;
        } else if (tx.status === 'PENDING') {
          tx.progress += step * 0.8;
          if (tx.progress >= 1.0) {
            tx.progress = 1.0;
            tx.status = 'SETTLED';
            this.totalSettledCount += 1;
            const multiplier =
              tx.currency === 'JPY' ? 0.0068 : tx.currency === 'EUR' ? 1.08 : tx.currency === 'GBP' ? 1.3 : 1;
            this.totalSettledVolumeUsd += tx.amount * multiplier;
            soundFx.playSettlementPing();
          }
          stateChanged = true;
        }
      });

      // Maintain buffer
      if (this.transactions.length > 20) {
        const settledIndices = this.transactions
          .map((t, idx) => (t.status === 'SETTLED' ? idx : -1))
          .filter((i) => i !== -1);
        if (settledIndices.length > 10) {
          this.transactions.splice(settledIndices[0], 1);
          stateChanged = true;
        }
      }

      // Periodically spawn new transactions
      const activeInFlight = this.transactions.filter((t) => t.status === 'IN_FLIGHT').length;
      if (activeInFlight < 5 && Math.random() < 0.25 * this.speed) {
        const newTx = this.createRandomTransaction(0);
        this.transactions.unshift(newTx);
        stateChanged = true;
      }

      if (stateChanged) {
        this.notify();
      }
    }, tickInterval);
  }
}

let streamInstance: LiveTransactionStream | null = null;

export function getLiveTransactionStream(): LiveTransactionStream {
  if (!streamInstance) {
    streamInstance = new LiveTransactionStream();
  }
  return streamInstance;
}
