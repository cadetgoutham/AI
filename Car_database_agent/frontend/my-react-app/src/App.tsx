import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import Databaseshow from "./Components/Databaseshow";
import Home from "./Components/Home";
import { AIPromptBox } from "./Components/AIPromptBox";
import { ToastProvider } from "./Components/ToastProvider";

const NAV_ITEMS = [
  { to: "/cars", icon: "🚗", label: "My cars" },
  { to: "/prompt", icon: "✨", label: "Ask AI" },
  { to: "/add", icon: "➕", label: "Add manually" },
];

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="app">
          <header className="top-bar">
            <span className="brand">
              <span className="brand-mark" aria-hidden="true">🚗</span>
              Car Manager
            </span>
          </header>

          <main className="page-content">
            <Routes>
              <Route path="/" element={<Navigate to="/cars" replace />} />
              <Route path="/cars" element={<Databaseshow />} />
              <Route path="/prompt" element={<AIPromptBox />} />
              <Route path="/add" element={<Home />} />
              <Route path="*" element={<Navigate to="/cars" replace />} />
            </Routes>
          </main>

          <nav className="nav-bar" aria-label="Main">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className="nav-button">
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;