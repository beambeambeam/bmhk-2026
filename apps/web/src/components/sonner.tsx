import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import type { CSSProperties } from "react";
import { Toaster as Sonner } from "sonner";
import type { ToasterProps } from "sonner";

function Toaster({ ...props }: ToasterProps) {
  const { theme } = useTheme();
  const toasterTheme =
    theme === "light" || theme === "dark" || theme === "system" ? theme : "system";
  const style: CSSProperties & Record<`--${string}`, string> = {
    "--border-radius": "var(--radius)",
    "--normal-bg": "var(--popover)",
    "--normal-border": "var(--border)",
    "--normal-text": "var(--popover-foreground)",
  };

  return (
    <Sonner
      theme={toasterTheme}
      className="toaster group"
      icons={{
        error: <OctagonXIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
        success: <CircleCheckIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
      }}
      style={style}
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
