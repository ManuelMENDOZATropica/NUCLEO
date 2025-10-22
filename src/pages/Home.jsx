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

export default function Home({ user }) {
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
    </div>
  );
}
