import {
  LayoutGrid,
  Upload,
  Shield,
  MessageCircle,
  Activity
} from "lucide-react"

const features = [
  {
    icon: LayoutGrid,
    title: "إدارة المهام بنظام كانبان",
    description: "أنشئ ونظم وتتبع المهام بلوحات السحب والإفلات. عيّن أعضاء الفريق وحدد المواعيد النهائية وراقب التقدم في الوقت الفعلي.",
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    icon: Upload,
    title: "رفع الملفات بأمان",
    description: "ارفع الصور والفيديوهات والمستندات إلى التخزين السحابي. أنشئ روابط قابلة للمشاركة وتعاون على الملفات مع فريقك بالكامل.",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    icon: Shield,
    title: "حماية الملفات",
    description: "حافظ على أمان الملفات الحساسة مع التحكم في الوصول القائم على الأدوار. اقفل الملفات من أعضاء الفريق غير المصرح لهم.",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: MessageCircle,
    title: "تواصل الفريق",
    description: "محادثات جماعية ورسائل خاصة ومكالمات فيديو واجتماعات مجدولة. ابق على تواصل مع فريقك أينما كانوا.",
    color: "bg-rose-500/10 text-rose-600",
  },
  {
    icon: Activity,
    title: "تتبع النشاط",
    description: "رؤية كاملة لأنشطة الفريق. تتبع تحديثات المهام وتغييرات الملفات وسجل التعاون في جدول زمني شامل.",
    color: "bg-violet-500/10 text-violet-600",
  },
]

export function Features() {
  return (
    <section id="features" className="p y-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold mb-4">
            المميزات
          </span>
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl text-balance">
            كل ما يحتاجه فريقك للنجاح
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            مجموعة متكاملة من الأدوات المصممة لتبسيط سير عملك وتعزيز الإنتاجية.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative rounded-2xl border border-border bg-card p-8 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300"
            >
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.color} mb-6`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
