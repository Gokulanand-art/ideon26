import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { LiveStatus } from "@/components/LiveStatus";
import { RegisterOptions } from "@/components/RegisterOptions";
import { Domains } from "@/components/Domains";
import { About } from "@/components/About";
import { TeamFee } from "@/components/TeamFee";
import { EventInfo } from "@/components/EventInfo";
import { Faq } from "@/components/Faq";
import { FinalCta } from "@/components/FinalCta";
import { Footer } from "@/components/Footer";
import { getStats } from "@/lib/stats";
import type { Stats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Home() {
  let initial: Stats | null = null;
  try {
    initial = await getStats();
  } catch (err) {
    console.error("initial stats error", err);
  }

  const open = initial?.registrationOpen === true && !initial?.full;

  return (
    <>
      <Navbar open={open} />
      <main className="flex-1">
        <Hero stats={initial} />
        <LiveStatus initial={initial} />
        <RegisterOptions stats={initial} />
        <About />
        <Domains />
        <TeamFee />
        <EventInfo />
        <Faq />
        <FinalCta open={open} />
      </main>
      <Footer />
    </>
  );
}