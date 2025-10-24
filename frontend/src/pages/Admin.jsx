import React, { useEffect, useMemo, useState } from "react";

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

const tabsContainerStyle = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const tabButtonStyle = (isActive) => ({
  borderRadius: 999,
  border: "1px solid #cbd5f5",
  background: isActive ? "#1d4ed8" : "#f1f5f9",
  color: isActive ? "#f8fafc" : "#0f172a",
  padding: "8px 18px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.16s ease",
});

const licenseListStyle = {
  display: "grid",
  gap: 16,
};

const licenseItemStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 20,
  background: "#ffffff",
  display: "grid",
  gap: 12,
};

const textAreaStyle = {
  ...inputStyle,
  minHeight: 96,
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

const DEFAULT_LICENSE_FORM = {
  categoria: "",
  nombre: "",
  licencia: "",
  enlace: "",
  logo: "",
  subHerramientas: "",
  usos: "",
};

const parseList = (value) =>
  (value || "")
    .split(/[\n,]/)
    .map(item => item.trim())
    .filter(Boolean);

const stringifyList = (value) => (Array.isArray(value) ? value.join(", ") : "");

export default function Admin({
  users = [],
  roles = [],
  onCreateUser,
  onUpdateUserRole,
  onDeleteUser,
  currentUserEmail,
  defaultAdminEmail,
  allowedDomain = "tropica.me",
  currentRole = "Viewer",
  licenses = [],
  onCreateLicense,
  onUpdateLicense,
  onDeleteLicense,
}) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableFeedback, setTableFeedback] = useState("");
  const [tableError, setTableError] = useState("");

  const [activeTab, setActiveTab] = useState(() =>
    currentRole === "Admin" ? "users" : "licenses"
  );

  const [licenseForm, setLicenseForm] = useState(DEFAULT_LICENSE_FORM);
  const [licenseFeedback, setLicenseFeedback] = useState("");
  const [licenseError, setLicenseError] = useState("");
  const [licenseSubmitting, setLicenseSubmitting] = useState(false);
  const [editingLicenseId, setEditingLicenseId] = useState(null);

  const canManageUsers = currentRole === "Admin";
  const canManageLicenses = currentRole === "Admin" || currentRole === "Editor";

  useEffect(() => {
    if (!canManageUsers && activeTab === "users" && canManageLicenses) {
      setActiveTab("licenses");
    } else if (!canManageLicenses && activeTab === "licenses" && canManageUsers) {
      setActiveTab("users");
    }
  }, [activeTab, canManageUsers, canManageLicenses]);

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

  const handleLicenseInputChange = (event) => {
    const { name, value } = event.target;
    setLicenseForm(prev => ({ ...prev, [name]: value }));
  };

  const resetLicenseForm = () => {
    setLicenseForm(DEFAULT_LICENSE_FORM);
    setEditingLicenseId(null);
  };

  const handleLicenseSubmit = async (event) => {
    event.preventDefault();
    setLicenseError("");
    setLicenseFeedback("");

    const payload = {
      categoria: licenseForm.categoria.trim(),
      nombre: licenseForm.nombre.trim(),
      licencia: licenseForm.licencia.trim(),
      enlace: licenseForm.enlace.trim(),
      logo: licenseForm.logo.trim(),
      subHerramientas: parseList(licenseForm.subHerramientas),
      usos: parseList(licenseForm.usos),
    };

    if (!payload.categoria || !payload.nombre) {
      setLicenseError("Categoría y nombre son obligatorios.");
      return;
    }

    if (!onCreateLicense && !onUpdateLicense) {
      setLicenseFeedback("Cambios guardados.");
      resetLicenseForm();
      return;
    }

    setLicenseSubmitting(true);
    try {
      let result;
      if (editingLicenseId) {
        result = await onUpdateLicense?.(editingLicenseId, payload);
      } else {
        result = await onCreateLicense?.(payload);
      }

      if (!result?.ok) {
        setLicenseError(result?.error || "No se pudieron guardar los cambios.");
        return;
      }

      setLicenseFeedback(editingLicenseId ? "Licencia actualizada correctamente." : "Licencia creada correctamente.");
      resetLicenseForm();
    } finally {
      setLicenseSubmitting(false);
    }
  };

  const startLicenseEdit = (license) => {
    if (!license) return;
    setEditingLicenseId(license._id || null);
    setLicenseForm({
      categoria: license.categoria || "",
      nombre: license.nombre || "",
      licencia: license.licencia || "",
      enlace: license.enlace || "",
      logo: license.logo || "",
      subHerramientas: stringifyList(license.subHerramientas),
      usos: stringifyList(license.usos),
    });
    setLicenseFeedback("");
    setLicenseError("");
  };

  const handleLicenseDelete = async (license) => {
    if (!onDeleteLicense || !license?._id) return;
    setLicenseFeedback("");
    setLicenseError("");

    const result = await onDeleteLicense(license._id);
    if (!result?.ok) {
      setLicenseError(result?.error || "No se pudo eliminar la licencia.");
    } else {
      setLicenseFeedback("Licencia eliminada correctamente.");
      if (editingLicenseId === license._id) {
        resetLicenseForm();
      }
    }
  };

  return (
    <div style={containerStyle}>
      <section style={{ ...cardStyle, gap: 16 }}>
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
            Panel de administración
          </span>
          <h1 style={{ margin: 0, fontSize: 26, color: "#0f172a" }}>Gestiona los recursos de TRÓPICA</h1>
          <p style={{ margin: 0, fontSize: 15, color: "#475569", lineHeight: 1.6 }}>
            Selecciona una pestaña para administrar usuarios o licencias según tus privilegios.
          </p>
        </div>
        <div style={tabsContainerStyle}>
          {canManageUsers && (
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              style={tabButtonStyle(activeTab === "users")}
            >
              Gestionar usuarios
            </button>
          )}
          {canManageLicenses && (
            <button
              type="button"
              onClick={() => setActiveTab("licenses")}
              style={tabButtonStyle(activeTab === "licenses")}
            >
              Gestionar licencias
            </button>
          )}
        </div>
      </section>

      {activeTab === "users" && canManageUsers && (
        <>
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
              <h2 style={{ margin: 0, fontSize: 22, color: "#0f172a" }}>Gestión de usuarios</h2>
              <p style={{ margin: 0, fontSize: 15, color: "#475569", lineHeight: 1.6 }}>
                Controla quién tiene acceso a las herramientas de TRÓPICA asignando privilegios de Admin,
                Editor o Viewer. Los cambios se guardan inmediatamente.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ ...cardStyle, padding: 24, gap: 18 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>Agregar usuario</h3>
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
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>Usuarios registrados</h3>
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
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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
                              cursor: locked || isCurrentUser || !user._id ? "not-allowed" : "pointer",
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
        </>
      )}

      {activeTab === "licenses" && canManageLicenses && (
        <>
          <section style={cardStyle}>
            <div style={{ display: "grid", gap: 8 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  padding: "6px 14px",
                  background: "#dcfce7",
                  color: "#15803d",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Catálogo de licencias
              </span>
              <h2 style={{ margin: 0, fontSize: 22, color: "#0f172a" }}>
                {editingLicenseId ? "Editar licencia" : "Registrar nueva licencia"}
              </h2>
              <p style={{ margin: 0, fontSize: 15, color: "#475569", lineHeight: 1.6 }}>
                Completa la información para mantener actualizado el catálogo compartido de herramientas y licencias de TRÓPICA.
              </p>
            </div>

            <form onSubmit={handleLicenseSubmit} style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "#475569" }}>Categoría *</span>
                  <input
                    type="text"
                    name="categoria"
                    value={licenseForm.categoria}
                    onChange={handleLicenseInputChange}
                    style={inputStyle}
                    placeholder="Diseño, Automatización, Análisis..."
                    required
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "#475569" }}>Nombre *</span>
                  <input
                    type="text"
                    name="nombre"
                    value={licenseForm.nombre}
                    onChange={handleLicenseInputChange}
                    style={inputStyle}
                    placeholder="Nombre de la herramienta"
                    required
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "#475569" }}>Tipo de licencia</span>
                  <input
                    type="text"
                    name="licencia"
                    value={licenseForm.licencia}
                    onChange={handleLicenseInputChange}
                    style={inputStyle}
                    placeholder="Licencia educativa, empresarial..."
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "#475569" }}>Enlace</span>
                  <input
                    type="url"
                    name="enlace"
                    value={licenseForm.enlace}
                    onChange={handleLicenseInputChange}
                    style={inputStyle}
                    placeholder="https://..."
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "#475569" }}>Logo</span>
                  <input
                    type="url"
                    name="logo"
                    value={licenseForm.logo}
                    onChange={handleLicenseInputChange}
                    style={inputStyle}
                    placeholder="URL del logo"
                  />
                </label>
              </div>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#475569" }}>Sub-herramientas (separadas por coma o salto de línea)</span>
                <textarea
                  name="subHerramientas"
                  value={licenseForm.subHerramientas}
                  onChange={handleLicenseInputChange}
                  style={textAreaStyle}
                  placeholder="Componente A, Complemento B"
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#475569" }}>Usos recomendados (separados por coma o salto de línea)</span>
                <textarea
                  name="usos"
                  value={licenseForm.usos}
                  onChange={handleLicenseInputChange}
                  style={textAreaStyle}
                  placeholder="Diseño UI, Automatización de reportes..."
                />
              </label>

              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="submit"
                  style={{
                    ...actionButtonStyle,
                    background: "#15803d",
                    color: "#f8fafc",
                    opacity: licenseSubmitting ? 0.7 : 1,
                  }}
                  disabled={licenseSubmitting}
                >
                  {licenseSubmitting
                    ? "Guardando…"
                    : editingLicenseId
                    ? "Actualizar licencia"
                    : "Crear licencia"}
                </button>
                <button type="button" onClick={resetLicenseForm} style={actionButtonStyle}>
                  Limpiar
                </button>
                {licenseFeedback && <span style={{ fontSize: 13, color: "#15803d" }}>{licenseFeedback}</span>}
                {licenseError && <span style={{ fontSize: 13, color: "#b91c1c" }}>{licenseError}</span>}
              </div>
            </form>
          </section>

          <section style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>Licencias registradas</h3>
              <span style={{ fontSize: 13, color: "#475569" }}>{licenses.length} licencias</span>
            </div>
            {licenseFeedback && <div style={{ fontSize: 13, color: "#15803d" }}>{licenseFeedback}</div>}
            {licenseError && <div style={{ fontSize: 13, color: "#b91c1c" }}>{licenseError}</div>}

            <div style={licenseListStyle}>
              {licenses.map(license => (
                <div key={license._id || `${license.nombre}-${license.enlace}`} style={licenseItemStyle}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "#2563eb", fontWeight: 600 }}>
                      {license.categoria || "Sin categoría"}
                    </span>
                    <h4 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>{license.nombre}</h4>
                    {license.licencia && (
                      <span style={{ fontSize: 13, color: "#475569" }}>{license.licencia}</span>
                    )}
                    {license.enlace && (
                      <a
                        href={license.enlace}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 13, color: "#1d4ed8", textDecoration: "underline" }}
                      >
                        Abrir enlace
                      </a>
                    )}
                  </div>

                  {Array.isArray(license.subHerramientas) && license.subHerramientas.length > 0 && (
                    <div style={{ display: "grid", gap: 6 }}>
                      <strong style={{ fontSize: 13, color: "#0f172a" }}>Sub-herramientas</strong>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                        {license.subHerramientas.map(item => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(license.usos) && license.usos.length > 0 && (
                    <div style={{ display: "grid", gap: 6 }}>
                      <strong style={{ fontSize: 13, color: "#0f172a" }}>Usos</strong>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                        {license.usos.map(item => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => startLicenseEdit(license)}
                      style={{ ...actionButtonStyle, background: "#e0f2fe", color: "#0369a1" }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLicenseDelete(license)}
                      style={{ ...actionButtonStyle, background: "rgba(248, 113, 113, 0.15)", color: "#b91c1c" }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}

              {licenses.length === 0 && (
                <div style={{ ...licenseItemStyle, textAlign: "center", color: "#64748b" }}>
                  Aún no hay licencias registradas.
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
