import React, { useState } from "react";

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
  fontSize: 24,
  color: "#0f172a",
  lineHeight: 1.2,
};

const bodyStyle = {
  margin: "12px 0 0",
  fontSize: 16,
  color: "#475569",
  lineHeight: 1.6,
};

const optionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
  marginTop: 20,
};

const optionCardStyle = isActive => ({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 20,
  borderRadius: 16,
  border: isActive ? "2px solid #1d4ed8" : "1px solid #cbd5e1",
  background: isActive ? "#eff6ff" : "#f8fafc",
  cursor: "pointer",
  transition: "border 0.2s ease, background 0.2s ease",
});

const optionTitleStyle = {
  fontSize: 18,
  fontWeight: 600,
  color: "#0f172a",
};

const optionDescriptionStyle = {
  fontSize: 14,
  color: "#475569",
  lineHeight: 1.5,
};

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

const formCardStyle = {
  ...cardStyle,
  padding: 28,
};

export default function Automations() {
  const [selected, setSelected] = useState(null);

  return (
    <div style={containerStyle}>
      <section style={cardStyle}>
        <h1 style={titleStyle}>Automatizaciones</h1>
        <p style={bodyStyle}>
          Este es el formulario para creación de proyecto de Mercado Libre en las carpetas de "Interno" y
          "Share with MeLi". Solo tienes que ingresar el nombre del proyecto y el país al que pertenece.
        </p>
      </section>

      <section style={cardStyle}>
        <h2 style={{ ...titleStyle, fontSize: 20 }}>Automatizaciones disponibles</h2>
        <div style={optionGridStyle}>
          <button
            type="button"
            onClick={() => setSelected("meli")}
            style={{ ...optionCardStyle(selected === "meli"), textAlign: "left" }}
          >
            <span style={optionTitleStyle}>MeLi</span>
            <span style={optionDescriptionStyle}>
              Crear proyectos de Mercado Libre y sincronizarlos automáticamente con tus carpetas internas.
            </span>
          </button>
        </div>

        {selected === null && (
          <p style={{ ...optionDescriptionStyle, marginTop: 24 }}>
            Selecciona una automatización para ver el formulario correspondiente.
          </p>
        )}

        {selected === "meli" && (
          <div style={{ marginTop: 28 }}>
            <p style={{ ...optionDescriptionStyle, marginBottom: 24 }}>
              Completa el formulario y se generará el proyecto en las carpetas correspondientes.
            </p>

            {/* --- INICIO DEL FORMULARIO FUNCIONAL --- */}
            <section style={formCardStyle}>
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
                    name="name"
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
                    name="País"
                    style={inputStyle}
                    required
                    defaultValue=""
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
        )}
      </section>
    </div>
  );
}
