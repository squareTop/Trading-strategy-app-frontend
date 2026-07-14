import { createFileRoute } from '@tanstack/react-router'
import { chat, toServerSentEventsResponse } from '@tanstack/ai'
import { openRouterText } from '@tanstack/ai-openrouter'
import { z } from 'zod'
import { AI_MODEL } from '#/lib/config'

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

        const adapter = openRouterText(AI_MODEL)

        const DynamicTickerExtractionSchema = z.object({
          tickers: z
            .array(z.string())
            .max(maxTickers)
            .meta({ description: `Standard US exchange ticker symbols most relevant to the thesis (maximum of ${maxTickers} items)` }),
        })

        const stream = chat({
          adapter,
          messages: body.messages as any,
          systemPrompts: [
            'You are a financial analyst. Given an investment thesis, identify all '
            + 'publicly-traded instruments (stocks or ETFs) most directly relevant to '
            + `expressing or testing it. You should attempt to find as many highly relevant `
            + `tickers as possible (aiming for up to ${maxTickers} if they exist), but `
            + `strictly do not exceed ${maxTickers} tickers. `
            + `CRITICAL: The tickers array MUST NOT contain more than ${maxTickers} elements. `
            + 'Prefer the most liquid, directly-exposed names.',
          ],
          outputSchema: DynamicTickerExtractionSchema,
          stream: true,
          modelOptions: {
            temperature: 0.1,
            reasoning: {
              effort: "none"
            }
          },
        })

        return toServerSentEventsResponse(stream)
      },
    },
  },
})