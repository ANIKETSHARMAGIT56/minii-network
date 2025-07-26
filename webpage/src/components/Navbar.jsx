// src/components/Navbar.jsx
import React from "react";

export default function Navbar({ onLogout, currentView, setCurrentView }) {
  const navItems = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'friends', label: 'Friends' },
    { key: 'animations', label: 'Animations' },
    { key: 'profile', label: 'Profile' },
  ];

  return (
    <nav className="navbar bg-base-200 shadow-lg">
      <div className="navbar-start">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16"></path>
            </svg>
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            {navItems.map(item => (
              <li key={item.key}>
                <button 
                  onClick={() => setCurrentView(item.key)}
                  className={currentView === item.key ? 'active' : ''}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <button 
          className="btn btn-ghost text-xl normal-case"
          onClick={() => setCurrentView('dashboard')}
        >
          Minii
        </button>
      </div>

      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          {navItems.map(item => (
            <li key={item.key}>
              <button 
                onClick={() => setCurrentView(item.key)}
                className={`btn btn-ghost ${currentView === item.key ? 'btn-active' : ''}`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="navbar-end">
        <button className="btn btn-error" onClick={onLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
