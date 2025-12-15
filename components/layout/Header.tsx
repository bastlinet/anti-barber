import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold tracking-tight uppercase">Antigravity</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/#services" className="transition-colors hover:text-primary">Services</Link>
          <Link href="/#gallery" className="transition-colors hover:text-primary">Gallery</Link>
          <Link href="/#contact" className="transition-colors hover:text-primary">Contact</Link>
        </nav>
        <div className="flex items-center gap-4">
            <Button size="sm" className="font-bold bg-primary text-primary-foreground hover:bg-primary/90">Book Now</Button>
        </div>
      </div>
    </header>
  )
}
