import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Desktop Sidebar — fixed, full viewport height */}
      <Sidebar className="hidden md:flex" />

      {/* Main Content — offset by sidebar width on desktop */}
      <div className="flex min-h-screen min-w-0 flex-col md:ml-64">
        {/* Mobile Header */}
        <header className="relative z-10 flex h-16 shrink-0 items-center border-b bg-card px-4 shadow-sm md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <Sidebar embedded className="h-full w-full" />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2 text-lg font-bold">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-xs font-bold text-primary-foreground">
              FAP
            </div>
            FAP Expert
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto h-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
