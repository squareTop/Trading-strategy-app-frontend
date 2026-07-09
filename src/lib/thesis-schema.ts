import { z } from 'zod'

export const TickerExtractionSchema = z.object({
  tickers: z
    .array(z.string())
    .max(20)
    .meta({ description: 'Standard US exchange ticker symbols most relevant to the thesis' }),
})

export type TickerExtraction = z.infer<typeof TickerExtractionSchema>

export const AnalystNoteSchema = z.object({
  summary: z
    .string()
    .meta({ description: 'One-paragraph summary of the analysis findings' }),
  tickerAssessments: z
    .array(
      z.object({
        ticker: z.string(),
        state: z.string(),
        assessment: z.string(),
      }),
    )
    .meta({ description: 'Per-ticker regime assessment explaining what state it is in and why' }),
  thesisTiming: z
    .string()
    .meta({ description: 'Assessment of whether the thesis timing is right or needs refinement' }),
  watchFor: z
    .string()
    .meta({ description: 'Conditions that would trigger entries — what to watch for' }),
})

export type AnalystNote = z.infer<typeof AnalystNoteSchema>
