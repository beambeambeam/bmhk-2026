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
import { LayoutDashboard, LogOut, UserRound, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { SidebarBrand } from "./brand";

interface StaffSidebarProps {
  readonly role?: string | null;
  readonly userName?: string | null;
}

interface StaffNavItem {
  readonly label: string;
  readonly to: "/admin/users" | "/dashboard";
  readonly icon: LucideIcon;
}

const baseNavItems: readonly StaffNavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
];

const adminNavItems: readonly StaffNavItem[] = [
  { icon: UsersRound, label: "Users", to: "/admin/users" },
];

interface StaffNavGroup {
  readonly items: readonly StaffNavItem[];
  readonly label: string;
}

interface StaffNavGroupProps {
  readonly group: StaffNavGroup;
  readonly pathname: string;
}

function StaffNavGroup({ group, pathname }: StaffNavGroupProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {group.items.map((item) => {
            const Icon = item.icon;

            return (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton
                  render={<Link to={item.to} />}
                  isActive={pathname === item.to}
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
  );
}

function StaffSidebar({ role, userName }: StaffSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin";
  const navGroups: readonly StaffNavGroup[] = isAdmin
    ? [
        { items: baseNavItems, label: "Navigation" },
        { items: adminNavItems, label: "Admin" },
      ]
    : [{ items: baseNavItems, label: "Navigation" }];

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
            <SidebarMenuButton
              className="h-auto min-h-12"
              render={<Link to="/dashboard" aria-label="BangMod Hackathon 2026" />}
              size="lg"
              tooltip="BangMod Hackathon 2026"
            >
              <SidebarBrand />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <StaffNavGroup key={group.label} group={group} pathname={location.pathname} />
        ))}
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
