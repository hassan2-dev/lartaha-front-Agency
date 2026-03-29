import { useState } from "react"

const integrations = [
  { name: "Google Drive", category: "تخزين", color: "bg-yellow-500" },
  { name: "Dropbox", category: "تخزين", color: "bg-blue-500" },
  { name: "Slack", category: "تواصل", color: "bg-purple-600" },
  { name: "Microsoft Teams", category: "تواصل", color: "bg-indigo-600" },
  { name: "Zoom", category: "اجتماعات", color: "bg-blue-600" },
  { name: "Google Meet", category: "اجتماعات", color: "bg-green-500" },
  { name: "Jira", category: "إدارة مشاريع", color: "bg-blue-700" },
  { name: "GitHub", category: "تطوير", color: "bg-gray-800" },
  { name: "Figma", category: "تصميم", color: "bg-pink-500" },
  { name: "Notion", category: "توثيق", color: "bg-gray-700" },
  { name: "Zapier", category: "أتمتة", color: "bg-orange-500" },
  { name: "AWS S3", category: "تخزين", color: "bg-orange-600" },
]

const categories = ["الكل", "تخزين", "تواصل", "اجتماعات", "إدارة مشاريع", "تطوير", "تصميم", "توثيق", "أتمتة"]

export function Integrations() {
  const [activeCategory, setActiveCategory] = useState("الكل")

  const filteredIntegrations = activeCategory === "الكل" 
    ? integrations 
    : integrations.filter(i => i.category === activeCategory)

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            التكاملات
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            اتصل بأدواتك المفضلة
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            مجلس يتكامل بسلاسة مع أكثر من ١٠٠ تطبيق وخدمة تستخدمها يومياً
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeCategory === category
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-secondary text-secondary-foreground hover:bg-primary/10"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filteredIntegrations.map((integration, index) => (
            <div
              key={index}
              className="bg-card rounded-xl p-6 border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 group cursor-pointer"
            >
              <div className={`w-12 h-12 ${integration.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <span className="text-white font-bold text-lg">{integration.name[0]}</span>
              </div>
              <h3 className="font-semibold text-foreground mb-1">{integration.name}</h3>
              <p className="text-sm text-muted-foreground">{integration.category}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">وأكثر من ١٠٠ تكامل آخر...</p>
          <button className="text-primary font-semibold hover:underline">
            عرض جميع التكاملات ←
          </button>
        </div>
      </div>
    </section>
  )
}
