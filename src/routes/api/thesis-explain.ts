import { createFileRoute } from '@tanstack/react-router'
import { chat, toServerSentEventsResponse } from '@tanstack/ai'
import { openRouterText } from '@tanstack/ai-openrouter'
import type { UIMessage } from '@tanstack/ai-react'

export const Route = createFileRoute('/api/thesis-explain')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!process.env.OPENROUTER_API_KEY) {
          return new Response(
            JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }

        let body: { messages?: UIMessage[]; thesis?: string; coverage?: unknown[] }
        try {
          body = await request.json()
        } catch {
          return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 })
        }

        const thesis = body.thesis || '(not provided)'
        const coverage = body.coverage || []

        const stream = chat({
          adapter: openRouterText('deepseek/deepseek-v4-flash'),
          messages: body.messages || [],
          systemPrompts: [
            'You are a senior financial analyst reviewing automated trading signal results.',
            '',
            'The user submitted this investment thesis:',
            thesis,
            '',
            'The engine analyzed the following tickers (coverage data includes state, persistence, and reject reason):',
            JSON.stringify(coverage, null, 2),
            '',
            'No actionable signals fired. Write a brief analyst note (2-4 paragraphs) explaining:',
            '1. What market regime each ticker is in based on its state',
            '2. Why no entries triggered (common reasons: states in Avoid, mean reversion not due, trend not confirmed)',
            '3. Whether the thesis timing may be off or needs refinement',
            '4. What to watch for — conditions that would trigger entries',
            '',
            'Be specific, reference the actual tickers and states, and stay grounded in the data.',
          ],
          modelOptions: { temperature: 0.3, maxCompletionTokens: 1024 },
        })

        return toServerSentEventsResponse(stream)
      },
    },
  },
})