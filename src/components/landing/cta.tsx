import { Button } from "../ui/button"
import { ArrowLeft, Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom"

export function CTA() {
  const navigate = useNavigate()
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 px-8 py-16 sm:px-16 sm:py-24">
          {/* Background Pattern */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />
          </div>

          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />

          <div className="relative text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white/90 text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              عرض خاص - خصم ٣٠٪ على الاشتراك السنوي
            </div>

            <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl text-balance">
              هل أنت مستعد لتحويل إنتاجية فريقك؟
            </h2>
            <p className="mt-6 text-xl text-indigo-100 leading-relaxed text-pretty">
              انضم إلى مئات الفرق في الشرق الأوسط الذين يثقون بمجلس
              لإدارة مساحات عملهم. ابدأ تجربتك المجانية اليوم.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="w-full sm:w-auto gap-2 text-lg px-8 py-6 bg-white text-indigo-700 hover:bg-indigo-50 shadow-xl"
                onClick={() => navigate('/signup')}
              >
                ابدأ التجربة المجانية
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-lg px-8 py-6 bg-transparent border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50"
                onClick={() => navigate('/login')}
              >
                تسجيل الدخول
              </Button>
            </div>
            <p className="mt-8 text-indigo-200 flex flex-wrap items-center justify-center gap-6">
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5 text-indigo-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                تجربة مجانية ١٤ يوم
              </span>
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5 text-indigo-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                لا حاجة لبطاقة ائتمان
              </span>
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5 text-indigo-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                إلغاء في أي وقت
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
