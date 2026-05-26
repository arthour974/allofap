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
      <Sidebar className="hidden md:flex" />

      <div className="flex min-h-screen min-w-0 flex-col md:ml-64">
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
          <img
            src="/logo-allofap.png"
            alt="AlloFAP"
            className="h-8 w-auto max-w-[100px] object-contain"
          />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto h-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
