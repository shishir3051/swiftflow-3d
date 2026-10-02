import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  const hasKey = Boolean(import.meta.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY);

  return new Response(
    JSON.stringify({
      status: 'operational',
      service: 'SwiftFlow 3D API',
      version: '1.0.0',
      anthropicConfigured: hasKey,
      timestamp: new Date().toISOString(),
      standards: ['SWIFT MT103', 'ISO 20022 pacs.008.001.08', 'CBPR+'],
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
