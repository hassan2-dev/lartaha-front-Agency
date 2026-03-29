import { useState } from "react"
import { Mail, ArrowLeft, CheckCircle } from "lucide-react"

export function Newsletter() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setSubmitted(true)
    }
  }

  return (
    <section className="py-20 bg-primary">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-primary-foreground/10 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-primary-foreground" />
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            ابقَ على اطلاع
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8">
            اشترك في نشرتنا البريدية للحصول على آخر الأخبار والنصائح والعروض الحصرية
          </p>

          {submitted ? (
            <div className="bg-primary-foreground/10 rounded-xl p-6 flex items-center justify-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <span className="text-primary-foreground font-semibold">
                شكراً لك! تم تسجيل بريدك الإلكتروني بنجاح
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="أدخل بريدك الإلكتروني"
                className="flex-1 px-6 py-4 rounded-xl bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:outline-none focus:border-primary-foreground/40 transition-colors"
                required
              />
              <button
                type="submit"
                className="px-8 py-4 bg-primary-foreground text-primary rounded-xl font-semibold hover:bg-primary-foreground/90 transition-colors flex items-center justify-center gap-2 group"
              >
                اشترك الآن
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </button>
            </form>
          )}

          <p className="text-primary-foreground/60 text-sm mt-4">
            نحترم خصوصيتك. يمكنك إلغاء الاشتراك في أي وقت.
          </p>
        </div>
      </div>
    </section>
  )
}
