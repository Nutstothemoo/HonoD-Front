
import { Toaster } from "sonner"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <main className="flex flex-col items-center justify-between pt-24">
        {children}
      <Toaster />
      </main>
    </>
  )
}