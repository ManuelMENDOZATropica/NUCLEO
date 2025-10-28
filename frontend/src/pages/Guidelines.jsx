import React, { useMemo, useState } from "react";
// Asegúrate de que tu 'index.css' sigue siendo importado o accesible globalmente.

// *** NOTA: Los estilos inline aquí son para la demostración. 
// *** Se recomienda moverlos a 'index.css' para una mejor práctica.

const pageStyle = {
  maxWidth: 1000, // Reducido para un layout más compacto
  margin: "0 auto",
  padding: "36px 24px 100px",
  display: "grid",
  gap: 48,
};

const headerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  alignItems: "flex-start",
  textAlign: "left", // Aseguramos alineación izquierda
};

const titleStyle = {
  margin: 0,
  fontSize: 36, // Un poco más grande
  color: "#0f172a",
  lineHeight: 1.2,
  fontWeight: 800, // Más negrita
};

const subtitleStyle = {
  margin: 0,
  fontSize: 18, // Un poco más grande
  color: "#475569",
  maxWidth: 720, // Ajustado
  lineHeight: 1.6,
};

// Estilos para el acordeón (nuevos)
const accordionSectionStyle = {
  display: "grid",
  gap: 16,
};

const accordionItemStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  overflow: "hidden", // Para animar la altura
  boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
};

const accordionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "20px 24px",
  cursor: "pointer",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
};

const accordionTitleStyle = {
  margin: 0,
  fontSize: 20,
  color: "#0f172a",
  fontWeight: 700,
};

const accordionSubtitleStyle = {
  fontSize: 14,
  fontWeight: 600,
  color: "#3b82f6",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const accordionContentStyle = {
  padding: "0 24px", // Padding horizontal
  maxHeight: 0,
  overflow: "hidden",
  transition: "max-height 0.4s ease-out, padding 0.4s ease-out", // Animación de altura y padding
};

const accordionContentExpandedStyle = {
  maxHeight: "500px", // Un valor suficientemente grande para el contenido
  padding: "20px 24px", // Padding cuando está abierto
};

const accordionTextContentStyle = {
  fontSize: 16,
  color: "#334155",
  lineHeight: 1.6,
  margin: "0 0 10px 0",
};

const accordionHeadingContentStyle = {
  fontSize: 16,
  fontWeight: 700,
  color: "#1e293b",
  margin: "15px 0 5px 0",
};


// Estilos para la sección de riesgo (ajustados para simplicidad visual)
const riskBlockStyle = {
  background: "#111827", // Fondo más oscuro para contraste
  color: "#f9fafb", // Texto claro
  borderRadius: 16,
  padding: "32px",
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
  display: "grid",
  gap: 24,
};

const riskGridStyle = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
};

const riskItemStyle = {
  borderRadius: 12,
  padding: 16,
  display: "grid",
  gap: 6,
  border: "1px solid rgba(255,255,255,0.2)",
};

const riskTitleStyle = {
  margin: 0,
  fontSize: 18,
  fontWeight: 700,
};

const riskDescriptionStyle = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.5,
  color: "#e2e8f0",
};

const motionBlockStyle = {
  background: "rgba(255, 255, 255, 0.1)", // Fondo translúcido dentro del bloque oscuro
  border: "1px solid rgba(255, 255, 255, 0.2)",
  borderRadius: 12,
  padding: 18,
  display: "grid",
  gap: 10,
};

const motionTitleStyle = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  color: "#f9fafb",
};

const motionFormatStyle = {
  margin: "0 0 8px 0",
  fontSize: 14,
  lineHeight: 1.5,
  color: "#e2e8f0",
};

const motionExampleStyle = {
  display: "grid",
  gap: 5,
  fontSize: 14,
  lineHeight: 1.5,
  color: "#f0f4f8",
};

// Data original de las guías
function buildGuidelines() {
  return [
    {
      id: "human-centered-partnership",
      title: "Human-Centered Partnership",
      subtitle: "Colaboración centrada en el ser humano",
      summary: "La IA mejora, los humanos lideran.", // No usado en este diseño, pero se mantiene
      body: [
        { type: "text", text: "La IA mejora, los humanos lideran." },
        { type: "text", text: "El criterio humano guía la estrategia." },
        { type: "text", text: "Usa IA para explorar ideas rápidamente." },
        { type: "text", text: "Nunca presentes un trabajo de IA sin revisión humana." },
      ],
    },
    {
      id: "radical-transparency",
      title: "Radical Transparency",
      subtitle: "Transparencia Radical",
      summary: "La documentación es protección.",
      body: [
        { type: "text", text: "La documentación es protección." },
        { type: "heading", text: "Transparencia interna:" },
        { type: "text", text: "Registra todo uso de IA: [Herramienta] - [Propósito] - [Nivel de Riesgo]" },
        { type: "text", text: "Utiliza la etiqueta ‘AI’ en Motion para identificar proyectos con participación de IA" },
        { type: "text", text: "Comparte prompts en sesiones UFO" },
        { type: "text", text: "Mide ahorros de tiempo y eficiencia" },
        { type: "heading", text: "Transparencia con el cliente:" },
        { type: "text", text: "Comunica el uso de IA de forma proactiva" },
        {
          type: "text",
          text:
            '"This work integrates AI tools under human supervision. All outputs have been reviewed, refined, and validated to meet TRÓPICA’s creative and ethical standards."',
        },
        { type: "text", text: "Explica el rol de la IA en el proceso creativo" },
        { type: "text", text: "Construye confianza mediante apertura" },
      ],
    },
    {
      id: "uncompromising-data-protection",
      title: "Uncompromising Data Protection",
      subtitle: "Protección de Datos",
      summary: "La confidencialidad del cliente es sagrada.",
      body: [
        { type: "text", text: "La confidencialidad del cliente es sagrada." },
        { type: "heading", text: "Nunca expongas:" },
        { type: "text", text: "Información confidencial del cliente" },
        { type: "text", text: "Estrategias de marca" },
        { type: "text", text: "Datos personales o sensibles" },
        { type: "heading", text: "Usa siempre:" },
        { type: "text", text: "Herramientas con licencias empresariales" },
        { type: "text", text: "Protocolos de seguridad verificados" },
        { type: "text", text: "Inventario de herramientas aprobadas" },
      ],
    },
    {
      id: "quality-first-validation",
      title: "Quality-First Validation",
      subtitle: "Validación enfocada en la calidad",
      summary: "La verificación de 30 segundos que lo salva todo.",
      body: [
        { type: "text", text: "La verificación de 30 segundos que lo salva todo." },
        { type: "text", text: "Antes de publicar o compartir un resultado:" },
        { type: "text", text: "Impacto (5s): ¿Hay riesgo de daño o mala interpretación?" },
        { type: "text", text: "Hechos (5s): ¿La información es verificada?" },
        { type: "text", text: "Equidad (5s): ¿Libre de sesgos?" },
        { type: "text", text: "Cumplimiento (10s): ¿Respeta privacidad, PI, marca?" },
        { type: "text", text: "Revisión humana (5s): ¿Aprobado por una persona?" },
        { type: "text", text: "Si alguno falla → DETENTE y escala." },
      ],
    },
    {
      id: "ethical-innovation",
      title: "Ethical Innovation",
      subtitle: "Innovación Ética",
      summary: "Creatividad con integridad.",
      body: [
        { type: "text", text: "Creatividad con integridad." },
        { type: "heading", text: "Respeta la propiedad intelectual y los derechos de autor:" },
        { type: "text", text: "No copies trabajos existentes" },
        { type: "text", text: "Atribuye correctamente cuando sea necesario" },
        { type: "heading", text: "Mantén la autenticidad de marca:" },
        { type: "text", text: "Conserva el tono y sensibilidad cultural" },
        { type: "text", text: "Evita representaciones engañosas" },
        { type: "text", text: "Escala las dudas de inmediato" },
      ],
    },
    {
      id: "continuous-evolution",
      title: "Continuous Evolution",
      subtitle: "Evolución Continua",
      summary: "Aprendiendo y creciendo juntos.",
      body: [
        { type: "text", text: "Aprendiendo y creciendo juntos." },
        { type: "heading", text: "Mantente actualizado:" },
        { type: "text", text: "Asiste a sesiones mensuales de IA (UFO)" },
        { type: "text", text: "Comparte descubrimientos y errores" },
        { type: "text", text: "Aprende de los resultados" },
        { type: "heading", text: "Genera confianza con el cliente:" },
        { type: "text", text: "Comunica los beneficios de la IA" },
        { type: "text", text: "Muestra resultados con transparencia" },
      ],
    },
  ];
}


// Componente de renderizado de contenido
function renderBody(body) {
  return body.map((item, index) => {
    const key = `${item.text}-${index}`;
    if (item.type === "heading") {
      return (
        <p key={key} style={accordionHeadingContentStyle}>
          {item.text}
        </p>
      );
    }
    return (
      <p key={key} style={accordionTextContentStyle}>
        {item.text}
      </p>
    );
  });
}

// Nuevo componente para una tarjeta de directriz sencilla (acordeón)
function GuidelineAccordionItem({ guideline, isOpen, onToggle }) {
  const { title, subtitle, body } = guideline;

  return (
    <div style={accordionItemStyle}>
      <button style={accordionHeaderStyle} onClick={onToggle} aria-expanded={isOpen}>
        <div>
          <span style={accordionSubtitleStyle}>{subtitle}</span>
          <h3 style={accordionTitleStyle}>{title}</h3>
        </div>
        <span>{isOpen ? "▲" : "▼"}</span> {/* Icono para indicar estado */}
      </button>
      <div style={isOpen ? { ...accordionContentStyle, ...accordionContentExpandedStyle } : accordionContentStyle}>
        {renderBody(body)}
      </div>
    </div>
  );
}

export default function Guidelines() {
  const guidelines = useMemo(() => buildGuidelines(), []);
  // `expandedId` almacena el ID de la tarjeta actualmente abierta (null si ninguna)
  const [expandedId, setExpandedId] = useState(null);

  const handleToggle = (id) => {
    setExpandedId(prevId => (prevId === id ? null : id)); // Abre si está cerrado, cierra si está abierto
  };

  // Estilos de riesgo individuales (colores)
  const greenItemColorStyle = { 
    background: "rgba(34, 197, 94, 0.15)", 
    borderColor: "rgba(34, 197, 94, 0.4)",
    color: "#a7f3d0", // texto más claro
  };
  const yellowItemColorStyle = { 
    background: "rgba(250, 204, 21, 0.15)", 
    borderColor: "rgba(250, 204, 21, 0.4)",
    color: "#fde68a", // texto más claro
  };
  const redItemColorStyle = { 
    background: "rgba(239, 68, 68, 0.15)", 
    borderColor: "rgba(239, 68, 68, 0.4)",
    color: "#fca5a5", // texto más claro
  };


  return (
    <div style={pageStyle}>
      <section style={headerStyle}>
        <span className="ia-eyebrow">TRÓPICA AI Guidelines</span>
        <h1 style={titleStyle}>Ética, transparencia y evolución continua</h1>
        <p style={subtitleStyle}>
          Explora los seis principios que guían el uso responsable de IA en TRÓPICA y accede al detalle completo de
          cada uno con interacciones intuitivas.
        </p>
      </section>

      <section style={accordionSectionStyle} aria-label="TRÓPICA AI Guidelines">
        {guidelines.map((guideline) => (
          <GuidelineAccordionItem
            key={guideline.id}
            guideline={guideline}
            isOpen={expandedId === guideline.id}
            onToggle={() => handleToggle(guideline.id)}
          />
        ))}
      </section>

      <section style={riskBlockStyle}>
        <div style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'inherit' }}>Sistema de Evaluación de Riesgos</h2>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: '#d1d5db' }}>
            Usa esta escala para clasificar cada iniciativa con IA y asegurar los niveles adecuados de revisión y
            aprobación.
          </p>
        </div>
        <div style={riskGridStyle}>
          <div style={{ ...riskItemStyle, ...greenItemColorStyle }}>
            <h3 style={riskTitleStyle}>VERDE</h3>
            <p style={riskDescriptionStyle}>
              Aprobación de Líder de Equipo — borradores internos, brainstorming.
            </p>
          </div>
          <div style={{ ...riskItemStyle, ...yellowItemColorStyle }}>
            <h3 style={riskTitleStyle}>AMARILLO</h3>
            <p style={riskDescriptionStyle}>
              Director Creativo + Compliance — presentaciones para clientes.
            </p>
          </div>
          <div style={{ ...riskItemStyle, ...redItemColorStyle }}>
            <h3 style={riskTitleStyle}>ROJO</h3>
            <p style={riskDescriptionStyle}>
              Legal + Dirección Ejecutiva — campañas públicas, datos de cliente.
            </p>
          </div>
        </div>
        <div style={motionBlockStyle}>
          <div>
            <h3 style={motionTitleStyle}>Etiquetado Motion</h3>
            <p style={motionFormatStyle}>
              Formato: [IA-HERRAMIENTA] - [PROPÓSITO] - [NIVEL-RIESGO]
            </p>
          </div>
          <div style={motionExampleStyle}>
            <span>ChatGPT - Lluvia de titulares - VERDE</span>
            <span>Midjourney - Conceptos visuales - AMARILLO</span>
            <span>Claude - Presentación a cliente - ROJO</span>
          </div>
        </div>
      </section>
    </div>
  );
}