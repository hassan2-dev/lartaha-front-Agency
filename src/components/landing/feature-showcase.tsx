import { useState } from "react"
import { cn } from "../../lib/utils"
import { 
  LayoutGrid, 
  Upload, 
  Shield, 
  MessageCircle, 
  Activity,
  Check,
  Clock,
  Users,
  Lock,
  Video,
  FileText
} from "lucide-react"

const showcaseItems = [
  {
    id: "tasks",
    icon: LayoutGrid,
    label: "إدارة المهام",
    title: "تصور سير عملك بلوحات كانبان",
    description: "اسحب وأفلت المهام، عيّن أعضاء الفريق، حدد الأولويات والمواعيد النهائية. احصل على نظرة شاملة على تقدم مشروعك بنظرة واحدة.",
    features: ["واجهة السحب والإفلات", "أعمدة وتصنيفات مخصصة", "تذكيرات المواعيد النهائية", "تعيين الأعضاء"],
  },
  {
    id: "files",
    icon: Upload,
    label: "إدارة الملفات",
    title: "خزّن وشارك الملفات بسهولة",
    description: "ارفع أي نوع من الملفات إلى التخزين السحابي الآمن. أنشئ روابط قابلة للمشاركة للتعاون السريع عبر مؤسستك.",
    features: ["تخزين سحابي", "روابط مشاركة سريعة", "معاينة الملفات", "سجل الإصدارات"],
  },
  {
    id: "security",
    icon: Shield,
    label: "الأمان",
    title: "حماية ملفات بمستوى المؤسسات",
    description: "تحكم في من يمكنه الوصول إلى مستنداتك الحساسة. عيّن الصلاحيات على مستوى الملف أو المجلد أو مساحة العمل.",
    features: ["وصول قائم على الأدوار", "تشفير الملفات", "سجلات المراجعة", "تكامل SSO"],
  },
  {
    id: "chat",
    icon: MessageCircle,
    label: "التواصل",
    title: "تواصل فوري مع الفريق",
    description: "ابق على تواصل مع القنوات الجماعية والرسائل المباشرة واجتماعات الفيديو. جميع محادثاتك في مكان واحد.",
    features: ["قنوات جماعية", "رسائل مباشرة", "مكالمات فيديو", "مشاركة الشاشة"],
  },
  {
    id: "activity",
    icon: Activity,
    label: "النشاط",
    title: "تتبع كل تغيير وتحديث",
    description: "لا تفوت أي تحديث مهم. اعرف من فعل ماذا ومتى مع تتبع النشاط الشامل.",
    features: ["تحديثات فورية", "سجل التغييرات", "تصفية حسب الإجراء", "تصدير التقارير"],
  },
]

export function FeatureShowcase() {
  const [activeTab, setActiveTab] = useState("tasks")
  const activeItem = showcaseItems.find(item => item.id === activeTab)

  return (
    <section className="py-24 sm:py-32 bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-sm font-semibold text-accent uppercase tracking-wide mb-4">
            نظرة معمقة
          </p>
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl text-balance">
            مميزات قوية للفرق الحديثة
          </h2>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {showcaseItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all",
                activeTab === item.id
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-accent/50"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeItem && (
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="order-2 lg:order-2">
              <h3 className="text-2xl font-bold text-foreground sm:text-3xl mb-4">
                {activeItem.title}
              </h3>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                {activeItem.description}
              </p>
              <ul className="space-y-4">
                {activeItem.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20">
                      <Check className="h-4 w-4 text-accent" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual Preview */}
            <div className="order-1 lg:order-1">
              <div className="rounded-2xl border border-border bg-card p-2 shadow-xl">
                <div className="rounded-xl bg-muted overflow-hidden">
                  {/* Dynamic Preview based on active tab */}
                  {activeTab === "tasks" && <TasksPreview />}
                  {activeTab === "files" && <FilesPreview />}
                  {activeTab === "security" && <SecurityPreview />}
                  {activeTab === "chat" && <ChatPreview />}
                  {activeTab === "activity" && <ActivityPreview />}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function TasksPreview() {
  return (
    <div className="aspect-[4/3] p-6 bg-card">
      <div className="flex gap-4 h-full">
        {[
          { title: "للتنفيذ", count: 3, tasks: ["مراجعة التصميم", "توثيق API", "إصلاح الخلل"] },
          { title: "قيد التنفيذ", count: 2, tasks: ["واجهة لوحة التحكم", "نظام المصادقة"], highlight: true },
          { title: "مكتمل", count: 4, tasks: ["صفحة تسجيل الدخول", "إعداد قاعدة البيانات"] },
        ].map((col, i) => (
          <div key={i} className={cn("flex-1 rounded-xl p-4", col.highlight ? "bg-accent/10" : "bg-muted/50")}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-foreground">{col.title}</span>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">{col.count}</span>
            </div>
            <div className="space-y-3">
              {col.tasks.map((task, j) => (
                <div key={j} className="rounded-lg bg-card p-3 shadow-sm border border-border">
                  <p className="text-sm text-foreground mb-2">{task}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2 -space-x-reverse">
                      <div className="h-5 w-5 rounded-full bg-accent/50 border-2 border-card" />
                      <div className="h-5 w-5 rounded-full bg-primary/50 border-2 border-card" />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>3 أيام</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FilesPreview() {
  const files = [
    { name: "تقرير الربع الرابع.pdf", size: "2.4 م.ب", type: "pdf" },
    { name: "صورة الفريق.jpg", size: "4.8 م.ب", type: "image" },
    { name: "العرض التقديمي.pptx", size: "12 م.ب", type: "doc" },
    { name: "ميزانية 2024.xlsx", size: "890 ك.ب", type: "sheet" },
  ]

  return (
    <div className="aspect-[4/3] p-6 bg-card">
      <div className="flex items-center justify-between mb-6">
        <h4 className="font-semibold text-foreground">الملفات الحديثة</h4>
        <button className="text-sm text-accent hover:underline">رفع</button>
      </div>
      <div className="space-y-3">
        {files.map((file, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <FileText className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">{file.size}</p>
            </div>
            <button className="text-xs text-accent hover:underline">مشاركة</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function SecurityPreview() {
  return (
    <div className="aspect-[4/3] p-6 bg-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <Shield className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">إعدادات الأمان</h4>
          <p className="text-xs text-muted-foreground">إدارة صلاحيات الوصول</p>
        </div>
      </div>
      <div className="space-y-4">
        {[
          { name: "وصول المدير", users: 2, locked: false },
          { name: "وصول المحرر", users: 8, locked: false },
          { name: "قراءة فقط", users: 15, locked: false },
          { name: "ملفات مقيدة", users: 0, locked: true },
        ].map((role, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {role.locked ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Users className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm text-foreground">{role.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">{role.users} أعضاء</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChatPreview() {
  const messages = [
    { name: "أحمد", message: "التصميم يبدو رائعاً!", time: "2 د", avatar: "أ" },
    { name: "سارة", message: "سأراجع المستندات اليوم", time: "5 د", avatar: "س" },
    { name: "عمر", message: "اجتماع الساعة 3؟", time: "10 د", avatar: "ع" },
  ]

  return (
    <div className="aspect-[4/3] p-6 bg-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">#عام</h4>
            <p className="text-xs text-muted-foreground">24 عضو</p>
          </div>
        </div>
        <button className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
          <Video className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-accent/30 flex items-center justify-center text-xs font-semibold text-accent">
              {msg.avatar}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{msg.name}</span>
                <span className="text-xs text-muted-foreground">{msg.time}</span>
              </div>
              <p className="text-sm text-muted-foreground">{msg.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActivityPreview() {
  const activities = [
    { user: "أحمد", action: "أكمل مهمة", target: "مراجعة التصميم", time: "منذ 2 د", icon: Check },
    { user: "سارة", action: "رفعت", target: "العرض التقديمي.pdf", time: "منذ 15 د", icon: Upload },
    { user: "عمر", action: "علق على", target: "أهداف الربع الرابع", time: "منذ ساعة", icon: MessageCircle },
    { user: "فاطمة", action: "أنشأت مهمة", target: "تكامل API", time: "منذ ساعتين", icon: LayoutGrid },
  ]

  return (
    <div className="aspect-[4/3] p-6 bg-card">
      <div className="flex items-center justify-between mb-6">
        <h4 className="font-semibold text-foreground">سجل النشاط</h4>
        <button className="text-sm text-accent hover:underline">عرض الكل</button>
      </div>
      <div className="space-y-4">
        {activities.map((activity, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <activity.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground">
                <span className="font-medium">{activity.user}</span>
                {" "}{activity.action}{" "}
                <span className="text-accent">{activity.target}</span>
              </p>
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
