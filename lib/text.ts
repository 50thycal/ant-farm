export function normalizePunctuationSpacing(text: string): string {
  return text
    // remove spaces before common punctuation
    .replace(/\s+([,\.!?;:])/g, '$1')
    // remove spaces right after opening brackets
    .replace(/([\(\[\{])\s+/g, '$1')
    // remove spaces right before closing brackets
    .replace(/\s+([\)\]\}])/g, '$1')
    // collapse multiple spaces into one
    .replace(/\s{2,}/g, ' ')
    .trim()
}
