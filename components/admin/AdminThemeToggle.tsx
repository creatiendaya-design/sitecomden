"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAdminTheme, type AdminTheme } from "./AdminThemeProvider";

const OPTIONS: Array<{
  value: AdminTheme;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export function AdminThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useAdminTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Cambiar tema"
          className="relative h-9 w-9 rounded-full"
        >
          <Sun
            className={cn(
              "h-4 w-4 transition-all",
              resolvedTheme === "dark"
                ? "scale-0 -rotate-90 opacity-0"
                : "scale-100 rotate-0 opacity-100"
            )}
          />
          <Moon
            className={cn(
              "absolute h-4 w-4 transition-all",
              resolvedTheme === "dark"
                ? "scale-100 rotate-0 opacity-100"
                : "scale-0 rotate-90 opacity-0"
            )}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              "gap-2 text-sm",
              theme === value && "bg-accent text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {theme === value && (
              <span className="ml-auto text-xs text-muted-foreground">●</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
