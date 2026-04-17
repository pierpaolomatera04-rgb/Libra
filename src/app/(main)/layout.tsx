import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import MobileTabBar from '@/components/layout/MobileTabBar'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)] pb-16 md:pb-0">
        {children}
      </main>
      <Footer />
      <MobileTabBar />
    </>
  )
}
