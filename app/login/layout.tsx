
import { Toaster } from "sonner"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <main className="flex flex-col items-center justify-between">
        {children}
      <Toaster />
      </main>
    </>
  )
}