import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "./context/ThemeContext";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import AdminPanel from "./pages/AdminPanel";
import GifDetail from "./pages/GifDetail";
import UserProfile from "./pages/UserProfile";
import Notifications from "./pages/Notifications";
import WebApp from "./pages/WebApp";
import NotificationsModal from "./components/NotificationsModal";
import AvatarMenu from "./components/AvatarMenu";
import AuthModal from "./components/AuthModal";
import SearchAutocomplete from "./components/SearchAutocomplete";
import Icon, { NotificationsIcon } from "./components/Icon";
import "./App.css";
import Sidebar from "./components/Sidebar";
import Favorites from "./pages/Favorites";
import { notificationApi } from "./api/api";

function App() {
  const { theme } = useTheme();
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (token && userData) {
      setUser(JSON.parse(userData));
      fetchUnreadCount();
      const interval = setInterval(() => fetchUnreadCount(), 30000);
      return () => clearInterval(interval);
    }
  }, []);

  const fetchUnreadCount = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await notificationApi.getUnreadCount(token);
      setUnreadCount(response.data.unread_count);
    } catch (error) {
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setUnreadCount(0);
  };

  const handleUploadClick = () => {
    if (user) {
      window.location.href = "/upload";
    } else {
      setShowAuthModal(true);
    }
  };

  const bellRef = useRef(null);
  const [showBellModal, setShowBellModal] = useState(false);
  const avatarRef = useRef(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => setSidebarCollapsed((s) => !s);

  const handleBellToggle = () => {
    setShowBellModal((prev) => !prev);
  };

  const handleBellAction = () => {
    fetchUnreadCount();
  };

  return (
    <Router future={{ v7_startTransition: true }}>
      <nav className="navbar">
        <div className="container">
          <div className="nav-left">
            <button
              className="menu-toggle"
              aria-label="Toggle sidebar"
              onClick={toggleSidebar}
            >
              ☰
            </button>
            <Link to="/" className="logo">
              GIFCOM
            </Link>
          </div>

          <div className="nav-center">
            <form className="search-form" onSubmit={(e) => e.preventDefault()}>
              <SearchAutocomplete />
<button className="search-btn">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </button>
            </form>
          </div>
          <div className="nav-right">
            <button
              className="btn-plus"
              title="Загрузить"
              onClick={handleUploadClick}
            >
              ＋
            </button>
            {user ? (
              <>
                <button
                  ref={bellRef}
                  onClick={handleBellToggle}
                  className="notification-link btn-icon"
                  aria-label="Notifications"
                >
                  <Icon size={24}>
                    <NotificationsIcon size={24} />
                  </Icon>
                  {unreadCount > 0 && (
                    <span className="badge">{unreadCount}</span>
                  )}
                </button>
                {user.role === "admin" && (
                  <Link to="/admin" className="nav-link">
                    Администрирование
                  </Link>
                )}
                {showBellModal && (
                  <NotificationsModal
                    anchorRef={bellRef}
                    onClose={() => setShowBellModal(false)}
                    onAction={handleBellAction}
                  />
                )}

                <button
                  ref={avatarRef}
                  className="avatar-btn"
                  onClick={() => setShowAvatarMenu((prev) => !prev)}
                >
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=333&color=fff&size=32`}
                    alt="avatar"
                  />
                </button>
                {showAvatarMenu && (
                  <AvatarMenu
                    anchorRef={avatarRef}
                    onClose={() => setShowAvatarMenu(false)}
                    onLogout={handleLogout}
                  />
                )}
              </>
            ) : (
              <>
                <button
                  className="nav-link"
                  onClick={() => setShowAuthModal(true)}
                >
                  Вход
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
      <div className="layout">
        <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
          <Sidebar collapsed={sidebarCollapsed} />
        </aside>
        <main className={`main-content ${sidebarCollapsed ? "collapsed" : ""}`}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/upload"
              element={
                user ? (
                  <Upload setUser={setUser} />
                ) : (
                  <AuthModal
                    isOpen={true}
                    onClose={() => {}}
                    onLoginSuccess={setUser}
                  />
                )
              }
            />
            <Route
              path="/admin"
              element={user?.role === "admin" ? <AdminPanel /> : <Home />}
            />
            <Route path="/gif/:id" element={<GifDetail user={user} />} />
            <Route
              path="/channel/:username"
              element={<UserProfile user={user} />}
            />
            <Route
              path="/notifications"
              element={
                user ? (
                  <Notifications />
                ) : (
                  <AuthModal
                    isOpen={true}
                    onClose={() => {}}
                    onLoginSuccess={setUser}
                  />
                )
              }
            />
            <Route path="/web-app" element={<WebApp />} />
            <Route
              path="/favorites"
              element={
                user ? (
                  <Favorites />
                ) : (
                  <AuthModal
                    isOpen={true}
                    onClose={() => {}}
                    onLoginSuccess={setUser}
                  />
                )
              }
            />
          </Routes>
        </main>
      </div>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={setUser}
      />
    </Router>
  );
}

export default App;