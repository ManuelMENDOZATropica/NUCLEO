import React, { useMemo, useRef, useState } from "react";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function buildApiUrl(path = "") {
  if (!path.startsWith("/")) {
    return `${API_BASE_URL}/${path}`;
  }
  return `${API_BASE_URL}${path}`;
}

const INITIAL_ASSISTANT_MESSAGE =
  "Hi! 🌞 I’m MELISA — your tropical creative director at TRÓPICA, specialized in Mercado Ads.  I’ll help you shape a complete, strategic, and beautiful brief with a warm human touch.  Before we dive in — where are you from, and which language would you like to continue in: Spanish, Portuguese, or English?";

const pageStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    maxWidth: 960,
    margin: "0 auto",
    padding: "32px 24px 80px",
    gap: 24,
  },
  hero: {
    background: "#0f172a",
    color: "#e2e8f0",
    borderRadius: 20,
    padding: 32,
    boxShadow: "0 20px 48px rgba(15, 23, 42, 0.36)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
  },
  heroTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: "0.01em",
  },
  heroBody: {
    margin: "12px 0 0",
    fontSize: 16,
    lineHeight: 1.6,
    color: "#cbd5f5",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 24,
  },
  chatCard: {
    background: "#ffffff",
    borderRadius: 24,
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    minHeight: 520,
  },
  chatHeader: {
    padding: "24px 28px 16px",
    borderBottom: "1px solid #e2e8f0",
  },
  chatTitle: {
    margin: 0,
    fontSize: 20,
    color: "#0f172a",
  },
  chatBody: {
    padding: "24px 28px",
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 35%)",
  },
  messageBubble: role => ({
    alignSelf: role === "user" ? "flex-end" : "flex-start",
    background: role === "user" ? "#2563eb" : "#f1f5f9",
    color: role === "user" ? "#ffffff" : "#0f172a",
    borderRadius: role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
    padding: "14px 18px",
    maxWidth: "75%",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
    whiteSpace: "pre-wrap",
    lineHeight: 1.55,
    fontSize: 15,
  }),
  chatFooter: {
    padding: "18px 24px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  form: {
    display: "flex",
    alignItems: "flex-end",
    gap: 12,
  },
  textArea: {
    flex: 1,
    minHeight: 64,
    borderRadius: 14,
    border: "1px solid #cbd5e1",
    padding: "12px 14px",
    fontSize: 15,
    resize: "vertical",
    fontFamily: "inherit",
  },
  sendButton: isLoading => ({
    background: isLoading ? "#94a3b8" : "#1d4ed8",
    color: "#ffffff",
    border: "none",
    borderRadius: 12,
    padding: "12px 20px",
    fontWeight: 600,
    fontSize: 15,
    cursor: isLoading ? "not-allowed" : "pointer",
    opacity: isLoading ? 0.7 : 1,
    transition: "all 0.2s ease",
  }),
  footerActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  finalizeButton: isDisabled => ({
    background: isDisabled ? "#94a3b8" : "#047857",
    color: "white",
    border: "none",
    borderRadius: 12,
    padding: "12px 20px",
    fontWeight: 600,
    fontSize: 15,
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.7 : 1,
    transition: "all 0.2s ease",
  }),
  statusText: color => ({
    fontSize: 14,
    color,
  }),
  buttonGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
  },
  uploadButton: isUploading => ({
    background: isUploading ? "#94a3b8" : "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: 12,
    padding: "12px 20px",
    fontWeight: 600,
    fontSize: 15,
    cursor: isUploading ? "not-allowed" : "pointer",
    opacity: isUploading ? 0.75 : 1,
    transition: "all 0.2s ease",
  }),
  statusGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    alignItems: "flex-end",
    flex: 1,
    minWidth: 220,
  },
  pendingList: {
    margin: 0,
    paddingLeft: 18,
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.5,
    textAlign: "left",
  },
  transcriptSection: {
    background: "#ffffff",
    borderRadius: 20,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
    border: "1px solid #e2e8f0",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  transcriptTitle: {
    margin: 0,
    fontSize: 18,
    color: "#0f172a",
  },
  transcriptList: {
    margin: 0,
    paddingLeft: 18,
    fontSize: 14,
    color: "#475569",
    lineHeight: 1.6,
  },
};

export default function BriefBuddy() {
  const [messages, setMessages] = useState([
    { id: "assistant-0", role: "assistant", content: INITIAL_ASSISTANT_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState("");
  const [finalInfo, setFinalInfo] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [lastUpload, setLastUpload] = useState(null);
  const bodyRef = useRef(null);
  const fileInputRef = useRef(null);

  const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

  const readFileAsDataUrl = file =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.onabort = () => reject(new Error("La lectura del archivo fue cancelada"));
      reader.readAsDataURL(file);
    });

  const formattedMessages = useMemo(
    () =>
      messages.map(msg => ({
        ...msg,
        role: msg.role === "assistant" ? "assistant" : "user",
      })),
    [messages]
  );

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (bodyRef.current) {
        bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
      }
    });
  };

  const handleUploadClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileUpload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      setError("El PDF supera el límite de 8 MB permitido.");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    setError("");
    setPendingQuestions([]);
    setLastUpload(null);
    setFinalInfo(null);

    const timestamp = Date.now();
    const userMessage = {
      id: `user-${timestamp}`,
      role: "user",
      content: `Acabo de subir el PDF "${file.name}" para que lo analices y completes el brief automáticamente.`,
    };
    setMessages(prev => [...prev, userMessage]);
    scrollToBottom();

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const response = await fetch(buildApiUrl("/api/brief-buddy/prefill"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileData: dataUrl }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const message = errJson.message || "No se pudo analizar el PDF";
        throw new Error(message);
      }

      const json = await response.json();
      const assistantText = json.assistantMessage && json.assistantMessage.trim()
        ? json.assistantMessage.trim()
        : "He revisado el documento, pero no pude extraer información clara. ¿Podrías compartir más detalles?";

      const assistantMessage = {
        id: `assistant-${timestamp + 1}`,
        role: "assistant",
        content: assistantText,
      };

      setMessages(prev => [...prev, assistantMessage]);
      scrollToBottom();

      const pending = Array.isArray(json.missingQuestions)
        ? json.missingQuestions.filter(item => typeof item === "string" && item.trim().length > 0)
        : [];

      setPendingQuestions(pending);
      setLastUpload({
        fileName: file.name,
        missingCount: pending.length,
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo procesar el PDF");
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content:
            "No pude analizar el PDF. ¿Podrías intentar con otro archivo o compartir la información clave aquí mismo?",
        },
      ]);
      scrollToBottom();
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const sendMessage = async event => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const newMessages = [
      ...messages,
      { id: `user-${Date.now()}`, role: "user", content: trimmed },
    ];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(buildApiUrl("/api/brief-buddy/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map(({ role, content }) => ({ role, content })) }),
      });

      if (!response.ok) {
        throw new Error("No se pudo obtener respuesta del asistente");
      }

      const json = await response.json();
      const reply = json.reply || "";
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: reply.trim() || "Lo siento, no pude generar una respuesta.",
      };
      setMessages(prev => [...prev, assistantMessage]);
      scrollToBottom();
    } catch (err) {
      console.error(err);
      setError(err.message || "Ocurrió un error inesperado");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const finalizeBrief = async () => {
    if (isFinalizing) return;
    setIsFinalizing(true);
    setError("");

    try {
      const response = await fetch(buildApiUrl("/api/brief-buddy/finalize"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages.map(({ role, content }) => ({ role, content })) }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const message = errJson.message || "No se pudo finalizar el brief";
        throw new Error(message);
      }

      const json = await response.json();
      setFinalInfo(json);
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo completar el brief");
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div style={pageStyles.container}>
      <section style={pageStyles.hero}>
        <h1 style={pageStyles.heroTitle}>Brief Buddy</h1>
        <p style={pageStyles.heroBody}>
          Conecta con MELISA para construir briefs completos guiados por el contexto oficial de Mercado Ads.
          Cuando tengas toda la información lista, genera automáticamente el documento y envíalo a la carpeta
          compartida de Google Drive.
        </p>
      </section>

      <section style={pageStyles.chatCard}>
        <header style={pageStyles.chatHeader}>
          <h2 style={pageStyles.chatTitle}>Chat en vivo</h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
            Toda la conversación se enviará al finalizar para armar el brief estructurado.
          </p>
        </header>

        <div style={pageStyles.chatBody} ref={bodyRef}>
          {formattedMessages.map(message => (
            <div key={message.id} style={pageStyles.messageBubble(message.role)}>
              {message.content}
            </div>
          ))}
        </div>

        <footer style={pageStyles.chatFooter}>
          <form style={pageStyles.form} onSubmit={sendMessage}>
            <textarea
              style={pageStyles.textArea}
              value={input}
              onChange={event => setInput(event.target.value)}
              placeholder="Escribe tu mensaje para Brief Buddy..."
              disabled={isLoading}
            />
            <button type="submit" style={pageStyles.sendButton(isLoading)} disabled={isLoading}>
              {isLoading ? "Enviando..." : "Enviar"}
            </button>
          </form>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />

          <div style={pageStyles.footerActions}>
            <div style={pageStyles.buttonGroup}>
              <button
                type="button"
                style={pageStyles.uploadButton(isUploading)}
                disabled={isUploading}
                onClick={handleUploadClick}
              >
                {isUploading ? "Analizando PDF..." : "Cargar brief en PDF"}
              </button>
              <button
                type="button"
                style={pageStyles.finalizeButton(isFinalizing)}
                disabled={isFinalizing}
                onClick={finalizeBrief}
              >
                {isFinalizing ? "Generando brief..." : "Finalizar y enviar"}
              </button>
            </div>

            <div style={pageStyles.statusGroup}>
              {error && <span style={pageStyles.statusText("#dc2626")}>{error}</span>}
              {lastUpload && (
                <span style={pageStyles.statusText("#0f172a")}>
                  PDF analizado: <strong>{lastUpload.fileName}</strong>
                  {lastUpload.missingCount > 0
                    ? ` · Pendientes detectados: ${lastUpload.missingCount}`
                    : " · Toda la información requerida parece estar completa."}
                </span>
              )}
              {pendingQuestions.length > 0 && (
                <ul style={pageStyles.pendingList}>
                  {pendingQuestions.map((question, index) => (
                    <li key={`pending-question-${index}`}>{question}</li>
                  ))}
                </ul>
              )}
              {finalInfo && !error && (
                <span style={pageStyles.statusText("#047857")}>
                  Documento generado: <strong>{finalInfo.fileName}</strong>
                </span>
              )}
            </div>
          </div>
        </footer>
      </section>

      {finalInfo?.structured && (
        <section style={pageStyles.transcriptSection}>
          <h3 style={pageStyles.transcriptTitle}>Resumen del brief</h3>
          <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
            Se generó un resumen estructurado con los puntos clave y se guardó automáticamente en la carpeta
            de Drive configurada.
          </p>
          {Array.isArray(finalInfo.structured.summary) && finalInfo.structured.summary.length > 0 && (
            <>
              <h4 style={{ margin: "8px 0 0", fontSize: 15, color: "#0f172a" }}>Highlights</h4>
              <ul style={pageStyles.transcriptList}>
                {finalInfo.structured.summary.map((item, index) => (
                  <li key={`summary-${index}`}>{item}</li>
                ))}
              </ul>
            </>
          )}
          {Array.isArray(finalInfo.structured.pending) && finalInfo.structured.pending.length > 0 && (
            <>
              <h4 style={{ margin: "8px 0 0", fontSize: 15, color: "#0f172a" }}>Pendientes</h4>
              <ul style={pageStyles.transcriptList}>
                {finalInfo.structured.pending.map((item, index) => (
                  <li key={`pending-${index}`}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}
