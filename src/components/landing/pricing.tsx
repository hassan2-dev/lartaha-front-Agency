import { Button } from "../ui/button"
import { Check } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { cn } from "../../lib/utils"

const plans = [
  {
    name: "المبتدئ",
    description: "مثالي للفرق الصغيرة التي تبدأ للتو",
    price: "مجاني",
    period: "للأبد",
    features: [
      "حتى 5 أعضاء في الفريق",
      "لوحات كانبان الأساسية",
      "1 جيجابايت تخزين",
      "محادثة جماعية",
      "دعم عبر البريد الإلكتروني",
    ],
    cta: "ابدأ الآن",
    popular: false,
  },
  {
    name: "الاحترافي",
    description: "للفرق النامية التي تحتاج المزيد من القوة",
    price: "$12",
    period: "لكل مستخدم/شهرياً",
    features: [
      "أعضاء فريق غير محدودين",
      "كانبان متقدم مع الأتمتة",
      "50 جيجابايت تخزين",
      "مكالمات فيديو واجتماعات",
      "حماية الملفات والصلاحيات",
      "تتبع النشاط",
      "دعم ذو أولوية",
    ],
    cta: "ابدأ التجربة المجانية",
    popular: true,
  },
  {
    name: "المؤسسات",
    description: "حلول مخصصة للمؤسسات الكبيرة",
    price: "مخصص",
    period: "تواصل معنا",
    features: [
      "كل مميزات الاحترافي",
      "تخزين غير محدود",
      "SSO وأمان متقدم",
      "تكاملات مخصصة",
      "مدير حساب مخصص",
      "ضمان SLA",
      "خيار التثبيت المحلي",
    ],
    cta: "تواصل مع المبيعات",
    popular: false,
  },
]

export function Pricing() {
  const navigate = useNavigate()

  return (
    <section id="pricing" className="py-24 sm:py-32 bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold text-accent uppercase tracking-wide mb-4">
            الأسعار
          </p>
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl text-balance">
            أسعار بسيطة وشفافة
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            اختر الخطة التي تناسب فريقك. بدون رسوم خفية.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={cn(
                "relative rounded-2xl border bg-card p-8 flex flex-col",
                plan.popular
                  ? "border-primary shadow-xl shadow-primary/10 scale-105"
                  : "border-border"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-full">
                    الأكثر شعبية
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground mr-2 text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full",
                      plan.popular ? "bg-primary/20" : "bg-accent/20"
                    )}>
                      <Check className={cn(
                        "h-3 w-3",
                        plan.popular ? "text-primary" : "text-accent"
                      )} />
                    </div>
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                size="lg"
                onClick={() => navigate('/signup')}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
