const footerLinks = {
  product: [
    { name: 'المميزات', href: '#features' },
    { name: 'الأسعار', href: '#pricing' },
    { name: 'التكاملات', href: '#' },
    { name: 'سجل التغييرات', href: '#' },
  ],
  company: [
    { name: 'من نحن', href: '#' },
    { name: 'المدونة', href: '#' },
    { name: 'الوظائف', href: '#' },
    { name: 'الصحافة', href: '#' },
  ],
  resources: [
    { name: 'التوثيق', href: '#' },
    { name: 'مركز المساعدة', href: '#' },
    { name: 'المجتمع', href: '#' },
    { name: 'تواصل معنا', href: '#' },
  ],
  legal: [
    { name: 'الخصوصية', href: '#' },
    { name: 'الشروط', href: '#' },
    { name: 'الأمان', href: '#' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-16">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex p-0.5 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/30">
                  <img src="/logo-white.svg" className="h-10 w-10" />
                </div>
                <span className="text-2xl font-bold bg-linear-to-l from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
                  مجلس
                </span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                منصة مساحة العمل المتكاملة المصممة لفرق الشرق الأوسط للتعاون والتواصل وتحقيق المزيد
                معاً.
              </p>
              {/* Social Links */}
              <div className="flex gap-4 mt-6">
                {['twitter', 'linkedin', 'github'].map(social => (
                  <a
                    key={social}
                    href="#"
                    className="h-9 w-9 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors"
                  >
                    <span className="sr-only">{social}</span>
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      {social === 'twitter' && (
                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                      )}
                      {social === 'linkedin' && (
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      )}
                      {social === 'github' && (
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      )}
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">المنتج</h4>
              <ul className="space-y-3">
                {footerLinks.product.map(link => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">الشركة</h4>
              <ul className="space-y-3">
                {footerLinks.company.map(link => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">الموارد</h4>
              <ul className="space-y-3">
                {footerLinks.resources.map(link => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} مجلس. جميع الحقوق محفوظة.
          </p>
          <div className="flex gap-6">
            {footerLinks.legal.map(link => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
