import { createFileRoute } from '@tanstack/react-router'
import { chat, toServerSentEventsResponse } from '@tanstack/ai'
import { openRouterText } from '@tanstack/ai-openrouter'
import { AnalystNoteSchema } from '#/lib/thesis-schema'
import { AI_MODEL } from '#/lib/ai-config'

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

        let body: { thesis?: string; coverage?: unknown[] }
        try {
          body = await request.json()
        } catch {
          return new Response(JSON.stringify({ error: 'Invalid request' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const thesis = body.thesis || '(not provided)'
        const coverage = body.coverage || []

        const stream = chat({
          adapter: openRouterText(AI_MODEL),
          messages: [
            {
              role: 'user',
              content:
                'Review the following thesis analysis results and write an analyst note.\n\n'
                + `Thesis:\n${thesis}\n\n`
                + `Coverage data (ticker, state, persistence, reject reason):\n${JSON.stringify(coverage, null, 2)}`,
            },
          ],
          systemPrompts: [
            'You are a senior financial analyst reviewing automated trading signal results. '
            + 'No actionable signals fired. Assess each ticker\'s market regime based on its '
            + 'state name, explain why entries did not trigger, evaluate thesis timing, and '
            + 'identify what conditions would change the picture. Be specific and grounded '
            + 'in the coverage data — reference actual tickers and states.',
          ],
          outputSchema: AnalystNoteSchema,
          stream: true,
          modelOptions: {
            temperature: 0.3, maxCompletionTokens: 1024, reasoning: {
              effort: "none"
            }
          },
        })

        return toServerSentEventsResponse(stream)
      },
    },
  },
})