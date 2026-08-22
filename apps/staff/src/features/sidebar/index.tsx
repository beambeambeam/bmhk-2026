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
import {
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Trophy,
  UserCheck,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { SidebarBrand } from "./brand";
import { ThemSwitcher } from "./them-switcher";

interface StaffSidebarProps {
  readonly role?: string | null;
  readonly userName?: string | null;
}

interface StaffNavItem {
  readonly label: string;
  readonly to:
    | "/achievements"
    | "/admin/users"
    | "/dashboard"
    | "/participations"
    | "/round1-participants-check"
    | "/round1-staff-check"
    | "/round2-participants-check"
    | "/round2-staff-check";
  readonly icon: LucideIcon;
}

const baseNavItems: readonly StaffNavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
];

const adminNavItems: readonly StaffNavItem[] = [
  { icon: UsersRound, label: "Users", to: "/admin/users" },
];

const registrationNavItems: readonly StaffNavItem[] = [
  { icon: ClipboardCheck, label: "Participations", to: "/participations" },
];

const achievementsNavItems: readonly StaffNavItem[] = [
  { icon: Trophy, label: "ผลงานการแข่งขัน", to: "/achievements" },
];

const staffNavItems: readonly StaffNavItem[] = [
  { icon: UserCheck, label: "ลงทะเบียนทีมงาน", to: "/round1-staff-check" },
];

const participantCheckInNavItems: readonly StaffNavItem[] = [
  { icon: UserCheck, label: "ลงทะเบียนผู้เข้าร่วม", to: "/round1-participants-check" },
];

const round2StaffNavItems: readonly StaffNavItem[] = [
  { icon: UserCheck, label: "ลงทะเบียนทีมงาน (รอบ 2)", to: "/round2-staff-check" },
];

const round2ParticipantCheckInNavItems: readonly StaffNavItem[] = [
  { icon: UserCheck, label: "ลงทะเบียนผู้เข้าร่วม (รอบ 2)", to: "/round2-participants-check" },
];

interface StaffNavGroup {
  readonly items: readonly StaffNavItem[];
  readonly label: string;
}

interface StaffNavGroupProps {
  readonly group: StaffNavGroup;
  readonly pathname: string;
}

function getHomeRoute(isAdmin: boolean, canAccessParticipations: boolean): StaffNavItem["to"] {
  if (isAdmin) {
    return "/dashboard";
  }

  return canAccessParticipations ? "/participations" : "/round1-staff-check";
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
  const canAccessParticipations = isAdmin || role === "staff";
  const canAccessStaffCheckIn = isAdmin || role === "registrationStaff";
  const homeRoute = getHomeRoute(isAdmin, canAccessParticipations);
  let navGroups: readonly StaffNavGroup[] = [];
  if (isAdmin) {
    navGroups = [
      { items: baseNavItems, label: "Navigation" },
      { items: registrationNavItems, label: "Registration" },
      { items: achievementsNavItems, label: "Achievements" },
      { items: [...participantCheckInNavItems, ...staffNavItems], label: "Round 1 Check-in" },
      {
        items: [...round2ParticipantCheckInNavItems, ...round2StaffNavItems],
        label: "Round 2 Check-in",
      },
      { items: adminNavItems, label: "Admin" },
    ];
  } else if (canAccessParticipations) {
    navGroups = [
      { items: registrationNavItems, label: "Registration" },
      { items: achievementsNavItems, label: "Achievements" },
      { items: participantCheckInNavItems, label: "Round 1 Check-in" },
      { items: round2ParticipantCheckInNavItems, label: "Round 2 Check-in" },
    ];
  } else if (canAccessStaffCheckIn) {
    navGroups = [
      { items: staffNavItems, label: "Round 1 Check-in" },
      { items: round2StaffNavItems, label: "Round 2 Check-in" },
    ];
  }

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
              render={<Link to={homeRoute} aria-label="BangMod Hackathon 2026" />}
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
            <ThemSwitcher />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton render={<div />} size="lg">
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
