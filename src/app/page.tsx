import Dashboard from "@/components/dashboard";
import { TrafficCone } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-8">
        <TrafficCone className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">TrafficVision</h1>
      </header>
      <main>
        <Dashboard />
      </main>
    </div>
  );
}
