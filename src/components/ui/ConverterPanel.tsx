import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { SAMPLE_TRANSACTIONS } from '../../data/sampleTransactions';
import { validateXmlWellFormedness } from '../../lib/xmlValidator';
import type { XmlValidationResult } from '../../lib/xmlValidator';

export const ConverterPanel: React.FC = () => {
  const [selectedTxId, setSelectedTxId] = useState<string>(SAMPLE_TRANSACTIONS[0].id);
  const [mtInput, setMtInput] = useState<string>(SAMPLE_TRANSACTIONS[0].mt103Raw);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamProgress, setStreamProgress] = useState<string>('');
  const [parsedMeta, setParsedMeta] = useState<any>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [xmlOutput, setXmlOutput] = useState<string>('');
  const [xmlValidation, setXmlValidation] = useState<XmlValidationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining: string; reset: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'explanation' | 'xml' | 'audit'>('explanation');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamBufferRef = useRef<string>('');

  // Listen to global load-converter events from the 3D globe / modal
  useEffect(() => {
    const handleLoadConverter = (e: CustomEvent<string>) => {
      setMtInput(e.detail);
      setExplanation('');
      setXmlOutput('');
      setXmlValidation(null);
      setErrorMessage(null);
    };

    window.addEventListener('swiftflow:load-converter' as any, handleLoadConverter as EventListener);
    return () => {
      window.removeEventListener('swiftflow:load-converter' as any, handleLoadConverter as EventListener);
    };
  }, []);

  const handleSelectSample = (txId: string) => {
    setSelectedTxId(txId);
    const tx = SAMPLE_TRANSACTIONS.find((t) => t.id === txId);
    if (tx) {
      setMtInput(tx.mt103Raw);
      setExplanation('');
      setXmlOutput('');
      setXmlValidation(null);
      setErrorMessage(null);
    }
  };

  const startConversion = async () => {
    if (!mtInput.trim()) {
      setErrorMessage('Please paste or select a SWIFT MT103 payload first.');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsStreaming(true);
    setErrorMessage(null);
    setExplanation('');
    setXmlOutput('');
    setXmlValidation(null);
    streamBufferRef.current = '';
    setStreamProgress('Initiating secure AI stream...');

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mt103: mtInput }),
        signal: abortController.signal,
      });

      // Capture rate limit headers
      const remaining = response.headers.get('X-RateLimit-Remaining');
      const reset = response.headers.get('X-RateLimit-Reset');
      if (remaining && reset) {
        setRateLimitInfo({ remaining, reset });
      }

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.message || `Server responded with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is not readable.');

      const decoder = new TextDecoder();
      let buffer = '';

      setStreamProgress('Receiving streaming tokens...');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          const eventMatch = line.match(/^event:\s*(\w+)/m);
          const dataMatch = line.match(/^data:\s*(.*)$/m);

          if (!eventMatch || !dataMatch) continue;

          const eventType = eventMatch[1];
          const eventData = JSON.parse(dataMatch[1]);

          if (eventType === 'meta') {
            setParsedMeta(eventData.parsed);
          } else if (eventType === 'token') {
            streamBufferRef.current += eventData.text;
            parseAccumulatedStream(streamBufferRef.current);
          } else if (eventType === 'done') {
            finalizeStream(streamBufferRef.current);
          } else if (eventType === 'error') {
            throw new Error(eventData.message || 'Stream error occurred');
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setErrorMessage(err.message || 'Failed to communicate with conversion service.');
    } finally {
      setIsStreaming(false);
      setStreamProgress('');
    }
  };

  const parseAccumulatedStream = (rawAccumulated: string) => {
    // Expected delimiters: ---EXPLANATION--- and ---XML---
    if (rawAccumulated.includes('---XML---')) {
      const parts = rawAccumulated.split('---XML---');
      const expl = parts[0].replace('---EXPLANATION---', '').trim();
      const xml = parts[1].trim();
      setExplanation(expl);
      setXmlOutput(xml);
    } else if (rawAccumulated.includes('---EXPLANATION---')) {
      setExplanation(rawAccumulated.replace('---EXPLANATION---', '').trim());
    } else {
      setExplanation(rawAccumulated);
    }
  };

  const finalizeStream = (finalText: string) => {
    parseAccumulatedStream(finalText);

    // Extract XML cleanly
    let finalXml = '';
    if (finalText.includes('---XML---')) {
      finalXml = finalText.split('---XML---')[1].trim();
    } else if (finalText.includes('<?xml') || finalText.includes('<Document') || finalText.includes('<BusMsg')) {
      const startIdx = Math.min(
        finalText.indexOf('<?xml') !== -1 ? finalText.indexOf('<?xml') : Infinity,
        finalText.indexOf('<BusMsg') !== -1 ? finalText.indexOf('<BusMsg') : Infinity,
        finalText.indexOf('<Document') !== -1 ? finalText.indexOf('<Document') : Infinity
      );
      if (startIdx !== Infinity) {
        finalXml = finalText.slice(startIdx).trim();
      }
    }

    if (finalXml) {
      setXmlOutput(finalXml);
      const validation = validateXmlWellFormedness(finalXml);
      setXmlValidation(validation);

      if (validation.isValid) {
        // Trigger subtle confetti celebration for verified conversion
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#06b6d4', '#10b981', '#3b82f6'],
        });
      }
    }
  };

  const handleCopyXml = () => {
    if (!xmlOutput) return;
    navigator.clipboard.writeText(xmlOutput);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div
      id="converter-section"
      className="relative w-full max-w-7xl mx-auto my-16 px-4 sm:px-6"
    >
      <div className="glass-card rounded-3xl border border-slate-700/80 p-6 md:p-10 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-800/40 text-cyan-300 text-xs font-mono mb-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>LIVE AI CONVERTER & PARSER ENGINE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              MT103 → ISO 20022 <span className="text-cyan-400">pacs.008</span> Studio
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Simulate enterprise SWIFT translation. Paste or select a legacy MT103 FIN message to stream an AI-assisted explanation and validated XML document token-by-token.
            </p>
          </div>

          {/* Rate Limit Badge */}
          {rateLimitInfo && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
              <span className="text-slate-400">API Quota:</span>
              <span className="text-cyan-300 font-bold">{rateLimitInfo.remaining} requests left</span>
              <span className="text-slate-500">({rateLimitInfo.reset}s reset)</span>
            </div>
          )}
        </div>

        {/* Preset Selector Bar */}
        <div className="relative z-10 flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-mono text-slate-400">Select Preset Corridor:</span>
          {SAMPLE_TRANSACTIONS.map((tx) => (
            <button
              key={`preset-${tx.id}`}
              onClick={() => handleSelectSample(tx.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                selectedTxId === tx.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {tx.sourceCity} → {tx.targetCity} ({tx.currency})
            </button>
          ))}
        </div>

        {/* Dual Column Layout: Input & Output */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: MT103 Input */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                <span className="w-2 h-2 rounded bg-amber-400" />
                Input: SWIFT MT103 FIN Payload
              </span>
              <span>{mtInput.length} chars</span>
            </div>

            <textarea
              value={mtInput}
              onChange={(e) => setMtInput(e.target.value)}
              placeholder="Paste raw SWIFT MT103 block payload ({1:...}{2:...}{4:...-})..."
              className="w-full h-80 lg:h-96 p-4 rounded-2xl bg-slate-950/90 border border-slate-800 focus:border-cyan-500 font-mono text-xs text-amber-300/90 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner"
              spellCheck={false}
              aria-label="SWIFT MT103 Input Textarea"
            />

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setMtInput('')}
                className="text-xs text-slate-500 hover:text-slate-300 font-mono transition-colors"
              >
                Clear Input
              </button>

              <button
                onClick={startConversion}
                disabled={isStreaming}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                  isStreaming
                    ? 'bg-cyan-700/50 text-slate-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transform hover:-translate-y-0.5'
                }`}
              >
                {isStreaming ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-cyan-200" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{streamProgress || 'Translating...'}</span>
                  </>
                ) : (
                  <>
                    <span>Convert & Stream ISO 20022</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Streamed Results & Tabs */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              {/* Output Tab Switches */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setActiveTab('explanation')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'explanation'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  AI Explanation
                </button>
                <button
                  onClick={() => setActiveTab('xml')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'xml'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  pacs.008 XML
                </button>
                {parsedMeta && (
                  <button
                    onClick={() => setActiveTab('audit')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      activeTab === 'audit'
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Parsed Meta
                  </button>
                )}
              </div>

              {/* XML Well-Formedness Badge */}
              {xmlValidation && (
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono ${
                    xmlValidation.isValid
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      xmlValidation.isValid ? 'bg-emerald-400' : 'bg-rose-400 animate-ping'
                    }`}
                  />
                  <span>
                    {xmlValidation.isValid
                      ? `Valid XML (${xmlValidation.totalTagsCount} tags)`
                      : 'Invalid XML Structure'}
                  </span>
                </div>
              )}
            </div>

            {/* Error Display */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs font-mono">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Main Output Box */}
            <div className="relative w-full h-80 lg:h-96 rounded-2xl bg-slate-950/90 border border-slate-800 p-4 overflow-y-auto font-mono text-xs leading-relaxed shadow-inner">
              {!explanation && !xmlOutput && !isStreaming && (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-slate-400 mb-1">AI Assistant Ready</p>
                  <p className="text-[11px] max-w-sm">
                    Click "Convert & Stream ISO 20022" to trigger token-by-token parsing, narrative analysis, and well-formed pacs.008 generation.
                  </p>
                </div>
              )}

              {/* Streaming Tab 1: AI Explanation */}
              {activeTab === 'explanation' && (
                <div className="prose prose-invert max-w-none text-slate-200 whitespace-pre-wrap font-sans text-xs sm:text-sm">
                  {explanation || (isStreaming ? 'Streaming analysis...' : '')}
                </div>
              )}

              {/* Streaming Tab 2: pacs.008 XML */}
              {activeTab === 'xml' && (
                <div className="relative">
                  {xmlOutput && (
                    <div className="sticky top-0 right-0 flex justify-end mb-2">
                      <button
                        onClick={handleCopyXml}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs border border-slate-700 transition-colors"
                      >
                        {copySuccess ? '✓ Copied' : 'Copy XML'}
                      </button>
                    </div>
                  )}
                  <pre className="text-emerald-400 overflow-x-auto">
                    {xmlOutput || (isStreaming ? 'Generating pacs.008 XML schema nodes...' : '')}
                  </pre>
                </div>
              )}

              {/* Tab 3: Parsed Meta */}
              {activeTab === 'audit' && parsedMeta && (
                <div className="space-y-3 font-mono text-xs">
                  <div className="text-cyan-400 font-bold border-b border-slate-800 pb-1">
                    Pre-clearing Metadata Snapshot
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">End-to-End Ref:</span>
                      <span className="text-white">{parsedMeta.transactionReference}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Settled Amount:</span>
                      <span className="text-emerald-300 font-bold">{parsedMeta.formattedAmount}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Originator BIC:</span>
                      <span className="text-white">{parsedMeta.senderBic}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Receiver BIC:</span>
                      <span className="text-white">{parsedMeta.receiverBic}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Charges (:71A:):</span>
                      <span className="text-cyan-300">{parsedMeta.detailsOfCharges}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Identified Tags:</span>
                      <span className="text-white">{parsedMeta.tagsCount} fields</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
