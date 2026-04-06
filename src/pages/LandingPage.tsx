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
import { SmoothScrollProvider } from "../components/landing/smooth-scroll-provider"
import { useEffect, useRef, type ReactNode } from "react"

interface AnimatedSectionProps {
  children: ReactNode
  className?: string
  animation?: "fade-in-up" | "fade-in" | "scale-in" | "slide-in-left" | "slide-in-right"
  delay?: 100 | 200 | 300 | 400 | 500
}

function AnimatedSection({
  children,
  className = "",
  animation = "fade-in-up",
  delay
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    console.log(`Setting up observer for ${animation} section`)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          console.log(`Intersection: ${entry.isIntersecting} for ${animation}`)
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible")
            console.log(`Added is-visible to ${animation}`)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: "0px 0px -100px 0px" }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [animation])

  const delayClass = delay ? `delay-${delay}` : ""

  return (
    <div
      ref={ref}
      className={`animate-on-scroll animate-${animation} ${delayClass} ${className}`}
    >
      {children}
    </div>
  )
}

export default function LandingPage() {
  const testAnimation = () => {
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      el.classList.add('is-visible')
    })
  }

  return (
    <SmoothScrollProvider>
      <div className="min-h-screen bg-background" dir="rtl" lang="ar">
        <button
          onClick={testAnimation}
          className="fixed top-4 right-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded"
        >
          Test Animations
        </button>
        <Header />
        <main>
          <Hero />
          <AnimatedSection animation="fade-in-up" delay={100}>
            <Stats />
          </AnimatedSection>
          <AnimatedSection animation="fade-in" delay={200}>
            <TrustBadges />
          </AnimatedSection>
          <AnimatedSection animation="fade-in-up" delay={100}>
            <Features />
          </AnimatedSection>
          <AnimatedSection animation="slide-in-left" delay={200}>
            <FeatureShowcase />
          </AnimatedSection>
          <AnimatedSection animation="fade-in-up" delay={100}>
            <HowItWorks />
          </AnimatedSection>
          <AnimatedSection animation="scale-in" delay={200}>
            <Integrations />
          </AnimatedSection>
          <AnimatedSection animation="slide-in-right" delay={100}>
            <Comparison />
          </AnimatedSection>
          <AnimatedSection animation="fade-in-up" delay={200}>
            <TestimonialsExtended />
          </AnimatedSection>
          <AnimatedSection animation="scale-in" delay={100}>
            <Pricing />
          </AnimatedSection>
          <AnimatedSection animation="fade-in-up" delay={200}>
            <FAQ />
          </AnimatedSection>
          <AnimatedSection animation="slide-in-left" delay={100}>
            <Newsletter />
          </AnimatedSection>
          <AnimatedSection animation="scale-in" delay={200}>
            <CTA />
          </AnimatedSection>
        </main>
        <Footer />
      </div>
    </SmoothScrollProvider>
  )
}
