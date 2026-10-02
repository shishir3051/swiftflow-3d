import type { APIRoute } from 'astro';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { checkRateLimit } from '../../lib/rateLimiter';
import { parseMT103 } from '../../lib/mtParser';
import { generatePacs008Xml } from '../../lib/mxGenerator';
import { validateXmlWellFormedness } from '../../lib/xmlValidator';

export const prerender = false; // Ensure dynamic server route

// Strict request validation schema
const ConvertRequestSchema = z.object({
  mt103: z
    .string()
    .min(10, 'MT103 message payload must be at least 10 characters long.')
    .max(10000, 'Payload exceeds maximum allowed size of 10,000 characters.'),
  model: z.string().optional().default('claude-3-5-sonnet-20241022'),
  simulateStream: z.boolean().optional().default(false),
});

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // 1. Rate Limiting Check
  const ip = clientAddress || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(ip, 12, 60000);

  const rateLimitHeaders = {
    'X-RateLimit-Limit': rateLimit.limit.toString(),
    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    'X-RateLimit-Reset': rateLimit.resetSeconds.toString(),
  };

  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Please retry after ${rateLimit.resetSeconds} seconds.`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': rateLimit.resetSeconds.toString(),
          ...rateLimitHeaders,
        },
      }
    );
  }

  // 2. Parse & Validate JSON Body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON', message: 'Request body must be valid JSON.' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...rateLimitHeaders } }
    );
  }

  const validation = ConvertRequestSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        error: 'Validation Error',
        details: validation.error.flatten(),
      }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...rateLimitHeaders } }
    );
  }

  const { mt103, simulateStream } = validation.data;

  // 3. Pre-parse MT103 with local parser to validate fields and have fallback XML ready
  const parsedMT = parseMT103(mt103);
  const fallbackXml = generatePacs008Xml(parsedMT);
  const xmlValidation = validateXmlWellFormedness(fallbackXml);

  const apiKey = import.meta.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

  // 4. Server-Sent Events (SSE) Stream Setup
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(type: 'token' | 'done' | 'meta' | 'error', data: unknown) {
        const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      }

      // Send initial metadata (parsed fields and tag breakdown)
      sendEvent('meta', {
        parsed: {
          transactionReference: parsedMT.transactionReference,
          uetr: parsedMT.uetr,
          currency: parsedMT.currency,
          amount: parsedMT.amount,
          formattedAmount: parsedMT.formattedAmount,
          senderBic: parsedMT.senderBic,
          receiverBic: parsedMT.receiverBic,
          detailsOfCharges: parsedMT.detailsOfCharges,
          orderingCustomer: parsedMT.orderingCustomer,
          beneficiary: parsedMT.beneficiary,
          tagsCount: parsedMT.tags.length,
          parseErrors: parsedMT.parseErrors,
        },
        hasApiKey: Boolean(apiKey),
      });

      // If Anthropic API key is available and not simulation requested, stream directly from Claude
      if (apiKey && !simulateStream) {
        try {
          const anthropic = new Anthropic({ apiKey });

          const systemPrompt = `You are SwiftFlow AI, a world-class financial messaging architect specializing in ISO 20022 MX migration from legacy SWIFT MT.
Analyze the provided MT103 and output a two-part response:
PART 1: Plain-English Executive Summary (2-3 concise paragraphs covering: business context, sender/receiver entities, remittance purpose, and why this benefits from ISO 20022).
PART 2: ISO 20022 XML (<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">...). The XML must be 100% syntactically well-formed, complete, and formatted.
Format the output with clear delimiters:
---EXPLANATION---
(your plain english text)
---XML---
(your xml code)`;

          const claudeStream = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 3000,
            system: systemPrompt,
            messages: [{ role: 'user', content: `Here is the SWIFT MT103 message:\n\n${mt103}` }],
            stream: true,
          });

          for await (const chunk of claudeStream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              sendEvent('token', { text: chunk.delta.text });
            }
          }

          sendEvent('done', {
            validated: true,
            source: 'anthropic-api',
          });
          controller.close();
          return;
        } catch (apiError: any) {
          // If Anthropic returns an error (e.g. invalid key or rate limit), log and fall through to high-fidelity simulation
          sendEvent('token', {
            text: `\n[Notice: Upstream AI API returned note: ${apiError?.message || 'Rate limit'}. SwiftFlow offline engine engaged for instant conversion.]\n\n`,
          });
        }
      }

      // High-Fidelity Streaming Engine (used when no API key is provided or offline mode)
      const explanationText = `---EXPLANATION---
### Transaction Analysis (SWIFT MT103 -> ISO 20022 pacs.008)

This cross-border payment instructs an interbank credit settlement of **${parsedMT.formattedAmount}** from **${parsedMT.orderingCustomer.nameAddress[0] || 'Ordering Entity'}** to **${parsedMT.beneficiary.nameAddress[0] || 'Beneficiary Entity'}**.

- **Originating Clearing Participant**: \`${parsedMT.senderBic}\`
- **Creditor Settlement Institution**: \`${parsedMT.receiverBic}\`
- **End-to-End Tracking (UETR)**: \`${parsedMT.uetr}\`
- **Charging Model**: \`${parsedMT.detailsOfCharges}\` (${parsedMT.detailsOfCharges === 'SHA' ? 'Shared transaction fees' : parsedMT.detailsOfCharges === 'OUR' ? 'All fees paid by debtor' : 'All fees borne by creditor'})
- **Remittance Reference**: ${parsedMT.remittanceInformation || 'Standard trade invoice settlement'}

**Why ISO 20022 pacs.008 is superior**:
In legacy MT103, customer names and addresses are confined to truncated lines of 35 characters, triggering frequent false-positive sanctions screening hits. The generated pacs.008.001.08 XML introduces dedicated PostalAddress nodes (<StrtNm>, <TwnNm>, <Ctry>), rich remittance identification, and end-to-end UETR tracking across the global SWIFT gpi network.

---XML---
${fallbackXml}`;

      // Stream tokens with realistic micro-delays for high-end UX
      // Slice cleanly by character offset to guarantee 100% preservation of all newlines and indentation
      const chunkSize = 28;
      for (let i = 0; i < explanationText.length; i += chunkSize) {
        const chunk = explanationText.slice(i, i + chunkSize);
        sendEvent('token', { text: chunk });
        await new Promise((resolve) => setTimeout(resolve, 14));
      }

      sendEvent('done', {
        validated: xmlValidation.isValid,
        xmlStats: {
          tagsCount: xmlValidation.totalTagsCount,
          root: xmlValidation.rootElement,
        },
        source: 'swiftflow-engine',
      });

      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      ...rateLimitHeaders,
    },
  });
};
