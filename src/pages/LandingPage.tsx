import { Header } from "../components/landing/header"
import { Hero } from "../components/landing/hero"
import { Stats } from "../components/landing/stats"
import { TrustBadges } from "../components/landing/trust-badges"
import { Features } from "../components/landing/features"
import { FeatureShowcase } from "../components/landing/feature-showcase"
import { HowItWorks } from "../components/landing/how-it-works"
import { Integrations } from "../components/landing/integrations"
import { Comparison } from "../components/landing/comparison"
import { TestimonialsExtended } from "../components/landing/testimonials-extended"
import { Pricing } from "../components/landing/pricing"
import { FAQ } from "../components/landing/faq"
import { Newsletter } from "../components/landing/newsletter"
import { CTA } from "../components/landing/cta"
import { Footer } from "../components/landing/footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background" dir="rtl" lang="ar">
      <Header />
      <main>
        <Hero />
        <Stats />
        <TrustBadges />
        <Features />
        <FeatureShowcase />
        <HowItWorks />
        <Integrations />
        <Comparison />
        <TestimonialsExtended />
        <Pricing />
        <FAQ />
        <Newsletter />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
