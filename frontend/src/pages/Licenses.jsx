import React, { useEffect, useMemo, useState } from "react";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function buildApiUrl(path = "") {
  if (!path.startsWith("/")) {
    return `${API_BASE_URL}/${path}`;
  }
  return `${API_BASE_URL}${path}`;
}

const layoutStyle = {
  maxWidth: 1120,
  margin: "0 auto",
  padding: "32px 24px 80px",
  display: "grid",
  gap: 24,
};

const gridStyle = {
  display: "grid",
  gap: 20,
};

const categoryHeaderStyle = {
  margin: 0,
  fontSize: 22,
  color: "#0f172a",
};

const cardListStyle = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
};

const cardStyle = isSelected => ({
  background: "#ffffff",
  borderRadius: 18,
  border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
  padding: 20,
  boxShadow: isSelected ? "0 18px 38px rgba(37, 99, 235, 0.15)" : "0 10px 28px rgba(15, 23, 42, 0.08)",
  cursor: "pointer",
  transition: "all 0.16s ease",
  display: "grid",
  gap: 12,
});

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  fontWeight: 600,
  background: "#eff6ff",
  color: "#1d4ed8",
  padding: "6px 10px",
  borderRadius: 999,
};

const detailStyle = {
  background: "#fff",
  borderRadius: 20,
  border: "1px solid #e2e8f0",
  boxShadow: "0 20px 44px rgba(15, 23, 42, 0.1)",
  padding: 28,
  display: "grid",
  gap: 18,
};

function LicenseDetail({ license }) {
  if (!license) return null;

  return (
    <aside style={detailStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              height: 64,
              width: 64,
              borderRadius: 18,
              background: "#f1f5f9",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {license.logo ? (
              <img
                src={license.logo}
                alt={license.nombre}
                style={{ maxHeight: "70%", maxWidth: "70%", objectFit: "contain" }}
              />
            ) : (
              <span style={{ fontWeight: 700, fontSize: 20, color: "#0f172a" }}>
                {license.nombre?.charAt(0) || "?"}
              </span>
            )}
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#2563eb", fontWeight: 600 }}>
              {license.categoria || "Licencia"}
            </span>
            <h3 style={{ margin: 0, fontSize: 24, color: "#0f172a" }}>{license.nombre}</h3>
            <span style={{ fontSize: 14, color: "#475569" }}>{license.licencia}</span>
          </div>
        </div>
        {license.enlace ? (
          <a
            href={license.enlace}
            target="_blank"
            rel="noreferrer"
            style={{
              background: "#1d4ed8",
              color: "#f8fafc",
              padding: "10px 18px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Abrir recurso
          </a>
        ) : null}
      </div>
      {Array.isArray(license.subHerramientas) && license.subHerramientas.length > 0 && (
        <div style={{ display: "grid", gap: 10 }}>
          <h4 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>Sub-herramientas</h4>
          <ul style={{ margin: 0, paddingLeft: 20, color: "#475569", fontSize: 14, lineHeight: 1.6 }}>
            {license.subHerramientas.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {Array.isArray(license.usos) && license.usos.length > 0 && (
        <div style={{ display: "grid", gap: 10 }}>
          <h4 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>Usos recomendados</h4>
          <ul style={{ margin: 0, paddingLeft: 20, color: "#475569", fontSize: 14, lineHeight: 1.6 }}>
            {license.usos.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

export default function Licenses() {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const response = await fetch(buildApiUrl("/api/licenses"), {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          throw new Error("No se pudo cargar el catálogo de licencias");
        }
        const json = await response.json();
        if (!cancelled) {
          if (!Array.isArray(json)) {
            throw new Error("Formato de licencias inválido");
          }
          setLicenses(json);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Error desconocido");
          setLicenses([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const catalog = useMemo(() => {
    return (licenses || []).reduce((acc, item) => {
      const category = item.categoria || "Sin categoría";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {});
  }, [licenses]);

  const flattenedLicenses = useMemo(() => licenses, [licenses]);

  useEffect(() => {
    if (flattenedLicenses.length === 0) {
      if (selected) {
        setSelected(null);
      }
      return;
    }

    const hasSelected =
      !!selected && flattenedLicenses.some(item => item._id === selected._id);

    if (!hasSelected) {
      setSelected(flattenedLicenses[0]);
    }
  }, [flattenedLicenses, selected]);

  if (loading) {
    return (
      <div style={{ ...layoutStyle, textAlign: "center", color: "#475569" }}>
        Cargando licencias…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...layoutStyle, textAlign: "center", color: "#b91c1c" }}>
        {error}
      </div>
    );
  }

  return (
    <div style={layoutStyle}>
      {Object.entries(catalog).map(([category, items]) => {
        const isSelectedCategory = selected?.categoria === category;

        return (
          <section key={category} style={gridStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h2 style={categoryHeaderStyle}>{category}</h2>
              <span style={badgeStyle}>{items?.length || 0} licencias</span>
            </div>
            <div style={cardListStyle}>
              {(items || []).map(license => {
                const isSelected = selected?._id === license._id && isSelectedCategory;
                return (
                  <article
                    key={license._id || license.nombre}
                    style={cardStyle(isSelected)}
                    onClick={() => setSelected(license)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          height: 44,
                          width: 44,
                          borderRadius: 14,
                          background: "#f8fafc",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {license.logo ? (
                          <img
                            src={license.logo}
                            alt={license.nombre}
                            style={{ maxHeight: "70%", maxWidth: "70%", objectFit: "contain" }}
                          />
                        ) : (
                          <span style={{ fontWeight: 700, color: "#0f172a" }}>
                            {license.nombre.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "grid", gap: 4 }}>
                        <strong style={{ color: "#0f172a" }}>{license.nombre}</strong>
                        <span style={{ fontSize: 12, color: "#475569" }}>{license.licencia}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 13, color: "#1d4ed8", fontWeight: 500 }}>Ver detalle</span>
                  </article>
                );
              })}
            </div>

            {isSelectedCategory && selected ? <LicenseDetail license={selected} /> : null}
          </section>
        );
      })}
    </div>
  );
}
