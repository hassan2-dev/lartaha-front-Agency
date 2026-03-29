import { useState } from "react"
import { ChevronDown } from "lucide-react"

const faqs = [
  {
    question: "ما هو مجلس وكيف يمكنه مساعدة فريقي؟",
    answer: "مجلس هو منصة متكاملة لإدارة الفرق ومساحات العمل، تجمع بين إدارة المهام، مشاركة الملفات، التواصل الجماعي، وتتبع النشاطات في مكان واحد. يساعدك على تنظيم عمل فريقك وزيادة الإنتاجية بشكل ملحوظ."
  },
  {
    question: "هل مجلس مناسب للشركات الصغيرة والمتوسطة؟",
    answer: "نعم، مجلس مصمم ليناسب جميع أحجام الفرق. سواء كنت فريقاً من ٣ أشخاص أو شركة تضم مئات الموظفين، لدينا خطط مرنة تناسب احتياجاتك وميزانيتك."
  },
  {
    question: "كيف يتم حماية ملفاتي وبياناتي؟",
    answer: "نستخدم أحدث معايير الأمان العالمية بما في ذلك التشفير من طرف إلى طرف (E2EE)، المصادقة الثنائية، وخوادم محمية في مراكز بيانات معتمدة. كما نلتزم بمعايير GDPR و ISO 27001."
  },
  {
    question: "هل يمكنني تجربة مجلس مجاناً؟",
    answer: "بالتأكيد! نقدم فترة تجريبية مجانية لمدة ١٤ يوماً بدون الحاجة لبطاقة ائتمان. يمكنك تجربة جميع الميزات المتقدمة قبل الاشتراك."
  },
  {
    question: "هل يدعم مجلس اللغة العربية بالكامل؟",
    answer: "نعم، مجلس مصمم خصيصاً للمستخدمين العرب. الواجهة بالكامل باللغة العربية مع دعم كامل للكتابة من اليمين لليسار (RTL)، بالإضافة إلى دعم اللغة الإنجليزية."
  },
  {
    question: "ما هي طرق الدفع المتاحة؟",
    answer: "نقبل جميع بطاقات الائتمان الرئيسية (Visa, Mastercard, Amex)، PayPal، والتحويل البنكي للشركات. كما ندعم الدفع بالعملات المحلية في معظم دول الشرق الأوسط."
  },
  {
    question: "هل يمكن ترحيل بياناتي من منصات أخرى؟",
    answer: "نعم، نوفر أدوات استيراد سهلة من معظم المنصات الشائعة مثل Trello, Asana, Monday, وغيرها. فريق الدعم لدينا يساعدك في عملية الترحيل مجاناً."
  },
  {
    question: "كيف يمكنني التواصل مع فريق الدعم؟",
    answer: "فريق الدعم متاح على مدار الساعة عبر الدردشة المباشرة داخل التطبيق، البريد الإلكتروني، أو الهاتف للعملاء المميزين. نفخر بمتوسط وقت استجابة أقل من ٣٠ دقيقة."
  }
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            الأسئلة الشائعة
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            إجابات على أسئلتك
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            كل ما تحتاج معرفته عن مجلس وكيفية استخدامه
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="mb-4"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className={`w-full text-right p-6 rounded-xl transition-all duration-300 flex items-center justify-between gap-4 ${
                  openIndex === index
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-card border border-border hover:border-primary/30"
                }`}
              >
                <span className="font-semibold text-lg">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="p-6 bg-card border border-t-0 border-border rounded-b-xl">
                  <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">لم تجد إجابة لسؤالك؟</p>
          <button className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors">
            تواصل مع فريق الدعم
          </button>
        </div>
      </div>
    </section>
  )
}
