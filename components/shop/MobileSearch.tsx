"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import SearchBar from "./SearchBar";

export default function MobileSearch() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Search className="h-5 w-5" />
          <span className="sr-only">Buscar productos</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="top" className="h-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Buscar Productos</SheetTitle>
        </SheetHeader>
        <SearchBar 
          onResultClick={() => setOpen(false)} 
          autoFocus={true}
        />
      </SheetContent>
    </Sheet>
  );
}