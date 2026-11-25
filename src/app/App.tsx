import React from 'react';
import { ShoppingBag } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Smart Order Builder</h1>
        </div>
        <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-md font-mono">
          Step 00: Foundation
        </span>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full p-6">
        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-lg font-semibold mb-2">Project Foundation Initialized</h2>
          <p className="text-sm text-muted-foreground">
            Core stack ready: React 18, TypeScript (strict), Vite, Tailwind CSS, shadcn/ui foundation, TanStack Query, and Vitest.
          </p>
        </div>
      </main>
    </div>
  );
};

export default App;
