import React, { useMemo, useState } from "react";

const containerStyle = {
  maxWidth: 1120,
  margin: "0 auto",
  padding: "32px 24px 80px",
  display: "grid",
  gap: 24,
};

const cardStyle = {
  background: "#ffffff",
  borderRadius: 20,
  border: "1px solid #e2e8f0",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
  padding: 28,
  display: "grid",
  gap: 20,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
};

const headerCellStyle = {
  textAlign: "left",
  fontSize: 13,
  textTransform: "uppercase",
  color: "#64748b",
  letterSpacing: "0.08em",
  padding: "12px 16px",
  borderBottom: "1px solid #e2e8f0",
};

const cellStyle = {
  padding: "16px",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 14,
  color: "#0f172a",
  verticalAlign: "top",
};

const badgeStyles = {
  Admin: { background: "rgba(34, 197, 94, 0.18)", color: "#15803d" },
  Editor: { background: "rgba(59, 130, 246, 0.18)", color: "#1d4ed8" },
  Viewer: { background: "rgba(148, 163, 184, 0.2)", color: "#475569" },
};

const roleSelectStyle = {
  borderRadius: 12,
  border: "1px solid #cbd5f5",
  padding: "8px 12px",
  fontSize: 13,
  color: "#0f172a",
  background: "#f8fafc",
};

const actionButtonStyle = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#f1f5f9",
  color: "#0f172a",
  padding: "8px 12px",
  fontSize: 12,
  cursor: "pointer",
};

const formRowStyle = {
  display: "grid",
  gap: 16,
};

const inputStyle = {
  borderRadius: 12,
  border: "1px solid #cbd5f5",
  padding: "10px 14px",
  fontSize: 14,
  color: "#0f172a",
  background: "#f8fafc",
};

function RoleBadge({ role }) {
  const style = badgeStyles[role] || badgeStyles.Viewer;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        ...style,
      }}
    >
      {role}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("es-MX", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

const DEFAULT_FORM = {
  name: "",
  email: "",
  role: "Viewer",
};

export default function Admin({
  users = [],
  roles = [],
  onCreateUser,
  onUpdateUserRole,
  onDeleteUser,
  currentUserEmail,
  defaultAdminEmail,
  allowedDomain = "tropica.me",
}) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableFeedback, setTableFeedback] = useState("");
  const [tableError, setTableError] = useState("");

  const orderedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const nameA = (a.name || a.email || "").toLowerCase();
      const nameB = (b.name || b.email || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [users]);

  const domainSuffix = `@${allowedDomain.toLowerCase()}`;

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(DEFAULT_FORM);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setFeedback("");
    setTableFeedback("");
    setTableError("");

    const email = form.email.trim().toLowerCase();
    const name = form.name.trim();
    const role = roles.includes(form.role) ? form.role : "Viewer";

    if (!email) {
      setError("El correo es obligatorio.");
      return;
    }

    if (!email.endsWith(domainSuffix)) {
      setError(`Solo se permiten correos ${domainSuffix}`);
      return;
    }

    if (users.some(user => user.email?.toLowerCase() === email)) {
      setError("Ya existe un usuario con ese correo.");
      return;
    }

    const payload = {
      email,
      name: name || email,
      picture: "",
      role,
      createdAt: new Date().toISOString(),
    };

    if (!onCreateUser) {
      setFeedback("Usuario agregado correctamente.");
      resetForm();
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onCreateUser(payload);
      if (!result?.ok) {
        setError(result?.error || "No se pudo agregar el usuario.");
        return;
      }

      setFeedback("Usuario agregado correctamente.");
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDefaultAdmin = (email) =>
    email && defaultAdminEmail && email.toLowerCase() === defaultAdminEmail.toLowerCase();

  const handleRoleChange = async (user, role) => {
    if (!onUpdateUserRole || !user?._id) return;
    setTableFeedback("");
    setTableError("");

    const result = await onUpdateUserRole(user._id, user.email, role);
    if (!result?.ok) {
      setTableError(result?.error || "No se pudo actualizar el privilegio.");
    } else {
      setTableFeedback("Privilegio actualizado correctamente.");
    }
  };

  const handleDelete = async (user) => {
    if (!onDeleteUser || !user?._id) return;
    setTableFeedback("");
    setTableError("");

    const result = await onDeleteUser(user._id, user.email);
    if (!result?.ok) {
      setTableError(result?.error || "No se pudo eliminar el usuario.");
    } else {
      setTableFeedback("Usuario eliminado correctamente.");
    }
  };

  return (
    <div style={containerStyle}>
      <section style={cardStyle}>
        <div style={{ display: "grid", gap: 8 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "flex-start",
              padding: "6px 14px",
              background: "#dbeafe",
              color: "#1d4ed8",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Administración
          </span>
          <h1 style={{ margin: 0, fontSize: 26, color: "#0f172a" }}>Gestión de usuarios</h1>
          <p style={{ margin: 0, fontSize: 15, color: "#475569", lineHeight: 1.6 }}>
            Controla quién tiene acceso a las herramientas de TRÓPICA asignando privilegios de Admin,
            Editor o Viewer. Los cambios se guardan inmediatamente.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ ...cardStyle, padding: 24, gap: 18 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>Agregar usuario</h2>
          <div style={formRowStyle}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, color: "#475569" }}>Nombre</span>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleInputChange}
                placeholder="Nombre completo"
                style={inputStyle}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, color: "#475569" }}>Correo corporativo</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleInputChange}
                placeholder={`usuario${domainSuffix}`}
                style={inputStyle}
                required
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, color: "#475569" }}>Privilegio</span>
              <select
                name="role"
                value={form.role}
                onChange={handleInputChange}
                style={roleSelectStyle}
              >
                {roles.map(role => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              type="submit"
              style={{ ...actionButtonStyle, background: "#1d4ed8", color: "#f8fafc", opacity: isSubmitting ? 0.7 : 1 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Guardando…" : "Guardar usuario"}
            </button>
            <button type="button" onClick={resetForm} style={actionButtonStyle}>
              Limpiar
            </button>
            {feedback && <span style={{ fontSize: 13, color: "#15803d" }}>{feedback}</span>}
            {error && <span style={{ fontSize: 13, color: "#b91c1c" }}>{error}</span>}
          </div>
        </form>
      </section>

      <section style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>Usuarios registrados</h2>
          <span style={{ fontSize: 13, color: "#475569" }}>{users.length} usuarios</span>
        </div>
        {(tableFeedback || tableError) && (
          <div style={{ fontSize: 13, color: tableError ? "#b91c1c" : "#15803d" }}>
            {tableError || tableFeedback}
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={headerCellStyle}>Usuario</th>
                <th style={headerCellStyle}>Correo</th>
                <th style={headerCellStyle}>Privilegio</th>
                <th style={headerCellStyle}>Alta</th>
                <th style={{ ...headerCellStyle, textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orderedUsers.map(user => {
                const email = user.email || "";
                const isCurrentUser = currentUserEmail && email.toLowerCase() === currentUserEmail.toLowerCase();
                const locked = isDefaultAdmin(email);

                return (
                  <tr key={email}>
                    <td style={cellStyle}>
                      <div style={{ display: "grid", gap: 4 }}>
                        <strong>{user.name || email}</strong>
                        <span style={{ fontSize: 12, color: "#64748b" }}>{user.picture ? "Con avatar" : "Sin avatar"}</span>
                      </div>
                    </td>
                    <td style={cellStyle}>
                      <span style={{ fontFamily: "monospace", fontSize: 13 }}>{email}</span>
                    </td>
                    <td style={cellStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <RoleBadge role={user.role} />
                        <select
                          value={user.role}
                          onChange={event => handleRoleChange(user, event.target.value)}
                          style={roleSelectStyle}
                          disabled={locked || !user._id}
                        >
                          {roles.map(role => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td style={cellStyle}>{formatDate(user.createdAt)}</td>
                    <td style={{ ...cellStyle, textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        style={{
                          ...actionButtonStyle,
                          background: "rgba(248, 113, 113, 0.15)",
                          color: "#b91c1c",
                          cursor:
                            locked || isCurrentUser || !user._id ? "not-allowed" : "pointer",
                        }}
                        disabled={locked || isCurrentUser || !user._id}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {orderedUsers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ ...cellStyle, textAlign: "center", color: "#64748b" }}>
                    No hay usuarios registrados todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
