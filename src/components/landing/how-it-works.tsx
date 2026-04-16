import { UserPlus, Settings, Rocket, CheckCircle2 } from 'lucide-react'

const steps = [
  {
    step: '١',
    icon: UserPlus,
    title: 'إنشاء حساب مجاني',
    description:
      'سجّل في دقائق معدودة وابدأ رحلتك مع مجلس. لا حاجة لبطاقة ائتمان للتجربة المجانية.',
  },
  {
    step: '٢',
    icon: Settings,
    title: 'إعداد مساحة العمل',
    description: 'أنشئ مساحة عملك الخاصة وخصصها حسب احتياجات فريقك ومتطلبات مشاريعك.',
  },
  {
    step: '٣',
    icon: Rocket,
    title: 'دعوة أعضاء الفريق',
    description: 'أضف زملاءك بسهولة عبر البريد الإلكتروني أو رابط الدعوة وحدد صلاحياتهم.',
  },
  {
    step: '٤',
    icon: CheckCircle2,
    title: 'ابدأ الإنجاز',
    description: 'استخدم أدواتنا المتكاملة لإدارة المهام والملفات والتواصل مع فريقك بفعالية.',
  },
]

export function HowItWorks() {
  return (
    <section className="py-24 bg-primary/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            كيف يعمل
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            ابدأ في أربع خطوات بسيطة
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            عملية سهلة وسريعة للبدء في استخدام مجلس مع فريقك
          </p>
        </div>

        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 right-[12%] left-[12%] h-1 bg-gradient-to-l from-primary/20 via-primary to-primary/20 -translate-y-1/2 rounded-full" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-card rounded-2xl p-8 shadow-lg border border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-2 text-center relative z-10">
                  {/* Step Number */}
                  <div className="absolute -top-4 right-1/2 translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    {step.step}
                  </div>

                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 mt-2">
                    <step.icon className="w-8 h-8 text-primary" />
                  </div>

                  <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
