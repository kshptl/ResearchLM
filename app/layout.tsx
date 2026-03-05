import "@xyflow/react/dist/style.css"
import "./globals.css"
import type { ReactNode } from "react"
import { VercelTelemetry } from "@/components/telemetry/vercel-telemetry"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

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
