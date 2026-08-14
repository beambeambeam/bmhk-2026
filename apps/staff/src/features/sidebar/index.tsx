import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/sidebar";
import { authClient } from "@bmhk-2026/client/auth-client";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, ShieldCheck, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

interface StaffSidebarProps {
  readonly role?: string | null;
  readonly userName?: string | null;
}

interface StaffNavItem {
  readonly label: string;
  readonly to: "/dashboard" | "/users";
  readonly icon: LucideIcon;
}

const baseNavItems: readonly StaffNavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
];

function StaffSidebar({ role, userName }: StaffSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin";
  const navItems: readonly StaffNavItem[] = isAdmin
    ? [...baseNavItems, { icon: ShieldCheck, label: "Admin", to: "/users" }]
    : baseNavItems;

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
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link to="/dashboard" />} size="lg" tooltip="Staff">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <ShieldCheck />
              </div>
              <span className="truncate font-semibold">Staff</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      render={<Link to={item.to} />}
                      isActive={location.pathname === item.to}
                      tooltip={item.label}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<div />} size="lg">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                <UserRound />
              </div>
              <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                <span className="w-full truncate font-medium">{userName ?? "Staff"}</span>
                <span className="w-full truncate text-sidebar-foreground/70 text-xs">
                  {role ?? "staff"}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign out"
              onClick={() => {
                void handleSignOut();
              }}
            >
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export { StaffSidebar };
