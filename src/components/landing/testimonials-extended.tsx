import { Star, Quote } from "lucide-react"

const testimonials = [
  {
    name: "أحمد الشمري",
    role: "مدير تقنية المعلومات",
    company: "شركة النخبة للتقنية",
    image: "أ",
    content: "مجلس غيّر طريقة عملنا بالكامل. أصبح التواصل بين الفرق أسهل والإنتاجية زادت بنسبة ٤٠٪ خلال الأشهر الثلاثة الأولى.",
    rating: 5
  },
  {
    name: "فاطمة المهيري",
    role: "مديرة المشاريع",
    company: "مجموعة الإبداع",
    image: "ف",
    content: "ميزة إدارة المهام بنظام كانبان مذهلة! أستطيع متابعة جميع المشاريع في لوحة واحدة وتوزيع المهام بسهولة على الفريق.",
    rating: 5
  },
  {
    name: "خالد العتيبي",
    role: "المدير التنفيذي",
    company: "وكالة ستارت أب",
    image: "خ",
    content: "كنا نستخدم ٥ تطبيقات مختلفة، الآن كل شيء في مجلس. وفرنا الوقت والمال وزادت كفاءة الفريق بشكل ملحوظ.",
    rating: 5
  },
  {
    name: "نورة السالم",
    role: "مديرة الموارد البشرية",
    company: "شركة المستقبل",
    image: "ن",
    content: "ميزة تتبع النشاطات ساعدتنا في فهم سير العمل بشكل أفضل واتخاذ قرارات مبنية على بيانات حقيقية.",
    rating: 5
  },
  {
    name: "عبدالله الحارثي",
    role: "مدير التسويق",
    company: "وكالة ديجيتال ماركت",
    image: "ع",
    content: "حماية الملفات وإدارة الصلاحيات في مجلس ممتازة. أستطيع التحكم بدقة في من يرى ماذا ومتى.",
    rating: 5
  },
  {
    name: "سارة القحطاني",
    role: "مديرة العمليات",
    company: "شركة لوجستيك برو",
    image: "س",
    content: "ميزة الاجتماعات والمكالمات الجماعية وفرت علينا الاشتراك في تطبيقات أخرى. جودة الصوت والصورة ممتازة.",
    rating: 5
  }
]

export function TestimonialsExtended() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            آراء العملاء
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            قصص نجاح حقيقية
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            اكتشف كيف ساعد مجلس آلاف الفرق في تحقيق أهدافهم
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl p-8 border border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300 relative group"
            >
              {/* Quote Icon */}
              <Quote className="absolute top-6 left-6 w-10 h-10 text-primary/10 group-hover:text-primary/20 transition-colors" />
              
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground leading-relaxed mb-6 relative z-10">
                {`"${testimonial.content}"`}
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">{testimonial.image}</span>
                </div>
                <div>
                  <h4 className="font-bold text-foreground">{testimonial.name}</h4>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  <p className="text-sm text-primary">{testimonial.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 p-8 bg-primary/5 rounded-2xl">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">٤.٩/٥</div>
            <div className="text-muted-foreground">متوسط التقييم</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">+٢٥٠٠</div>
            <div className="text-muted-foreground">تقييم إيجابي</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">٩٨٪</div>
            <div className="text-muted-foreground">نسبة الرضا</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">٩٢٪</div>
            <div className="text-muted-foreground">معدل التجديد</div>
          </div>
        </div>
      </div>
    </section>
  )
}
