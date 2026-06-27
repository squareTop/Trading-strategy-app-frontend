import { createFileRoute, Outlet } from '@tanstack/react-router'
import Header from '#/components/Header'

export const Route = createFileRoute('/(home)')({
  component: HomeLayout,
})

function HomeLayout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  )
}