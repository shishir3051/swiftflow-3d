/**
 * Utility for formatting and pretty-printing raw or streamed XML documents.
 */

export function formatXml(xml: string): string {
  if (!xml || typeof xml !== 'string') return '';

  let formatted = '';
  let indent = 0;
  const tab = '  ';

  // Normalize existing whitespace between tags
  const cleanXml = xml
    .replace(/>\s*</g, '><')
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/\n/g, ' '))
    .trim();

  // Insert line breaks between tags
  const splitXml = cleanXml.replace(/(>)(<)(\/*)/g, '$1\n$2$3');
  const lines = splitXml.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Closing tag: decrease indent before adding
    if (line.match(/^<\//)) {
      indent = Math.max(0, indent - 1);
    }

    formatted += tab.repeat(indent) + line + '\n';

    // Opening tag that is not self-closing and does not contain closing tag on same line
    if (
      line.match(/^<[a-zA-Z0-9_:-]+(\s+[^>]*?)?>$/) &&
      !line.endsWith('/>') &&
      !line.startsWith('<?')
    ) {
      indent++;
    }
  }

  return formatted.trim();
}

export function downloadXmlFile(xmlContent: string, filename = 'pacs.008.001.08.xml') {
  if (typeof window === 'undefined') return;
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
