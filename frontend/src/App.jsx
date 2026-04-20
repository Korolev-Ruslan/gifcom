import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
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
import Icon, { NotificationsIcon, HamburgerIcon, SearchIcon } from "./components/Icon";
import "./App.css";
import Sidebar from "./components/Sidebar";
import Favorites from "./pages/Favorites";
import { notificationApi } from "./api/api";

function AppInner() {
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
    } catch (error) {}
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

  const location = useLocation();
  const isGifDetail = location.pathname.startsWith("/gif/");

  return (
    <>
      <nav className="navbar">
        <div className="container">
          <div className="nav-left">
            {!isGifDetail && (
              <button
                className="menu-toggle"
                aria-label="Toggle sidebar"
                onClick={toggleSidebar}
              >
                <HamburgerIcon />
              </button>
            )}

            <Link to="/" className="logo">
              GIFCOM
            </Link>
          </div>

          <div className="nav-center">
            <form className="search-form" onSubmit={(e) => e.preventDefault()}>
              <SearchAutocomplete />
              <button className="search-btn">
                <SearchIcon />
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
      <div className={`layout ${isGifDetail ? "layout-full" : ""}`}>
        {!isGifDetail && (
          <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
            <Sidebar collapsed={sidebarCollapsed} />
          </aside>
        )}
        <main className={`main-content ${sidebarCollapsed ? "collapsed" : ""} ${isGifDetail ? "full" : ""}`}>
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
    </>
  );
}

function App() {
  return (
    <Router future={{ v7_startTransition: true }}>
      <AppInner />
    </Router>
  );
}

export default App;