/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly ANTHROPIC_API_KEY?: string;
  readonly RATE_LIMIT_MAX_REQUESTS?: string;
  readonly RATE_LIMIT_WINDOW_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
