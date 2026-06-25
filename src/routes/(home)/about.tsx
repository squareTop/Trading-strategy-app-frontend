import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(home)/about')({
  component: AboutPage,
})

function AboutPage() {
  return <h1>About Page, version 0.0.4</h1>
}