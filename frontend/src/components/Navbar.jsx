import React, { useEffect, useRef, useState } from "react";

const navStyles = {
  container: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: "#0f172a",
    color: "#e2e8f0",
    padding: "12px 24px",
    boxShadow: "0 2px 12px rgba(15, 23, 42, 0.3)",
  },
  inner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: 1120,
    margin: "0 auto",
    gap: 24,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontWeight: 700,
    letterSpacing: "0.02em",
  },
  brandAccent: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(96, 165, 250, 0.18)",
    color: "#93c5fd",
    fontSize: 12,
    textTransform: "uppercase",
  },
  menu: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
  },
  item: isActive => ({
    padding: "8px 14px",
    borderRadius: 12,
    cursor: "pointer",
    color: isActive ? "#0f172a" : "#e2e8f0",
    background: isActive ? "#f8fafc" : "transparent",
    fontWeight: isActive ? 600 : 500,
    transition: "all 0.15s ease",
    border: "none",
  }),
  dropdownWrapper: {
    position: "relative",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    background: "#0f172a",
    borderRadius: 16,
    boxShadow: "0 14px 30px rgba(15, 23, 42, 0.28)",
    padding: 8,
    display: "grid",
    gap: 4,
    minWidth: 200,
    zIndex: 20,
  },
  dropdownItem: isActive => ({
    padding: "10px 14px",
    borderRadius: 12,
    cursor: "pointer",
    background: isActive ? "rgba(148, 197, 253, 0.18)" : "transparent",
    color: isActive ? "#93c5fd" : "#e2e8f0",
    fontWeight: isActive ? 600 : 500,
    border: "none",
    textAlign: "left",
  }),
  caret: isActive => ({
    marginLeft: 8,
    transition: "transform 0.2s ease",
    transform: isActive ? "rotate(180deg)" : "rotate(0deg)",
    display: "inline-flex",
  }),
  user: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
  },
  avatar: {
    height: 36,
    width: 36,
    borderRadius: "50%",
    overflow: "hidden",
    background: "rgba(148, 163, 184, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    color: "#e2e8f0",
  },
  signOut: {
    background: "rgba(148, 163, 184, 0.15)",
    border: "1px solid rgba(148, 163, 184, 0.4)",
    borderRadius: 12,
    padding: "8px 14px",
    color: "#e2e8f0",
    fontSize: 13,
    cursor: "pointer",
  },
};

export default function Navbar({ active = "home", onNavigate, user, onSignOut, showAdmin = false }) {
  const [openMenu, setOpenMenu] = useState(null);
  const iaDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (openMenu === "ia" && iaDropdownRef.current && !iaDropdownRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenu]);

  useEffect(() => {
    setOpenMenu(null);
  }, [active]);

  const handleNavigate = id => {
    onNavigate?.(id);
    setOpenMenu(null);
  };

  const menuItems = [
    { id: "home", label: "Inicio" },
    {
      id: "ia",
      label: "IA",
      children: [
        { id: "ia-automations", label: "Automatizaciones" },
        { id: "ia-licenses", label: "Licencias" },
        { id: "ia-guidelines", label: "Guidelines" },
      ],
    },
  ];

  if (showAdmin) {
    menuItems.push({ id: "admin", label: "Usuarios" });
  }

  return (
    <header style={navStyles.container}>
      <div style={navStyles.inner}>
        <div style={navStyles.brand}>
          <span style={{ fontSize: 18 }}>TRÓPICA NÚCLEO</span>
          <span style={navStyles.brandAccent}>toolkit</span>
        </div>
        <nav style={navStyles.menu}>
          {menuItems.map(item => {
            if (item.children) {
              const isChildActive = item.children.some(child => child.id === active);
              const isOpen = openMenu === item.id;

              return (
                <div key={item.id} style={navStyles.dropdownWrapper} ref={iaDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setOpenMenu(prev => (prev === item.id ? null : item.id))}
                    style={navStyles.item(isChildActive)}
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                  >
                    {item.label}
                    <span style={navStyles.caret(isOpen)}>▾</span>
                  </button>
                  {isOpen ? (
                    <div style={navStyles.dropdown} role="menu">
                      {item.children.map(child => (
                        <button
                          key={child.id}
                          type="button"
                          style={navStyles.dropdownItem(active === child.id)}
                          onClick={() => handleNavigate(child.id)}
                          role="menuitem"
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                style={navStyles.item(active === item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        <div style={navStyles.user}>
          <div style={navStyles.avatar}>
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name || user.email}
                style={{ height: "100%", width: "100%", objectFit: "cover" }}
                referrerPolicy="no-referrer"
              />
            ) : (
              (user?.name || user?.email || "U").charAt(0).toUpperCase()
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            <span style={{ fontWeight: 600 }}>{user?.name || "Usuario"}</span>
            <span style={{ fontSize: 12, color: "#cbd5f5" }}>{user?.email}</span>
          </div>
          <button type="button" onClick={onSignOut} style={navStyles.signOut}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
