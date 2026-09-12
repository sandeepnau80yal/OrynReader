import { Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";

const THEME_ICON = { dark: "🌙", light: "☀️", sepia: "🎨" };

// showHome: shows the 🏠 button (reader.html had this alongside the logo)
// showLogout: shows a Logout button (mybooks.html had this)
export default function Header({ showHome = false, showLogout = false }) {
  const { theme, cycleTheme } = useTheme();
  const { logout } = useAuth();

  return (
    <header>
      <Link to="/" className="logo">
        <span>📚</span> Oryn Reader
      </Link>
      <div className="nav-buttons">
        {showHome && (
          <Link to="/library">
            <button aria-label="Home">🏠</button>
          </Link>
        )}
        {showLogout && <button onClick={logout}>Logout</button>}
        <button onClick={cycleTheme} aria-label="Cycle theme">
          {THEME_ICON[theme]}
        </button>
      </div>
    </header>
  );
}
