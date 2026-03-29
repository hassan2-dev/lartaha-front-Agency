import { Shield, Award, Clock, HeartHandshake } from "lucide-react"

const badges = [
  {
    icon: Shield,
    title: "أمان على مستوى البنوك",
    description: "تشفير ٢٥٦-bit AES وشهادة ISO 27001"
  },
  {
    icon: Award,
    title: "جائزة أفضل منصة ٢٠٢٤",
    description: "من مجلة التقنية العربية"
  },
  {
    icon: Clock,
    title: "وقت تشغيل ٩٩.٩٪",
    description: "ضمان استمرارية الخدمة"
  },
  {
    icon: HeartHandshake,
    title: "ضمان استرداد ٣٠ يوم",
    description: "استرداد كامل بدون أسئلة"
  }
]

const companies = [
  "أرامكو",
  "مجموعة سابك",
  "بنك الراجحي",
  "اتصالات الإمارات",
  "طيران الإمارات",
  "شركة المراعي",
  "مجموعة ماجد الفطيم",
  "بنك الكويت الوطني"
]

export function TrustBadges() {
  return (
    <section className="py-20 bg-background border-y border-border">
      <div className="container mx-auto px-4">
        {/* Trust Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {badges.map((badge, index) => (
            <div
              key={index}
              className="text-center p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <badge.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2">{badge.title}</h3>
              <p className="text-sm text-muted-foreground">{badge.description}</p>
            </div>
          ))}
        </div>

        {/* Companies */}
        <div className="text-center">
          <p className="text-muted-foreground mb-8 text-lg">موثوق من قبل أكبر الشركات في المنطقة</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {companies.map((company, index) => (
              <div
                key={index}
                className="px-6 py-3 bg-muted rounded-lg text-muted-foreground font-semibold hover:text-foreground hover:bg-primary/10 transition-colors cursor-pointer"
              >
                {company}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
