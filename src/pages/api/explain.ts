import type { APIRoute } from 'astro';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { checkRateLimit } from '../../lib/rateLimiter';

export const prerender = false;

const ExplainSchema = z.object({
  question: z.string().min(2).max(4000),
  rawMt103: z.string().max(8000).optional(),
});

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(ip, 20, 60000);

  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: `Rate limit reached. Please retry in ${rateLimit.resetSeconds}s.`,
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON payload' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const result = ExplainSchema.safeParse(body);
  if (!result.success) {
    return new Response(
      JSON.stringify({ error: 'Validation Error', issues: result.error.issues }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { question, rawMt103 } = result.data;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });
      const prompt = `You are a Principal Financial Architect and global expert in SWIFT payments, ISO 20022 migration (CBPR+, HVPS+, pacs.008, pacs.009), and interbank clearing systems.

User Question: ${question}
${rawMt103 ? `Context MT103:\n${rawMt103}` : ''}

Provide a concise, authoritative, professional response with markdown headers, code snippets where relevant, and specific regulatory context.`;

      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('\n');

      return new Response(
        JSON.stringify({ explanation: text }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch {
      // Fallback if Anthropic call fails
    }
  }

  // Deterministic Expert Engine Fallback
  let explanation = '';
  const q = question.toLowerCase();

  if (q.includes('71a') || q.includes('charge')) {
    explanation = `### MT103 Tag :71A: (Details of Charges) ➔ ISO 20022 Mapping
In legacy **MT103**, field **:71A:** specifies who bears transaction fees:
- \`SHA\` (Shared): Debtor pays sending bank charges; Creditor pays receiving bank charges.
- \`OUR\` (All charges borne by debtor): Debtor covers all routing fees.
- \`BEN\` (All charges borne by beneficiary): Deducted from settlement amount.

In **pacs.008.001.08**, this maps to **\`<CdtTrfTxInf><ChrgBr>\`**:
\`\`\`xml
<ChrgBr>SHA</ChrgBr> <!-- Supported values: DEBT (OUR), CRED (BEN), SHAR (SHA), SLEV (Service Level) -->
\`\`\`
Under CBPR+ rules, \`SLEV\` is used if charges follow an RTGS bilateral clearing agreement.`;
  } else if (q.includes('address') || q.includes('pstladr') || q.includes('structured')) {
    explanation = `### Structured Postal Address (PstlAdr) under ISO 20022 CBPR+
Legacy **MT103 Tag :50K: and :59:** allowed up to 4 lines of 35 unstructured characters, causing high false-positive AML hits.

Under **ISO 20022**, addresses MUST be structured:
\`\`\`xml
<PstlAdr>
  <StrtNm>Wall Street</StrtNm>
  <BldgNb>28</BldgNb>
  <PstCd>10005</PstCd>
  <TwnNm>New York</TwnNm>
  <CtrySubDvsn>NY</CtrySubDvsn>
  <Ctry>US</Ctry>
</PstlAdr>
\`\`\`
**Mandatory Enforcement**: From November 2026, SWIFT mandates structured addresses. Hybrid addresses (unstructured \`<AdrLine>\`) will trigger NAK rejects on cross-border corridors.`;
  } else if (q.includes('pacs.009') || q.includes('cover')) {
    explanation = `### pacs.008 vs pacs.009 & The Cover Method
- **pacs.008.001.08**: Financial Institution Customer Credit Transfer (equivalent to **MT103**). Transmits customer instruction end-to-end.
- **pacs.009.001.08 Core**: Financial Institution Credit Transfer (equivalent to **MT202**). Used strictly for bank-to-bank treasury movements.
- **pacs.009.001.08 COV**: Financial Institution Credit Transfer with Cover (equivalent to **MT202COV**). 

When routing via non-correspondent banks, the **Cover Method** sends:
1. \`pacs.008\` directly to the beneficiary's bank via SWIFT.
2. \`pacs.009 COV\` to the reimbursement clearing bank (Fedwire/CHIPS) carrying the original pacs.008 UETR in \`<UndrlygCstmrCdtTrf>\` to guarantee instant reconciliation.`;
  } else if (q.includes('uetr') || q.includes('121')) {
    explanation = `### Unique End-to-End Transaction Reference (UETR)
The **UETR** is a 36-character hexadecimal UUIDv4 specified in SWIFT Block 3:
\`\`\`
{3:{121:c56a4180-65aa-42ec-a945-5fd21dec0538}}
\`\`\`
In **ISO 20022 pacs.008**, it is a mandatory element:
\`\`\`xml
<PmtId>
  <UETR>c56a4180-65aa-42ec-a945-5fd21dec0538</UETR>
</PmtId>
\`\`\`
Every intermediary bank in the chain MUST carry this exact UETR unaltered to allow real-time **SWIFT GPI** tracking from dispatch to settlement.`;
  } else {
    explanation = `### Institutional Compliance Guidance
**Topic**: ${question}

**ISO 20022 Migration Highlights**:
1. **Coexistence Cutoff**: November 2025 marked the beginning of mandatory MX processing across major market infrastructures.
2. **Rich Remittance Information (\`<RmtInf>\`)**: Unlocks up to 9,000 characters of invoice metadata and line-item details.
3. **Legal Entity Identifiers (LEI)**: Supported in \`<Id><OrgId><LEI>\` for deterministic corporate identity verification.`;
  }

  return new Response(
    JSON.stringify({ explanation }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
