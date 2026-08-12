import { Button, buttonVariants } from "@/components/button";
import { cn } from "@/lib/utils";
import { authClient } from "@bmhk-2026/client/auth-client";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface StaffNavbarProps {
  readonly role?: string | null;
  readonly userName?: string | null;
}

function StaffNavbar({ role, userName }: StaffNavbarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin";

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onError: (error) => {
          toast.error(error.error.message || error.error.statusText);
        },
        onSuccess: async () => {
          queryClient.clear();
          await navigate({ to: "/login" });
        },
      },
    });
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
        <Link to="/dashboard" className="font-semibold text-sm">
          Staff
        </Link>
        <nav className="flex items-center gap-1">
          <Link to="/dashboard" className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}>
            Dashboard
          </Link>
          {isAdmin ? (
            <Link to="/users" className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}>
              <ShieldCheck />
              Admin
            </Link>
          ) : null}
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-3">
          <div className="hidden min-w-0 text-right text-sm sm:block">
            <p className="truncate font-medium">{userName ?? "Staff"}</p>
            <p className="truncate text-muted-foreground">{role ?? "staff"}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void handleSignOut();
            }}
          >
            <LogOut />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}

export { StaffNavbar };
