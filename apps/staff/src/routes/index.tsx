import { Link, createFileRoute } from "@tanstack/react-router";

import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/button";
import HeroLockup from "@/features/home/hero-lockup";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <section className="flex w-full max-w-5xl flex-col items-center gap-8 text-center">
        <h1 className="sr-only">BangMod Hackathon 2026</h1>
        <HeroLockup />
        <Button nativeButton={false} render={<Link to="/login" />} size="lg">
          เข้าสู่ระบบ
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      </section>
    </main>
  );
}
