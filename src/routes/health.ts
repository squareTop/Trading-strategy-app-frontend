import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/health')({
  server: {
    handlers: {
      GET: async () => {
        return new Response('OK', {
          status: 200,
          headers: {
            'Content-Type': 'text/plain',
          },
        })
      },
    },
  },
})
