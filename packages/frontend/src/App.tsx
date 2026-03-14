import { Routes, Route, Link, useLocation } from "react-router-dom"
import { Users, Plug } from "lucide-react"
import LeadsPage from "./pages/LeadsPage.js"
import LeadDetailPage from "./pages/LeadDetailPage.js"
import PluginsPage from "./pages/PluginsPage.js"

const navItems = [
  { path: "/", label: "Leads", icon: Users },
  { path: "/plugins", label: "Plugins", icon: Plug },
]

export default function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen flex">
      <nav className="w-56 bg-white border-r border-gray-200 p-4 flex flex-col gap-1">
        <h1 className="text-lg font-bold mb-4 px-3">Lead Generator</h1>
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path)
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      <main className="flex-1 p-6">
        <Routes>
          <Route path="/" element={<LeadsPage />} />
          <Route path="/leads/:id" element={<LeadDetailPage />} />
          <Route path="/plugins" element={<PluginsPage />} />
        </Routes>
      </main>
    </div>
  )
}
