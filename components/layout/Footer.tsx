export function Footer() {
  return (
    <footer className="w-full border-t bg-muted/50 py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Antigravity Barber. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Prague, Czech Republic</span>
        </div>
      </div>
    </footer>
  )
}
