import { Button } from "../ui/button"
import { ArrowUpLeft, Play, Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom"

export function Hero() {
  const navigate = useNavigate()
  return (
    <section className="relative overflow-hidden py-24 sm:py-36">
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-400/10 rounded-full blur-[150px]" />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#6366f110_1px,transparent_1px),linear-gradient(to_bottom,#6366f110_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-5 py-2 text-sm font-semibold text-indigo-700 mb-8 border border-indigo-200">
            <Sparkles className="h-4 w-4" />
            مصمم خصيصاً لفرق الشرق الأوسط
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-7xl lg:text-8xl text-balance leading-tight">
            وحّد فريقك
            <br />
            <span className="bg-gradient-to-l from-indigo-600 via-indigo-500 to-indigo-700 bg-clip-text text-transparent">ضاعف إنتاجيتك</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-8 max-w-3xl text-xl text-muted-foreground leading-relaxed text-pretty">
            منصة مساحة العمل المتكاملة التي تجمع إدارة المهام ومشاركة الملفات
            والتواصل الفريقي وتتبع النشاط في حل واحد قوي ومتكامل.
          </p>

          {/* CTA Buttons */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="w-full sm:w-auto gap-2 text-lg px-8 py-6 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all"
              onClick={() => navigate('/signup')}
            >
              ابدأ تجربتك المجانية
              <ArrowUpLeft />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto gap-2 text-lg px-8 py-6 !bg-white !text-indigo-700 hover:text-indigo-700 shadow-lg"
              onClick={() => navigate('/login')}
            >
              تسجيل الدخول
              <Play className="h-5 w-5 text-indigo-600" />
            </Button>
          </div>

          {/* Trust Indicator */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-muted-foreground">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">١٤ يوم تجربة مجانية</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">لا حاجة لبطاقة ائتمان</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">إلغاء في أي وقت</span>
            </div>
          </div>
        </div>

        {/* Hero Image/Dashboard Preview */}
        <div className="mt-20 sm:mt-24">
          <div className="relative mx-auto max-w-6xl">
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-indigo-600/20 to-indigo-500/20 rounded-3xl blur-2xl" />

            <div className="relative rounded-2xl border-2 border-indigo-200/50 bg-card p-2 shadow-2xl shadow-indigo-500/20">
              <div className="rounded-xl bg-muted overflow-hidden">
                {/* Mock Dashboard */}
                <div className="aspect-[16/9] relative">
                  <div className="absolute inset-0 bg-card">
                    {/* Dashboard Header */}
                    <div className="flex items-center justify-between border-b border-border px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">م</span>
                        </div>
                        <div className="space-y-1">
                          <div className="h-4 w-28 rounded bg-foreground/10" />
                          <div className="h-3 w-20 rounded bg-muted-foreground/20" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-indigo-100 border-2 border-white" />
                        <div className="h-9 w-9 rounded-full bg-indigo-200 border-2 border-white -mr-3" />
                        <div className="h-9 w-9 rounded-full bg-indigo-300 border-2 border-white -mr-3" />
                        <div className="h-9 w-9 rounded-full bg-indigo-400 border-2 border-white -mr-3 flex items-center justify-center text-xs text-white font-semibold">+٥</div>
                      </div>
                    </div>

                    {/* Dashboard Content */}
                    <div className="flex h-full">
                      {/* Sidebar */}
                      <div className="w-60 border-l border-border p-4 space-y-2">
                        {[
                          { active: true, label: 'لوحة التحكم' },
                          { active: false, label: 'المهام' },
                          { active: false, label: 'الملفات' },
                          { active: false, label: 'الدردشة' },
                          { active: false, label: 'النشاط' },
                          { active: false, label: 'الإعدادات' },
                        ].map((item, i) => (
                          <div key={i} className={`h-10 rounded-lg flex items-center px-3 ${item.active ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-muted'}`}>
                            <div className={`h-4 w-full rounded ${item.active ? 'bg-indigo-300/50' : 'bg-muted-foreground/10'}`} />
                          </div>
                        ))}
                      </div>

                      {/* Main Content - Kanban */}
                      <div className="flex-1 p-6">
                        <div className="flex gap-5">
                          {[
                            { title: 'للتنفيذ', count: 4, color: 'bg-slate-500' },
                            { title: 'قيد التنفيذ', count: 3, color: 'bg-indigo-500' },
                            { title: 'مكتمل', count: 6, color: 'bg-green-500' }
                          ].map((col, i) => (
                            <div key={col.title} className="flex-1 rounded-xl bg-muted/50 p-4">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <div className={`h-3 w-3 rounded-full ${col.color}`} />
                                  <span className="font-semibold text-foreground text-sm">{col.title}</span>
                                </div>
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">{col.count}</span>
                              </div>
                              <div className="space-y-3">
                                {[...Array(i === 1 ? 3 : 2)].map((_, j) => (
                                  <div key={j} className="rounded-lg bg-card p-4 shadow-sm border border-border hover:border-indigo-200 transition-colors cursor-pointer">
                                    <div className="h-3 w-full rounded bg-foreground/10 mb-2" />
                                    <div className="h-3 w-2/3 rounded bg-muted-foreground/10 mb-4" />
                                    <div className="flex items-center justify-between">
                                      <div className="h-6 w-6 rounded-full bg-indigo-100" />
                                      <div className="text-xs text-muted-foreground">اليوم</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -right-6 top-1/4 rounded-2xl bg-card border border-indigo-100 p-5 shadow-xl shadow-indigo-500/10 hidden lg:block animate-[float_3s_ease-in-out_infinite]">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-foreground">تم إكمال المهمة</p>
                  <p className="text-sm text-muted-foreground">بواسطة أحمد • منذ دقيقتين</p>
                </div>
              </div>
            </div>

            <div className="absolute -left-6 bottom-1/4 rounded-2xl bg-card border border-indigo-100 p-5 shadow-xl shadow-indigo-500/10 hidden lg:block animate-[float_3s_ease-in-out_infinite_0.5s]">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                  <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-foreground">رسالة جديدة</p>
                  <p className="text-sm text-muted-foreground">من سارة • الآن</p>
                </div>
              </div>
            </div>

            <div className="absolute -left-4 top-1/3 rounded-2xl bg-card border border-indigo-100 p-4 shadow-xl shadow-indigo-500/10 hidden xl:block animate-[float_3s_ease-in-out_infinite_1s]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">ملف جديد</p>
                  <p className="text-xs text-muted-foreground">تقرير_المشروع.pdf</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </section>
  )
}
