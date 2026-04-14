export function LoadingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-[typing-bounce_1.4s_ease-in-out_infinite]" />
          <div className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-[typing-bounce_1.4s_ease-in-out_0.2s_infinite]" />
          <div className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-[typing-bounce_1.4s_ease-in-out_0.4s_infinite]" />
        </div>
      </div>
    </div>
  )
}
