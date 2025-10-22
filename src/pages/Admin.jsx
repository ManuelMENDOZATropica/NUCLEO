import React, { useEffect, useMemo, useState } from "react";

const pageStyles = {
  wrapper: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "32px 24px 96px",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  card: {
    background: "#ffffff",
    borderRadius: 20,
    padding: 32,
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e2e8f0",
  },
  title: {
    margin: 0,
    fontSize: 26,
    color: "#0f172a",
    lineHeight: 1.2,
  },
  description: {
    marginTop: 12,
    fontSize: 15,
    color: "#475569",
    lineHeight: 1.6,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "14px 12px",
    fontSize: 13,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    borderBottom: "1px solid #e2e8f0",
  },
  td: {
    padding: "16px 12px",
    fontSize: 15,
    color: "#0f172a",
    borderBottom: "1px solid #f1f5f9",
  },
  select: {
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid #cbd5f5",
    fontSize: 14,
    color: "#0f172a",
    background: "#f8fafc",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 24,
    flexWrap: "wrap",
  },
  saveButton: isSaving => ({
    border: "none",
    borderRadius: 14,
    background: isSaving ? "#cbd5f5" : "#2563eb",
    color: isSaving ? "#1e293b" : "#f8fafc",
    padding: "10px 20px",
    fontSize: 15,
    fontWeight: 600,
    cursor: isSaving ? "wait" : "pointer",
    transition: "background 0.2s ease",
  }),
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 14,
    padding: 14,
    color: "#b91c1c",
    fontSize: 14,
  },
  badge: color => ({
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    background: color,
    color: "#0f172a",
  }),
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

export default function AdminPage({
  members = [],
  onSave,
  isSaving = false,
  isLoading = false,
  error = "",
  canEdit = false,
  currentUserEmail = "",
}) {
  const [draftRoles, setDraftRoles] = useState({});
  const normalizedCurrentEmail = (currentUserEmail || "").toLowerCase();

  useEffect(() => {
    if (isLoading) {
      setDraftRoles({});
      return;
    }
    const nextRoles = {};
    members.forEach(member => {
      const key = member.email.toLowerCase();
      nextRoles[key] = member.role || "viewer";
    });
    setDraftRoles(nextRoles);
  }, [members, isLoading]);

  const handleRoleChange = (email, role) => {
    const key = email.toLowerCase();
    setDraftRoles(prev => ({ ...prev, [key]: role }));
  };

  const handleSave = () => {
    if (!canEdit || typeof onSave !== "function" || isLoading) return;
    onSave(draftRoles);
  };

  const adminCount = useMemo(
    () => members.filter(member => (member.role || "viewer") === "admin").length,
    [members]
  );

  const hasChanges = useMemo(
    () =>
      !isLoading &&
      members.some(member => {
        const key = member.email.toLowerCase();
        const original = member.role || "viewer";
        const draft = draftRoles[key] || original;
        return draft !== original;
      }),
    [draftRoles, members, isLoading]
  );

  return (
    <div style={pageStyles.wrapper}>
      <section style={pageStyles.card}>
        <span style={pageStyles.badge("#dbeafe")}>Roles de usuario</span>
        <h1 style={pageStyles.title}>Administración de privilegios</h1>
        <p style={pageStyles.description}>
          Asigna niveles de acceso a los miembros del equipo. Solo los administradores pueden modificar
          los roles y los cambios se guardan de forma inmediata en la base de datos JSON del proyecto.
        </p>
      </section>

      <section style={pageStyles.card}>
        <div style={{ overflowX: "auto" }}>
          <table style={pageStyles.table}>
            <thead>
              <tr>
                <th style={pageStyles.th}>Nombre</th>
                <th style={pageStyles.th}>Correo</th>
                <th style={pageStyles.th}>Rol</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td style={{ ...pageStyles.td, textAlign: "center" }} colSpan={3}>
                    Cargando usuarios…
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td style={{ ...pageStyles.td, textAlign: "center" }} colSpan={3}>
                    No hay miembros registrados todavía.
                  </td>
                </tr>
              ) : (
                members.map(member => {
                  const normalizedEmail = member.email.toLowerCase();
                  const roleValue = draftRoles[normalizedEmail] || member.role || "viewer";
                  const isProtectedAdmin =
                    normalizedEmail === normalizedCurrentEmail && normalizedEmail === "manuel@tropica.me";
                  return (
                    <tr key={member.email}>
                      <td style={pageStyles.td}>
                        <div style={{ fontWeight: 600 }}>{member.name || "(Sin nombre)"}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                          {normalizedEmail === normalizedCurrentEmail ? "Tu usuario" : "Miembro"}
                        </div>
                      </td>
                      <td style={pageStyles.td}>
                        <span style={{ fontFamily: "'Space Grotesk', monospace" }}>{member.email}</span>
                      </td>
                      <td style={pageStyles.td}>
                        <select
                          value={roleValue}
                          onChange={event => handleRoleChange(member.email, event.target.value)}
                          style={pageStyles.select}
                          disabled={!canEdit || isProtectedAdmin}
                        >
                          {ROLE_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {error && <div style={pageStyles.error}>{error}</div>}

        <div style={pageStyles.footer}>
          <div style={{ fontSize: 13, color: "#475569" }}>
            Administradores actuales: <strong>{adminCount}</strong>
          </div>
          <button
            type="button"
            style={pageStyles.saveButton(isSaving || !hasChanges || isLoading)}
            onClick={handleSave}
            disabled={!canEdit || isSaving || !hasChanges || isLoading}
          >
            {isSaving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </section>
    </div>
  );
}
