import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";

function NavItem({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `px-3 py-2 rounded-xl text-sm font-medium transition ${
          isActive ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function Layout({ user, onSignOut, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2 font-semibold text-zinc-900">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-white">
                ST
              </span>
              <span className="hidden sm:block">Spatial test Catalog</span>
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              <NavItem to="/">Catalog</NavItem>
              <NavItem to="/About">About</NavItem>
              <NavItem to="/Contact">Contact</NavItem>
              {user && <NavItem to="/my">My entries</NavItem>}
              {user && <NavItem to="/edit">Add</NavItem>}
              {user && <NavItem to="/profile">Profile</NavItem>}
              
            </nav>

            <div className="flex items-center gap-2">
              {!user ? (
                <Link
                  to="/login"
                  className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Login
                </Link>
              ) : (
                <button
                  onClick={onSignOut}
                  className="rounded-xl border px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
                >
                  Sign out
                </button>
              )}

              <button
                className="md:hidden rounded-xl border px-3 py-2 text-sm hover:bg-zinc-100"
                onClick={() => setOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                ☰
              </button>
            </div>
          </div>

          {open && (
            <div className="md:hidden pb-3">
              <div className="flex flex-col gap-2">
                <NavItem to="/" onClick={() => setOpen(false)}>Catalog</NavItem>
                {user && <NavItem to="/my" onClick={() => setOpen(false)}>My entries</NavItem>}
                {user && <NavItem to="/edit" onClick={() => setOpen(false)}>Add</NavItem>}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 text-sm text-zinc-500">
          © {new Date().getFullYear()}  • Spatial Test Catalog
        </div>
      </footer>
    </div>
  );
}
