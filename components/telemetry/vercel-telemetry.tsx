import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

export function VercelTelemetry() {
  if (process.env.NEXT_PUBLIC_DISABLE_VERCEL_ANALYTICS === "1") {
    return null
  }

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
