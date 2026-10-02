import React, { useState, useMemo } from 'react';
import { Copy, Check, Download, FileCode, WrapText } from 'lucide-react';
import { formatXml, downloadXmlFile } from '../../lib/xmlFormatter';
import { soundFx } from '../../lib/soundFx';

interface XmlViewerProps {
  xml: string;
  isStreaming?: boolean;
}

export const XmlViewer: React.FC<XmlViewerProps> = ({ xml, isStreaming = false }) => {
  const [copied, setCopied] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);
  const [autoBeautify, setAutoBeautify] = useState(true);

  const displayXml = useMemo(() => {
    if (!xml) return '';
    // If not streaming or if user wants beautified XML, run formatter
    if (autoBeautify) {
      try {
        const formatted = formatXml(xml);
        return formatted || xml;
      } catch {
        return xml;
      }
    }
    return xml;
  }, [xml, autoBeautify]);

  const lines = useMemo(() => {
    return displayXml.split('\n');
  }, [displayXml]);

  const handleCopy = () => {
    if (!displayXml) return;
    navigator.clipboard.writeText(displayXml);
    setCopied(true);
    soundFx.playBlip(720);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!displayXml) return;
    downloadXmlFile(displayXml, 'pacs.008.001.08.xml');
    soundFx.playSettlementPing();
  };

  // Helper to colorize XML syntax lines
  const renderHighlightedLine = (line: string) => {
    // Regex matches tags, attributes, text
    // E.g. <Tag attr="val">text</Tag>
    const parts = line.split(/(<[^>]+>)/g);

    return parts.map((part, pIdx) => {
      if (!part) return null;

      if (part.startsWith('<!--')) {
        return <span key={pIdx} className="text-slate-500 italic">{part}</span>;
      }

      if (part.startsWith('<?')) {
        return <span key={pIdx} className="text-purple-400 font-semibold">{part}</span>;
      }

      if (part.startsWith('</')) {
        // Closing tag </TagName>
        const tagName = part.slice(2, -1);
        return (
          <span key={pIdx} className="text-slate-500">
            &lt;/<span className="text-cyan-400 font-medium">{tagName}</span>&gt;
          </span>
        );
      }

      if (part.startsWith('<')) {
        // Opening tag <TagName attr="val">
        const tagContent = part.slice(1, -1);
        const match = tagContent.match(/^([a-zA-Z0-9_:-]+)([\s\S]*)$/);
        if (match) {
          const tagName = match[1];
          const rest = match[2];
          return (
            <span key={pIdx} className="text-slate-500">
              &lt;<span className="text-cyan-400 font-medium">{tagName}</span>
              {renderAttributes(rest)}
              &gt;
            </span>
          );
        }
        return <span key={pIdx} className="text-cyan-400">{part}</span>;
      }

      // Inner tag text content
      return <span key={pIdx} className="text-slate-200 font-medium">{part}</span>;
    });
  };

  const renderAttributes = (attrStr: string) => {
    if (!attrStr) return null;
    const attrRegex = /([a-zA-Z0-9_:-]+)=(".*?"|'.*?'|[^\s>]+)/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = attrRegex.exec(attrStr)) !== null) {
      if (match.index > lastIndex) {
        elements.push(attrStr.slice(lastIndex, match.index));
      }
      elements.push(
        <span key={match.index} className="ml-1">
          <span className="text-amber-300 font-normal">{match[1]}</span>=
          <span className="text-emerald-300">{match[2]}</span>
        </span>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < attrStr.length) {
      elements.push(attrStr.slice(lastIndex));
    }

    return elements;
  };

  return (
    <div className="w-full flex flex-col h-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner font-mono text-xs xml-viewer-box">
      {/* Top Toolbar */}
      <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <FileCode className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-300">ISO 20022 pacs.008.001.08</span>
          <span className="text-slate-600">|</span>
          <span>{lines.length} lines</span>
          <span className="text-slate-600">|</span>
          <span>{(displayXml.length / 1024).toFixed(1)} KB</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Format / Beautify Toggle */}
          <button
            onClick={() => setAutoBeautify(!autoBeautify)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
              autoBeautify
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white bg-slate-800/60'
            }`}
            title="Auto-indent and format XML"
          >
            Beautify: {autoBeautify ? 'ON' : 'OFF'}
          </button>

          {/* Wrap lines toggle */}
          <button
            onClick={() => setWrapLines(!wrapLines)}
            className={`p-1.5 rounded transition-all ${
              wrapLines
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white bg-slate-800/60'
            }`}
            title="Toggle word wrap"
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          {/* Download XML */}
          <button
            onClick={handleDownload}
            disabled={!displayXml}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium transition-all disabled:opacity-40"
            title="Download pacs.008 XML file"
          >
            <Download className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Copy XML */}
          <button
            onClick={handleCopy}
            disabled={!displayXml}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[11px] font-semibold transition-all disabled:opacity-40 shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-300" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy XML</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Display Area with Line Numbers */}
      <div className="flex-1 overflow-auto max-h-[460px] p-3 leading-relaxed">
        {displayXml ? (
          <div className="table w-full border-collapse">
            {lines.map((line, idx) => (
              <div key={idx} className="table-row hover:bg-slate-900/60 transition-colors">
                {/* Line Number Gutter */}
                <div className="table-cell pr-4 text-right select-none text-slate-600 text-[11px] w-10 font-mono">
                  {idx + 1}
                </div>
                {/* Line Code */}
                <div
                  className={`table-cell pl-2 font-mono text-[11.5px] ${
                    wrapLines ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                  }`}
                >
                  {renderHighlightedLine(line)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full py-16 flex flex-col items-center justify-center text-slate-500 text-center">
            {isStreaming ? (
              <div className="flex items-center gap-2 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Streaming pacs.008 XML nodes...</span>
              </div>
            ) : (
              <span>No XML generated yet. Convert an MT103 to inspect XML output.</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
