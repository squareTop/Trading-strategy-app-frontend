import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(home)/about')({
  head: () => ({
    meta: [
      {
        title: 'About FoxelSignal | Quantitative Investing Intelligence',
      },
      {
        name: 'description',
        content: 'Learn about FoxelSignal institutional quantitative trading strategies, DCF valuation models, and automated execution pipelines.',
      },
    ],
  }),
  component: AboutPage,
})

function AboutPage() {
  return <div>
    <h1>About</h1>
    <p>Lorem, ipsum dolor sit amet consectetur adipisicing elit. Praesentium quos magni laboriosam officia, iste nam ipsa quas dolore repellat impedit, sed minima perspiciatis officiis sint? Provident voluptatem tempora nam laudantium!</p>
  </div>
}