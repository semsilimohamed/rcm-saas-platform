// Shared wrapper for legal pages. Not named layout.tsx, so Next.js does not apply it automatically
// and no page imports it (currently unused).

/**
 * Plain wrapper for legal page content.
 * @param props.children - Page content.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return children;
}