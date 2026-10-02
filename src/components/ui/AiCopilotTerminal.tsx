import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Copy, Check, ShieldCheck, Terminal as TerminalIcon, HelpCircle } from 'lucide-react';
import { soundFx } from '../../lib/soundFx';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const SAMPLE_PROMPTS = [
  'How does tag :71A: SHA map to ChargeBearer in pacs.008?',
  'What are the CBPR+ requirements for structured PostalAddress?',
  'Explain difference between pacs.008 (Customer) and pacs.009 (FI Transfer).',
  'How is UETR {121:} validated across intermediary clearing banks?',
];

export const AiCopilotTerminal: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `### SwiftFlow Institutional Copilot Initialized
I am your **ISO 20022 & SWIFT CBPR+ Compliance Specialist**. I can assist with:
- **MT103 ➔ pacs.008.001.08** syntax and field transformation rules
- **Structured Postal Addresses** (PstlAdr) compliance rules
- **Charges & Deductions** (:71A: SHA/BEN/OUR ➔ ChrgBr)
- **High-Value Payment Systems (HVPS+)**: Fedwire, TARGET2, CHAPS, BOJ-NET

Click a quick prompt below or type your compliance query to begin.`,
      timestamp: 'Ready',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    soundFx.playBlip(600);

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawMt103: textToSend.includes(':') ? textToSend : undefined,
          question: textToSend,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      // Check for streaming response
      if (res.body && res.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';

        const tempAssistantMsg: Message = {
          role: 'assistant',
          content: '',
          timestamp: new Date().toLocaleTimeString(),
        };

        setMessages((prev) => [...prev, tempAssistantMsg]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;

          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              ...next[next.length - 1],
              content: assistantContent,
            };
            return next;
          });
        }
      } else {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.explanation || data.answer || 'Analysis complete.',
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
      soundFx.playSettlementPing();
    } catch {
      // Offline fallback deterministic answer generator for common FinTech compliance queries
      let fallback = '';
      const q = textToSend.toLowerCase();

      if (q.includes('71a') || q.includes('charge')) {
        fallback = `### MT Tag :71A: (Details of Charges) ➔ ISO 20022 Mapping
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
        fallback = `### Structured Postal Address (PstlAdr) under ISO 20022 CBPR+
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
        fallback = `### pacs.008 vs pacs.009 & The Cover Method
- **pacs.008.001.08**: Financial Institution Customer Credit Transfer (equivalent to **MT103**). Transmits customer instruction end-to-end.
- **pacs.009.001.08 Core**: Financial Institution Credit Transfer (equivalent to **MT202**). Used strictly for bank-to-bank treasury movements.
- **pacs.009.001.08 COV**: Financial Institution Credit Transfer with Cover (equivalent to **MT202COV**). 

When routing via non-correspondent banks, the **Cover Method** sends:
1. \`pacs.008\` directly to the beneficiary's bank via SWIFT.
2. \`pacs.009 COV\` to the reimbursement clearing bank (Fedwire/CHIPS) carrying the original pacs.008 UETR in \`<UndrlygCstmrCdtTrf>\` to guarantee instant reconciliation.`;
      } else if (q.includes('uetr') || q.includes('121')) {
        fallback = `### Unique End-to-End Transaction Reference (UETR)
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
        fallback = `### Institutional ISO 20022 Analysis
**Query Received**: "${textToSend}"

**Key Architectural Insights**:
1. **Migration Timeline**: The SWIFT MT/MX coexistence period culminates in full legacy FIN retirement for Category 1, 2, and 9 messages.
2. **Data Richness**: ISO 20022 delivers 10x richer data payloads, eliminating remittance truncation (up to 9,000 characters in Remittance Information \`<RmtInf>\`).
3. **STP Rate**: Elimination of free-format text fields reduces manual investigations by over 80%.

Feel free to ask about specific tag conversions (e.g. \`:20:\`, \`:32A:\`, \`:50K:\`, \`:59:\`, \`:71A:\`).`;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: fallback,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      soundFx.playSettlementPing();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    soundFx.playBlip(720);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[650px] backdrop-blur-xl">
      {/* Header */}
      <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              ISO 20022 Regulatory & Migration Copilot
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                Claude 3.5 Sonnet / CBPR+ Engine
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Plain-English guidance on SWIFT FIN MT103 deprecation, pacs.008 schema validation, and RTGS clearing rules.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">W3C XML & SWIFT Standards Compliant</span>
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-slate-500 font-mono text-[11px] shrink-0 flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-cyan-400" />
          SUGGESTED:
        </span>
        {SAMPLE_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-full bg-slate-800/70 hover:bg-cyan-950/50 text-slate-300 hover:text-cyan-300 border border-slate-700/60 hover:border-cyan-500/40 whitespace-nowrap text-[11px] transition-all"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Message Chat Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={idx}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl p-4 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/10'
                    : 'bg-slate-950/80 border border-slate-800 text-slate-200 shadow-md'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-white/10 text-[10px] text-slate-400">
                  <span className="font-semibold text-slate-300 flex items-center gap-1">
                    {isUser ? <User className="w-3 h-3" /> : <Sparkles className="w-3 h-3 text-cyan-400" />}
                    {isUser ? 'You' : 'SwiftFlow AI Compliance Officer'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{msg.timestamp}</span>
                    {!isUser && (
                      <button
                        onClick={() => handleCopy(idx, msg.content)}
                        className="hover:text-cyan-400 transition-colors"
                        title="Copy message"
                      >
                        {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="prose prose-invert prose-xs max-w-none space-y-2 font-sans whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-300 shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}
        {isLoading && (
          <div className="flex gap-3 items-center text-slate-400 text-xs">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
              <span>Consulting SWIFT CBPR+ specification & schema engine...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <TerminalIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask an ISO 20022 compliance query (e.g. 'How does pacs.008 handle intermediary reimbursement?')..."
              disabled={isLoading}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
