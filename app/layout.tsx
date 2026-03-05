import "@xyflow/react/dist/style.css"
import "./globals.css"
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { VercelTelemetry } from "@/components/telemetry/vercel-telemetry"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
  "http://localhost:3000"

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "ResearchLM",
  description: "A node-based workspace for exploring ideas with LLMs.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <TooltipProvider>
            {children}
            <Toaster />
            <VercelTelemetry />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
