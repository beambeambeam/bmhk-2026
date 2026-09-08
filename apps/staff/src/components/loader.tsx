import { Loader2 } from "lucide-react";

export default function Loader() {
  return (
    <output aria-label="กำลังโหลด" className="flex h-full items-center justify-center pt-8">
      <Loader2 aria-hidden="true" className="animate-spin" />
    </output>
  );
}
