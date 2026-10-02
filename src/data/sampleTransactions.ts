import type { PaymentArcData } from '../types/swift';

export const SAMPLE_TRANSACTIONS: PaymentArcData[] = [
  {
    id: 'tx-nyc-lon-01',
    reference: 'FT26100290018',
    uetr: '4f7b2a19-90d3-481e-84bf-9c7811ef42a0',
    sourceHubId: 'nyc',
    targetHubId: 'lon',
    sourceCity: 'New York',
    targetCity: 'London',
    sourceBank: 'Simulated Manhattan Trust Bank (SIM)',
    targetBank: 'Simulated London Interbank Clearing (SIM)',
    senderBic: 'USNYUS33XXX',
    receiverBic: 'GB2LGB2LXXX',
    currency: 'USD',
    amount: 14250000.0,
    formattedAmount: '$14,250,000.00 USD',
    status: 'IN_FLIGHT',
    latencyMs: 142,
    description: 'Corporate treasury cross-border liquidity transfer for international bond coupon settlement.',
    isoType: 'pacs.008.001.08',
    mt103Raw: `{1:F01USNYUS33AXXX0001000001}{2:I103GB2LGB2LXXXXN}{3:{108:FT26100290018}{121:4f7b2a19-90d3-481e-84bf-9c7811ef42a0}}{4:
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
-}`,
  },
  {
    id: 'tx-fra-tky-02',
    reference: 'EUR20261002441',
    uetr: '8e1c6b30-e381-490f-b1e7-2b814d3f8902',
    sourceHubId: 'fra',
    targetHubId: 'tky',
    sourceCity: 'Frankfurt',
    targetCity: 'Tokyo',
    sourceBank: 'Simulated Rhine Settlement Node (SIM)',
    targetBank: 'Simulated Tokyo Chuo Credit (SIM)',
    senderBic: 'DEFFDEFFXXX',
    receiverBic: 'JPJTJPJTXXX',
    currency: 'EUR',
    amount: 8750000.5,
    formattedAmount: '€8,750,000.50 EUR',
    status: 'SETTLED',
    latencyMs: 198,
    description: 'Automotive precision sensor manufacturing component shipment payment with customs clearing code.',
    isoType: 'pacs.008.001.08',
    mt103Raw: `{1:F01DEFFDEFFBXXX0002000002}{2:I103JPJTJPJTXXXXN}{3:{108:EUR20261002441}{121:8e1c6b30-e381-490f-b1e7-2b814d3f8902}}{4:
:20:EUR20261002441
:23B:CRED
:32A:261002EUR8750000,50
:50K:/DE89370400440532013000
BAVARIA OPTOELECTRONICS GMBH
MAINZER LANDSTRASSE 180
60327 FRANKFURT AM MAIN DE
:52A:DEFFDEFFXXX
:57A:JPJTJPJTXXX
:59:/JP88000192837465012938
SHIBUYA ROBOTICS GROUP LTD
3-1-1 MARUNOUCHI, CHIYODA-KU
TOKYO 100-0005 JP
:70:/ROC/PO-98214-SENSORS
ROBOTICS DRIVE CONTROLLERS
:71A:OUR
-}`,
  },
  {
    id: 'tx-sin-zrh-03',
    reference: 'SGD90827361552',
    uetr: 'd21498a3-2287-43f1-b998-c1726a8d7122',
    sourceHubId: 'sin',
    targetHubId: 'zrh',
    sourceCity: 'Singapore',
    targetCity: 'Zurich',
    sourceBank: 'Simulated Lion City Settlement (SIM)',
    targetBank: 'Simulated Swiss Interbank Alpine (SIM)',
    senderBic: 'SGSGSGSGXXX',
    receiverBic: 'CHZZCHZZXXX',
    currency: 'CHF',
    amount: 5120000.0,
    formattedAmount: 'CHF 5,120,000.00',
    status: 'SETTLED',
    latencyMs: 165,
    description: 'Pharmaceutical active ingredient licensing escrow milestone completion payment.',
    isoType: 'pacs.008.001.08',
    mt103Raw: `{1:F01SGSGSGSGAXXX0003000003}{2:I103CHZZCHZZXXXXN}{3:{108:SGD90827361552}{121:d21498a3-2287-43f1-b998-c1726a8d7122}}{4:
:20:SGD90827361552
:23B:CRED
:32A:261002CHF5120000,00
:50K:/SG990001234567890123
PACIFIC BIO-INNOVATIONS PTE LTD
10 MARINA BOULEVARD #24-01
SINGAPORE 018983 SG
:52A:SGSGSGSGXXX
:57A:CHZZCHZZXXX
:59:/CH9300762011623852951
HELVETIA PHARMA RESEARCH AG
BAHNHOFSTRASSE 45
8001 ZURICH CH
:70:/PHARMA/ESCROW-PHASE-3
VACCINE ADJUVANT CLINICAL TRIAL
:71A:SHA
-}`,
  },
  {
    id: 'tx-dxb-nyc-04',
    reference: 'DXB88192039401',
    uetr: '3a4f910e-c284-482a-a92e-19d85e7b301c',
    sourceHubId: 'dxb',
    targetHubId: 'nyc',
    sourceCity: 'Dubai',
    targetCity: 'New York',
    sourceBank: 'Simulated Emirates Clearing (SIM)',
    targetBank: 'Simulated Federal Reserve & Atlantic (SIM)',
    senderBic: 'AEDAAEDAXXX',
    receiverBic: 'USNYUS33XXX',
    currency: 'USD',
    amount: 22800000.0,
    formattedAmount: '$22,800,000.00 USD',
    status: 'IN_FLIGHT',
    latencyMs: 182,
    description: 'Renewable solar infrastructure turbine delivery contract installment.',
    isoType: 'pacs.008.001.08',
    mt103Raw: `{1:F01AEDAAEDAAXXX0004000004}{2:I103USNYUS33XXXXN}{3:{108:DXB88192039401}{121:3a4f910e-c284-482a-a92e-19d85e7b301c}}{4:
:20:DXB88192039401
:23B:CRED
:32A:261002USD22800000,00
:50K:/AE07033000001122334455
GULF SOLAR GENERATION PJSC
AL SAADA TOWER, LEVEL 18
DUBAI DIFC AE
:52A:AEDAAEDAXXX
:57A:USNYUS33XXX
:59:/US450000000123456789
CONSTELLATION CLEAN ENERGY CORP
700 LOUISIANA STREET, STE 1400
HOUSTON, TX 77002 US
:70:/SOLAR/PHASE-2-TURBINES
INVOICE GCC-2026-9904
:71A:SHA
-}`,
  },
  {
    id: 'tx-hkg-syd-05',
    reference: 'HK26100288301',
    uetr: '5d9a241b-419f-4f76-bc39-81a6c429fe55',
    sourceHubId: 'hkg',
    targetHubId: 'syd',
    sourceCity: 'Hong Kong',
    targetCity: 'Sydney',
    sourceBank: 'Simulated Victoria Liquidity (SIM)',
    targetBank: 'Simulated Southern Cross Settlement (SIM)',
    senderBic: 'HKHHHKHHXXX',
    receiverBic: 'AU2SAU2SXXX',
    currency: 'AUD',
    amount: 3400000.0,
    formattedAmount: 'A$3,400,000.00 AUD',
    status: 'SETTLED',
    latencyMs: 125,
    description: 'Maritime freight cargo vessel container leasing quarterly settlement.',
    isoType: 'pacs.008.001.08',
    mt103Raw: `{1:F01HKHHHKHHAXXX0005000005}{2:I103AU2SAU2SXXXXN}{3:{108:HK26100288301}{121:5d9a241b-419f-4f76-bc39-81a6c429fe55}}{4:
:20:HK26100288301
:23B:CRED
:32A:261002AUD3400000,00
:50K:/HK08001200003344556677
EAST ASIA PACIFIC LOGISTICS LTD
TWO EXCHANGE SQUARE, CONNAUGHT PL
CENTRAL HONG KONG HK
:52A:HKHHHKHHXXX
:57A:AU2SAU2SXXX
:59:/AU66000012345678
OCEANIC MARITIME FLEET PTY
480 QUEEN STREET
BRISBANE QLD 4000 AU
:70:/FREIGHT/Q4-CHARTER-44
VESSEL LEASE CONTRACT 2026
:71A:OUR
-}`,
  },
  {
    id: 'tx-lon-fra-06',
    reference: 'LONFRA26100201',
    uetr: 'f189b4e2-6638-4e89-a417-70e9a11c8d43',
    sourceHubId: 'lon',
    targetHubId: 'fra',
    sourceCity: 'London',
    targetCity: 'Frankfurt',
    sourceBank: 'Simulated Sterling Settlement (SIM)',
    targetBank: 'Simulated Rhine Settlement Node (SIM)',
    senderBic: 'GB2LGB2LXXX',
    receiverBic: 'DEFFDEFFXXX',
    currency: 'EUR',
    amount: 19500000.0,
    formattedAmount: '€19,500,000.00 EUR',
    status: 'IN_FLIGHT',
    latencyMs: 48,
    description: 'Interbank overnight commercial paper clearing and liquidity rebalancing.',
    isoType: 'pacs.008.001.08',
    mt103Raw: `{1:F01GB2LGB2LAXXX0006000006}{2:I103DEFFDEFFXXXXN}{3:{108:LONFRA26100201}{121:f189b4e2-6638-4e89-a417-70e9a11c8d43}}{4:
:20:LONFRA26100201
:23B:CRED
:32A:261002EUR19500000,00
:50K:/GB44MIDL40051512345678
CANARY WHARF CLEARING CORP
25 BANK STREET, CANARY WHARF
LONDON E14 5JP GB
:52A:GB2LGB2LXXX
:57A:DEFFDEFFXXX
:59:/DE55500105174433221100
CONTINENTAL LIQUIDITY AG
TAUNUSANLAGE 8
60329 FRANKFURT AM MAIN DE
:70:/MM/OVERNIGHT-REBALANCE
OVERNIGHT CP SETTLEMENT
:71A:SHA
-}`,
  },
];
