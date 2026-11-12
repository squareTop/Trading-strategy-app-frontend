import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { scoreboardV2QueryOptions } from '../../lib/scoreboard'
import ScoreboardSkeleton from '../../components/skeletons/ScoreboardSkeleton'
import ScoreboardView from '../../components/scoreboard/ScoreboardView'

// 2026-11-12 (Scoreboard Rebuild): rewritten in place. One card per live strategy
// version and direction from GET /api/scoreboard/v2 (every figure computed on the
// server), retired strategies below. The old page (pipeline roll-up, ROI, trade
// tables) and GET /api/scoreboard are deleted.

export const Route = createFileRoute('/(home)/scoreboard')({
  head: () => ({
    meta: [
      { title: 'Strategy Scoreboard | FoxelSignal' },
      {
        name: 'description',
        content: 'Live forward-test record of each FoxelSignal strategy version: mean net R per trade with its 95% range against the backtest, win rate, worst losing run, drawdown and open trades.',
      },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(scoreboardV2QueryOptions).catch(() => { })
  },
  pendingComponent: ScoreboardSkeleton,
  pendingMs: 50,
  pendingMinMs: 300,
  component: ScoreboardPage,
})

function ScoreboardPage() {
  const { data, isLoading, error, refetch } = useQuery(scoreboardV2QueryOptions)
  return <ScoreboardView data={data} isLoading={isLoading} error={error} refetch={refetch} />
}
