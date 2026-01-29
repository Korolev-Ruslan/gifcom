import React from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import Icon, { HomeIcon, FavoritesIcon, SubscriptionsIcon, PlaylistsIcon, CategoriesIcon, SunIcon, MoonIcon } from "./Icon";
import "../styles/Sidebar.css";
import "../styles/Icon.css";

export default function Sidebar({ collapsed }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={`sidebar-inner ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-top">
        <Link to="/" className="sidebar-link icon-with-text">
          <Icon className="sidebar-icon">
            <HomeIcon />
          </Icon>
          <span className="sidebar-text icon-text">Главная</span>
        </Link>
        <Link to="/favorites" className="sidebar-link icon-with-text">
          <Icon className="sidebar-icon">
            <FavoritesIcon />
          </Icon>
          <span className="sidebar-text icon-text">Избранное</span>
        </Link>
        <button className="sidebar-btn icon-with-text">
          <Icon className="sidebar-icon">
            <SubscriptionsIcon />
          </Icon>
          <span className="sidebar-text icon-text">Подписки</span>
        </button>
        <button className="sidebar-btn icon-with-text">
          <Icon className="sidebar-icon">
            <PlaylistsIcon />
          </Icon>
          <span className="sidebar-text icon-text">Плейлисты</span>
        </button>
        <button className="sidebar-btn icon-with-text">
          <Icon className="sidebar-icon">
            <CategoriesIcon />
          </Icon>
          <span className="sidebar-text icon-text">Категории</span>
        </button>
      </div>
      <div className="sidebar-bottom">
        <button
          className="theme-toggle-btn icon-with-text"
          onClick={toggleTheme}
          title="Переключить тему"
        >
          <Icon className="sidebar-icon">
            {theme === "light" ? <SunIcon /> : <MoonIcon />}
          </Icon>
          <span className="sidebar-text icon-text">Тема</span>
        </button>
        <small>© 2026 GIFCOM</small>
      </div>
    </div>
  );
}