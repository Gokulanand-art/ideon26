import { Hero } from "@/components/Hero";
import { LiveStats } from "@/components/LiveStats";
import { About } from "@/components/About";
import { ModeCards } from "@/components/ModeCards";
import { HowItWorks } from "@/components/HowItWorks";
import { Faq } from "@/components/Faq";
import { FinalCta } from "@/components/FinalCta";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getStats } from "@/lib/stats";
import type { Stats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Home() {
  let initial: Stats | null = null;
  try {
    initial = await getStats();
  } catch (err) {
    // The client will bootstrap via the stats API + SSE.
    console.error("initial stats error", err);
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <div id="live" className="scroll-mt-20 py-12 sm:py-16">
          <LiveStats initial={initial} />
        </div>
        <div className="py-14 sm:py-20">
          <About />
        </div>
        <div className="py-14 sm:py-20">
          <ModeCards initial={initial} />
        </div>
        <div className="py-14 sm:py-20">
          <HowItWorks />
        </div>
        <div className="py-14 sm:py-20">
          <Faq />
        </div>
        <div className="py-14 sm:py-20">
          <FinalCta />
        </div>
      </main>
      <Footer />
    </>
  );
}
