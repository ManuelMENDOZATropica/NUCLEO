import React from "react";

const containerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
  maxWidth: 960,
  margin: "0 auto",
  padding: "32px 24px 80px",
};

const cardStyle = {
  background: "#ffffff",
  borderRadius: 20,
  padding: 32,
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e2e8f0",
};

const titleStyle = {
  margin: 0,
  fontSize: 28,
  color: "#0f172a",
  lineHeight: 1.2,
};

const bodyStyle = {
  margin: "12px 0 0",
  fontSize: 16,
  color: "#475569",
  lineHeight: 1.6,
};

// --- Estilos para el formulario ---
const formGroupStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginBottom: 16,
};

const labelStyle = {
  fontWeight: 600,
  fontSize: 14,
  color: "#334155",
};

const inputStyle = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 15,
  width: "100%", 
  boxSizing: "border-box", 
  background: "#fff", 
};

const buttonStyle = {
  background: "#1d4ed8",
  color: "white",
  padding: "12px 20px",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 15,
  width: "auto", 
};
// --- Fin de estilos ---

export default function Home({ user, role = "Viewer" }) {
  return (
    <div style={containerStyle}>
      <section style={cardStyle}>
        <span style={{ display: "inline-block", padding: "6px 12px", background: "#dbeafe", color: "#1d4ed8", borderRadius: 999, fontWeight: 600, fontSize: 12 }}>
          Bienvenido
        </span>
        <h1 style={titleStyle}>Hola, {user?.name?.split(" ")[0] || "equipo"}</h1>
        <p style={bodyStyle}>
          Este es tu panel principal de herramientas TRÓPICA. Desde aquí puedes explorar las licencias
          disponibles, sus alcances y los casos de uso recomendados para cada miembro del equipo.
        </p>
        <div
          style={{
            marginTop: 18,
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid #cbd5f5",
            background: "#f8fafc",
            color: "#1e293b",
            fontSize: 14,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <strong style={{ fontSize: 13, color: "#1d4ed8", letterSpacing: "0.04em" }}>TU PRIVILEGIO</strong>
          <span>
            Actualmente tienes permisos de <b>{role}</b>. Esto define qué acciones puedes realizar dentro del
            núcleo, incluyendo la administración de usuarios y licencias.
          </span>
        </div>
      </section>
      <section style={{ ...cardStyle, display: "grid", gap: 18 }}>
        <h2 style={{ ...titleStyle, fontSize: 20 }}>¿Qué encontrarás?</h2>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#475569", fontSize: 15, lineHeight: 1.7 }}>
          <li>Listado curado de licencias activas por categoría.</li>
          <li>Descripción de sub-herramientas, usos y recursos externos.</li>
          <li>Actualizaciones periódicas del stack creativo y de automatización.</li>
        </ul>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {["IA y Automatización", "Diseño y Creatividad", "Audio y Voz"].map(tag => (
            <span
              key={tag}
              style={{
                background: "#f1f5f9",
                color: "#0f172a",
                borderRadius: 999,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      {/* --- INICIO DEL FORMULARIO FUNCIONAL --- */}
      <section style={cardStyle}>
        <h2 style={{ ...titleStyle, fontSize: 20, marginBottom: 20 }}>Crear Nuevo Proyecto</h2>
        <form 
          action="https://tropica.app.n8n.cloud/webhook/31d2811f-a9ed-4220-8157-ed1a95b3d64b" 
          method="POST"
        >
          
          {/* Campo: Nombre del proyecto */}
          <div style={formGroupStyle}>
            <label htmlFor="nombre_proyecto" style={labelStyle}>Nombre del proyecto:</label>
            <input 
              type="text" 
              id="nombre_proyecto" 
              name="name" // <-- CRÍTICO: Coincide con tu código n8n
              style={inputStyle} 
              placeholder="Ej: Campaña Verano | MX"
              required
            />
          </div>
          
          {/* Campo: País (Dropdown) */}
          <div style={formGroupStyle}>
            <label htmlFor="pais_proyecto" style={labelStyle}>País:</label>
            <select 
              id="pais_proyecto" 
              name="País" // <-- CRÍTICO: Coincide con tu código n8n (con tilde)
              style={inputStyle}
              required
              defaultValue="" // Para forzar al usuario a elegir una opción
            >
              <option value="" disabled>Selecciona un país</option>
              <option value="AR">Argentina</option>
              <option value="BR">Brasil</option>
              <option value="CO">Colombia</option>
              <option value="MX">México</option>
            </select>
          </div>

          <button type="submit" style={buttonStyle}>
            Enviar a n8n
          </button>
        </form>
      </section>
      {/* --- FIN DEL FORMULARIO FUNCIONAL --- */}

    </div>
  );
}