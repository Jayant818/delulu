import { Providers } from "@/components/Providers";

// Everything under (app) is behind the wallet gate; the landing page at "/" is not.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
