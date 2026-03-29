import { Check, X, Minus } from "lucide-react"

const features = [
  { name: "إدارة المهام بنظام كانبان", majlis: true, competitor1: true, competitor2: true },
  { name: "تحميل ومشاركة الملفات", majlis: true, competitor1: true, competitor2: "limited" },
  { name: "حماية الملفات والصلاحيات", majlis: true, competitor1: "limited", competitor2: false },
  { name: "الدردشة الجماعية والخاصة", majlis: true, competitor1: false, competitor2: true },
  { name: "مكالمات الفيديو والاجتماعات", majlis: true, competitor1: false, competitor2: "limited" },
  { name: "تتبع سجل النشاطات", majlis: true, competitor1: true, competitor2: false },
  { name: "دعم اللغة العربية الكامل", majlis: true, competitor1: false, competitor2: false },
  { name: "واجهة RTL أصلية", majlis: true, competitor1: false, competitor2: false },
  { name: "تكامل مع +١٠٠ تطبيق", majlis: true, competitor1: true, competitor2: "limited" },
  { name: "دعم فني على مدار الساعة", majlis: true, competitor1: "limited", competitor2: false },
  { name: "تطبيقات الجوال", majlis: true, competitor1: true, competitor2: true },
  { name: "API مفتوح للمطورين", majlis: true, competitor1: true, competitor2: false },
]

const renderStatus = (status: boolean | string) => {
  if (status === true) {
    return (
      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <Check className="w-5 h-5 text-green-600" />
      </div>
    )
  }
  if (status === false) {
    return (
      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mx-auto">
        <X className="w-5 h-5 text-red-500" />
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center mx-auto">
      <Minus className="w-5 h-5 text-yellow-600" />
    </div>
  )
}

export function Comparison() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            المقارنة
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            لماذا تختار مجلس؟
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            قارن بين مجلس والمنافسين واكتشف لماذا نحن الخيار الأفضل
          </p>
        </div>

        <div className="max-w-4xl mx-auto overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="text-right py-4 px-4 font-semibold text-foreground">الميزة</th>
                <th className="py-4 px-4 text-center">
                  <div className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold">
                    مجلس
                  </div>
                </th>
                <th className="py-4 px-4 text-center text-muted-foreground font-medium">المنافس أ</th>
                <th className="py-4 px-4 text-center text-muted-foreground font-medium">المنافس ب</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr
                  key={index}
                  className={`border-b border-border ${index % 2 === 0 ? "bg-card" : "bg-background"}`}
                >
                  <td className="py-4 px-4 font-medium text-foreground">{feature.name}</td>
                  <td className="py-4 px-4">{renderStatus(feature.majlis)}</td>
                  <td className="py-4 px-4">{renderStatus(feature.competitor1)}</td>
                  <td className="py-4 px-4">{renderStatus(feature.competitor2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-center mt-12">
          <button className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl">
            ابدأ تجربتك المجانية الآن
          </button>
        </div>
      </div>
    </section>
  )
}
