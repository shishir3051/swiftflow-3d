export interface XmlValidationResult {
  isValid: boolean;
  errors: string[];
  rootElement?: string;
  totalTagsCount: number;
}

/**
 * Validates XML well-formedness according to W3C XML 1.0 specifications.
 * Checks tag nesting, matching closing tags, attribute quoting, and well-formed headers.
 */
export function validateXmlWellFormedness(xmlString: string): XmlValidationResult {
  const errors: string[] = [];
  let totalTagsCount = 0;
  let rootElement: string | undefined;

  const trimmed = xmlString.trim();
  if (!trimmed) {
    return { isValid: false, errors: ['XML document is completely empty.'], totalTagsCount: 0 };
  }

  // Check XML declaration if present
  if (trimmed.startsWith('<?xml')) {
    const declEnd = trimmed.indexOf('?>');
    if (declEnd === -1) {
      errors.push('Unterminated XML declaration (missing "?>").');
    }
  }

  // Tokenizer for XML comments, CDATA, opening/closing tags
  const tagRegex =
    /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<([a-zA-Z0-9_\-:]+)((?:\s+[^>]*?)?)\s*(\/?)>|<\/([a-zA-Z0-9_\-:]+)\s*>/g;

  const stack: { tagName: string; index: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(trimmed)) !== null) {
    const fullMatch = match[0];

    // Skip comments and CDATA
    if (fullMatch.startsWith('<!--') || fullMatch.startsWith('<![CDATA[')) {
      continue;
    }

    const isClosing = fullMatch.startsWith('</');
    const isSelfClosing = match[3] === '/';
    const openTagName = match[1];
    const rawAttrs = match[2];
    const closeTagName = match[4];

    totalTagsCount++;

    if (isClosing) {
      if (stack.length === 0) {
        errors.push(`Unexpected closing tag </${closeTagName}> without corresponding opening tag.`);
      } else {
        const last = stack.pop()!;
        if (last.tagName !== closeTagName) {
          errors.push(
            `Mismatched closing tag: expected </${last.tagName}>, but found </${closeTagName}>.`
          );
        }
      }
    } else if (openTagName) {
      // Validate attributes for unquoted values
      if (rawAttrs && rawAttrs.trim().length > 0) {
        // Find any key=value where value does not start with quote
        const unquotedAttrRegex = /([a-zA-Z0-9_\-:]+)\s*=\s*(?!["'])([^>\s]+)/g;
        let attrMatch: RegExpExecArray | null;
        while ((attrMatch = unquotedAttrRegex.exec(rawAttrs)) !== null) {
          errors.push(
            `Attribute "${attrMatch[1]}" in tag <${openTagName}> must be quoted with single or double quotes.`
          );
        }
      }

      if (!rootElement) {
        rootElement = openTagName;
      }

      if (!isSelfClosing) {
        stack.push({ tagName: openTagName, index: match.index });
      }
    }
  }

  if (stack.length > 0) {
    const unclosedNames = stack.map((s) => `<${s.tagName}>`).join(', ');
    errors.push(`Unclosed XML tag(s): ${unclosedNames}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    rootElement,
    totalTagsCount,
  };
}
