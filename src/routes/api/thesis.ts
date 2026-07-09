import { createFileRoute } from '@tanstack/react-router'
import { chat, toServerSentEventsResponse } from '@tanstack/ai'
import { openRouterText } from '@tanstack/ai-openrouter'
import { TickerExtractionSchema } from '#/lib/thesis-schema'

export const Route = createFileRoute('/api/thesis')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!process.env.OPENROUTER_API_KEY) {
          return new Response(
            JSON.stringify({ error: 'OPENROUTER_API_KEY not configured on server' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }

        let body: { messages?: { role: 'user'; content: string }[]; max_tickers?: number }
        try {
          body = await request.json()
        } catch {
          return new Response(
            JSON.stringify({ error: 'Invalid request body' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }

        if (!body.messages || !Array.isArray(body.messages)) {
          return new Response(
            JSON.stringify({ error: 'messages field is required' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }

        const maxTickers = Math.max(1, Math.min(body.max_tickers ?? 20, 20))

        const adapter = openRouterText('deepseek/deepseek-v4-flash')

        const stream = chat({
          adapter,
          messages: body.messages as any,
          systemPrompts: [
            'You are a financial analyst. Given an investment thesis, identify the '
            + 'publicly-traded instruments (stocks or ETFs) most directly relevant to '
            + `expressing or testing it. Return at most ${maxTickers} tickers. `
            + 'Prefer the most liquid, directly-exposed names.',
          ],
          outputSchema: TickerExtractionSchema,
          stream: true,
          modelOptions: { temperature: 0.1, maxCompletionTokens: 1024 },
        })

        return toServerSentEventsResponse(stream)
      },
    },
  },
})