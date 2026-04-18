import { Check, CircleAlert, Loader2 } from 'lucide-react'

function StatusTextComponent({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-muted-foreground">{children}</div>
}

StatusTextComponent.Loading = function Loading({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin" />
      <span>{children}</span>
    </div>
  )
}

StatusTextComponent.Error = function Error({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
      <CircleAlert className="size-3.5" />
      <span>{children}</span>
    </div>
  )
}

StatusTextComponent.Success = function Success({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-primary/8 px-3 py-1.5 text-sm text-muted-foreground">
      <div className="flex size-4 items-center justify-center rounded-full bg-primary/15">
        <Check className="size-2.5 text-primary" strokeWidth={3} />
      </div>
      <span>{children}</span>
    </div>
  )
}

StatusTextComponent.WithIcon = function WithIcon({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 text-sm">{children}</div>
}

StatusTextComponent.Icon = function Icon({
  children,
  icon: IconComponent,
  className,
}: {
  children?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}) {
  if (IconComponent) {
    return <IconComponent className={className} />
  }
  return <span className={className}>{children}</span>
}

StatusTextComponent.Text = function Text({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>
}

export const StatusText = StatusTextComponent
