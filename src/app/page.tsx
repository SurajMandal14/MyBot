import { Button } from "@/components/ui/button";
import { LayoutDashboard, BookOpen, Github, Rocket } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 relative">
      <main className="flex flex-col items-center justify-center text-center space-y-6">
        <div className="mb-2 flex items-center justify-center rounded-full bg-primary/10 p-4">
          <Rocket className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tighter text-foreground sm:text-5xl md:text-6xl font-headline">
          Welcome to NextStart
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
          This is your starting point for a new Next.js application, thoughtfully designed with a clean, modern UI. Get ready to build something amazing.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          <Link href="#" passHref>
            <Button size="lg" className="transition-transform duration-300 hover:scale-105 shadow-md hover:shadow-lg">
              <LayoutDashboard className="mr-2 h-5 w-5" />
              Go to Dashboard
            </Button>
          </Link>
          <Link href="#" passHref>
            <Button size="lg" variant="secondary" className="transition-transform duration-300 hover:scale-105 shadow-md hover:shadow-lg">
              <BookOpen className="mr-2 h-5 w-5" />
              Read the Docs
            </Button>
          </Link>
          <Link href="https://github.com" passHref target="_blank" rel="noopener noreferrer">
            <Button size="lg" variant="ghost" className="transition-transform duration-300 hover:scale-105">
              <Github className="mr-2 h-5 w-5" />
              View on GitHub
            </Button>
          </Link>
        </div>
      </main>
      <footer className="absolute bottom-6 text-center text-sm text-muted-foreground">
        <p>Powered by Next.js & ShadCN/UI</p>
      </footer>
    </div>
  );
}
