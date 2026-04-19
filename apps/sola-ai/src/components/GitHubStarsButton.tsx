import { Github } from 'lucide-react'

import { Button } from './ui/Button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/Tooltip'

const REPO_URL = 'https://github.com/21prnv/sola-ai'

export function GitHubStarsButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label="Star Sola-AI on GitHub">
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            <Github className="w-4 h-4" />
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Star on GitHub</TooltipContent>
    </Tooltip>
  )
}
