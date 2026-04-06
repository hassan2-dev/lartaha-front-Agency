import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "../ui/button"
import { Menu, X } from "lucide-react"

const navLinks = [
  { name: "المميزات", href: "#features" },
  { name: "الأسعار", href: "#pricing" },
  { name: "من نحن", href: "#about" },
  { name: "تواصل معنا", href: "#contact" },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-0.5">
            <img src="/logo-color.svg" className="w-14 h-14" />
            <span className="text-xl font-bold bg-linear-to-l from-indigo-600 to-indigo-800 bg-clip-text text-transparent">مجلس</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-foreground hover:text-indigo-600"
              onClick={() => navigate('/login')}
            >
              تسجيل الدخول
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/25"
              onClick={() => navigate('/signup')}
            >
              ابدأ مجاناً
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  className="justify-start hover:text-indigo-600"
                  onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                >
                  تسجيل الدخول
                </Button>
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => { navigate('/signup'); setMobileMenuOpen(false); }}
                >
                  ابدأ مجاناً
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
