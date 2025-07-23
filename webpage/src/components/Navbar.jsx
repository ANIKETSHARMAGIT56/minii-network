// src/components/Navbar.jsx
import "tailwindcss";
import "daisyui";

export default function Navbar({ onLogout }) {
  return (
    <nav className="navbar bg-base-200 rounded-box shadow mb-4">
      <div className="flex-1">
        <a className="btn btn-ghost text-xl normal-case">Minii Network</a>
      </div>
      <div className="flex-none">
        <button className="btn btn-error" onClick={onLogout}>Logout</button>
      </div>
    </nav>
  );
}
