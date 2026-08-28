// PostgREST's `.or()` filter syntax uses commas and parentheses as separators,
// so strip them from user input before interpolating into a filter string.
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[(),]/g, ' ').trim();
}
