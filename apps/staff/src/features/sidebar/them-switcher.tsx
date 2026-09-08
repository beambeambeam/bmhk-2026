import { SidebarMenuButton } from "@/components/sidebar";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribeToMount(): () => void {
  return function unsubscribeFromMount() {
    // Mount snapshot has no external subscription.
  };
}

function getClientSnapshot(): boolean {
  return true;
}

function getServerSnapshot(): boolean {
  return false;
}

function ThemSwitcher() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeToMount, getClientSnapshot, getServerSnapshot);
  const isDark = resolvedTheme === "dark";
  let label = "เปลี่ยนธีม";
  let modeLabel = "ธีม";

  if (mounted) {
    label = isDark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด";
    modeLabel = isDark ? "โหมดสว่าง" : "โหมดมืด";
  }

  const Icon = isDark ? Sun : Moon;

  return (
    <SidebarMenuButton
      aria-label={label}
      tooltip={label}
      onClick={() => {
        setTheme(isDark ? "light" : "dark");
      }}
    >
      <Icon />
      <span>{modeLabel}</span>
    </SidebarMenuButton>
  );
}

export { ThemSwitcher };
