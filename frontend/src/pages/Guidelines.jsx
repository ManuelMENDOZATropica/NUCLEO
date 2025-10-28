import React, { useMemo, useState } from "react";

const pageStyle = {
  maxWidth: 1200,
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
};

const titleStyle = {
  margin: 0,
  fontSize: 32,
  color: "#0f172a",
  lineHeight: 1.2,
  fontWeight: 700,
};

const subtitleStyle = {
  margin: 0,
  fontSize: 16,
  color: "#475569",
  maxWidth: 680,
  lineHeight: 1.6,
};

const riskBlockStyle = {
  background: "#0f172a",
  color: "#e2e8f0",
  borderRadius: 24,
  padding: "36px",
  boxShadow: "0 32px 60px rgba(15, 23, 42, 0.35)",
  display: "grid",
  gap: 28,
};

const riskGridStyle = {
  display: "grid",
  gap: 20,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

const riskItemStyle = {
  background: "rgba(15, 23, 42, 0.55)",
  border: "1px solid rgba(148, 163, 184, 0.35)",
  borderRadius: 18,
  padding: 20,
  display: "grid",
  gap: 8,
};

const motionBlockStyle = {
  background: "rgba(148, 163, 184, 0.2)",
  border: "1px solid rgba(148, 163, 184, 0.5)",
  borderRadius: 18,
  padding: 20,
  display: "grid",
  gap: 12,
};

function buildGuidelines() {
  return [
    {
      id: "human-centered-partnership",
      title: "Human-Centered Partnership",
      subtitle: "Colaboración centrada en el ser humano",
      summary: "La IA mejora, los humanos lideran.",
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

function renderBody(body, variant) {
  return body.map((item, index) => {
    const key = `${item.text}-${index}`;
    if (item.type === "heading") {
      return (
        <p key={key} className={`ia-card-text ia-card-heading ia-card-heading-${variant}`}>
          {item.text}
        </p>
      );
    }
    return (
      <p key={key} className={`ia-card-text ia-card-text-${variant}`}>
        {item.text}
      </p>
    );
  });
}

function GuidelineCard({ guideline, state, onCardClick, onCloseExpanded }) {
  const { title, subtitle, summary, body, id } = guideline;
  const isFlipped = state === "back" || state === "expanded";
  const isExpanded = state === "expanded";

  return (
    <>
      <button
        type="button"
        className={`ia-card ${isFlipped ? "is-flipped" : ""}`}
        onClick={() => onCardClick(id)}
      >
        <div className="ia-card-inner">
          <div className="ia-card-face ia-card-front">
            <div className="ia-card-front-content">
              <span className="ia-card-tag">{subtitle}</span>
              <h3 className="ia-card-title">{title}</h3>
              <p className="ia-card-summary">{summary}</p>
            </div>
          </div>
          <div className="ia-card-face ia-card-back">
            <div className="ia-card-back-content">
              <span className="ia-card-tag">{subtitle}</span>
              <h3 className="ia-card-title">{title}</h3>
              <div className="ia-card-body">{renderBody(body, "back")}</div>
              <span className="ia-card-hint">Haz clic de nuevo para ampliar</span>
            </div>
          </div>
        </div>
      </button>

      {isExpanded ? (
        <div className="ia-card-overlay" role="dialog" aria-modal="true">
          <div className="ia-card-overlay-content">
            <div className="ia-card-overlay-header">
              <div className="ia-card-overlay-titles">
                <span className="ia-card-tag">{subtitle}</span>
                <h3 className="ia-card-title">{title}</h3>
              </div>
              <button
                type="button"
                className="ia-card-close"
                onClick={event => {
                  event.stopPropagation();
                  onCloseExpanded(id);
                }}
              >
                Cerrar
              </button>
            </div>
            <div className="ia-card-overlay-body">{renderBody(body, "overlay")}</div>
          </div>
          <button
            type="button"
            className="ia-card-overlay-backdrop"
            aria-label="Cerrar"
            onClick={() => onCloseExpanded(id)}
          />
        </div>
      ) : null}
    </>
  );
}

export default function Guidelines() {
  const guidelines = useMemo(() => buildGuidelines(), []);
  const [cardStates, setCardStates] = useState(() => guidelines.map(() => "front"));

  const handleCardClick = id => {
    setCardStates(prev => {
      return guidelines.map((item, index) => {
        if (item.id !== id) {
          return prev[index] === "expanded" ? "front" : prev[index] === "back" ? "front" : prev[index];
        }
        const currentState = prev[index];
        if (currentState === "front") return "back";
        if (currentState === "back") return "expanded";
        return "front";
      });
    });
  };

  const handleCloseExpanded = id => {
    setCardStates(prev =>
      guidelines.map((item, index) => {
        if (item.id === id) return "front";
        return prev[index] === "expanded" ? "front" : prev[index];
      })
    );
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

      <section className="ia-grid" aria-label="TRÓPICA AI Guidelines">
        {guidelines.map((guideline, index) => (
          <GuidelineCard
            key={guideline.id}
            guideline={guideline}
            state={cardStates[index]}
            onCardClick={handleCardClick}
            onCloseExpanded={handleCloseExpanded}
          />
        ))}
      </section>

      <section style={riskBlockStyle}>
        <div>
          <h2 style={{ margin: "0 0 12px", fontSize: 26 }}>Sistema de Evaluación de Riesgos</h2>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6 }}>
            Usa esta escala para clasificar cada iniciativa con IA y asegurar los niveles adecuados de revisión y
            aprobación.
          </p>
        </div>
        <div style={riskGridStyle}>
          <div style={{ ...riskItemStyle, borderColor: "rgba(74, 222, 128, 0.6)", background: "rgba(22, 163, 74, 0.2)" }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>VERDE</h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
              Aprobación de Líder de Equipo — borradores internos, brainstorming.
            </p>
          </div>
          <div style={{ ...riskItemStyle, borderColor: "rgba(250, 204, 21, 0.6)", background: "rgba(202, 138, 4, 0.25)" }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>AMARILLO</h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
              Director Creativo + Compliance — presentaciones para clientes.
            </p>
          </div>
          <div style={{ ...riskItemStyle, borderColor: "rgba(248, 113, 113, 0.6)", background: "rgba(220, 38, 38, 0.25)" }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>ROJO</h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
              Legal + Dirección Ejecutiva — campañas públicas, datos de cliente.
            </p>
          </div>
        </div>
        <div style={motionBlockStyle}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18 }}>Etiquetado Motion</h3>
            <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.6 }}>
              Formato: [IA-HERRAMIENTA] - [PROPÓSITO] - [NIVEL-RIESGO]
            </p>
          </div>
          <div style={{ display: "grid", gap: 6, fontSize: 14, lineHeight: 1.6 }}>
            <span>ChatGPT - Lluvia de titulares - VERDE</span>
            <span>Midjourney - Conceptos visuales - AMARILLO</span>
            <span>Claude - Presentación a cliente - ROJO</span>
          </div>
        </div>
      </section>
    </div>
  );
}
