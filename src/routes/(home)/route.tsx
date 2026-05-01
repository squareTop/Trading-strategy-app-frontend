import Footer from '#/components/Footer'
import Header from '#/components/Header'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(home)')({
  component: HomeLayout,
})

function HomeLayout() {
  return (
    <>
      <Header />

      <main>
        <Outlet />
      </main>

      <Footer />
    </>
  )
}