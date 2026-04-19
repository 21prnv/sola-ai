import { useQuery } from '@tanstack/react-query'
import { Github, Star } from 'lucide-react'

import { Button } from './ui/Button'

const REPO_URL = 'https://github.com/21prnv/sola-ai'
const API_URL = 'https://api.github.com/repos/21prnv/sola-ai'

function formatStars(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return count.toString()
}

export function GitHubStarsButton() {
  const { data: stars } = useQuery({
    queryKey: ['github-stars', '21prnv/sola-ai'],
    queryFn: async () => {
      const res = await fetch(API_URL)
      if (!res.ok) throw new Error('Failed to fetch repo')
      const json = (await res.json()) as { stargazers_count: number }
      return json.stargazers_count
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="h-8 gap-1.5 px-2"
      aria-label="Star Sola-AI on GitHub"
    >
      <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
        <Github className="w-4 h-4" />
        {stars !== undefined && (
          <span className="inline-flex items-center gap-1 text-xs tabular-nums">
            <Star className="w-3 h-3" />
            {formatStars(stars)}
          </span>
        )}
      </a>
    </Button>
  )
}
