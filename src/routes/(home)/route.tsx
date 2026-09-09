import { createFileRoute, Outlet } from '@tanstack/react-router'
import Header from '#/components/Header'
import Footer from '#/components/Footer'

export const Route = createFileRoute('/(home)')({
  component: HomeLayout,
})

function HomeLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}