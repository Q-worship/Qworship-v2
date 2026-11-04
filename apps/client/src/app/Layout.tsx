import React from "react";

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-y-auto bg-muted/20">
        {/* min-h-0 so a child that manages its own scrolling (AppShell) gets a
            bounded box instead of growing past it. */}
        <div className="flex-1 min-h-0 relative">{children}</div>
      </main>
    </div>
  );
};
