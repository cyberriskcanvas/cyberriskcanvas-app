// In Next.js App Router, route protection is handled by the server pages
// (auth() check + redirect) and middleware. This component is kept as a
// no-op client wrapper for legacy compatibility.
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
