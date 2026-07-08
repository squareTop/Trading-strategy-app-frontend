import { createFileRoute } from '@tanstack/react-router'
import { chat, toServerSentEventsResponse, chatParamsFromRequest } from '@tanstack/ai'
import { openRouterText } from '@tanstack/ai-openrouter'

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

        let params
        try {
          params = await chatParamsFromRequest(request)
        } catch {
          return new Response(
            JSON.stringify({ error: 'Invalid request format' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }

        const adapter = openRouterText('deepseek/deepseek-chat')

        const stream = chat({
          adapter,
          messages: params.messages,
          systemPrompts: [
            'You are a financial analyst. Given an investment thesis, identify the '
            + 'publicly-traded instruments (stocks or ETFs) most directly relevant to '
            + 'expressing or testing it.\n\n'
            + 'Return ONLY a JSON array of standard US exchange ticker symbols, at most '
            + '20 tickers, no prose, no explanation. '
            + 'Example: ["AAPL", "NVDA", "SMH"]',
          ],
          modelOptions: { temperature: 0.1, maxCompletionTokens: 1024 },
        })

        return toServerSentEventsResponse(stream)
      },
    },
  },
})