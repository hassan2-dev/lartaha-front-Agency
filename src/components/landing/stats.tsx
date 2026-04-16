const stats = [
  { value: '+500', label: 'فريق', description: 'في منطقة الشرق الأوسط' },
  { value: '%98', label: 'رضا العملاء', description: 'تقييم المستخدمين' },
  { value: '3x', label: 'أسرع', description: 'في تسليم المشاريع' },
  { value: '%50', label: 'توفير الوقت', description: 'في التنسيق' },
]

export function Stats() {
  return (
    <section className="py-16 bg-secondary/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <p className="text-3xl font-bold text-primary sm:text-4xl lg:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">{stat.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
