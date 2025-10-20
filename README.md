# NUCLEO

NUCLEO es el repositorio interno de TROPICA para centralizar recursos clave de IA, RR.HH., inducciones y automatizaciones. Construido como sitio estático modular, permite documentar flujos, licencias y tutoriales con navegación clara, búsqueda local y contenido en MDX listo para desplegarse en Vercel.

## Stack

- [React 18](https://react.dev/)
- [Vite](https://vitejs.dev/) con soporte MDX
- [TailwindCSS](https://tailwindcss.com/)
- [React Router DOM v6](https://reactrouter.com/)
- [gray-matter](https://github.com/jonschlinkert/gray-matter)
- [Fuse.js](https://fusejs.io/)

## Requisitos previos

- Node.js 18+
- npm 9+

## Cómo ejecutar localmente

```bash
npm install
npm run sync:licenses
npm run generate:search
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

## Estructura de contenido MDX

Todos los archivos MDX incluyen frontmatter YAML con metadatos:

```mdx
---
title: "Tutorial n8n"
description: "Patrones regex comunes en n8n"
tags: ["tutorial", "n8n"]
section: "recursos-ia"
updatedAt: "2025-10-20"
---
```

Guarda el contenido en `src/content` siguiendo la jerarquía de carpetas. Los archivos `index.mdx` representan la portada de cada sección. Utiliza el componente `<Tag value="nombre" />` para etiquetar recursos dentro del contenido.

## Sincronizar el catálogo de licencias

1. Actualiza `src/content/recursos-ia/licencias/catalogo.csv` con las columnas: `Proveedor, Producto, Plan, Seats, Costo, Responsable, Renovación`.
2. Ejecuta el script:

```bash
npm run sync:licenses
```

Se generará `catalogo.mdx` con una tabla MDX lista para publicarse.

## Generar el índice de búsqueda local

```bash
npm run generate:search
```

El script recorre todo `src/content`, lee el frontmatter y produce `public/search-index.json`, usado por Fuse.js para entregar resultados inmediatos en el navegador.

## Despliegue en Vercel

1. Ejecuta el build local para verificar:

```bash
npm run build
```

2. Conecta el repositorio a Vercel y define el comando de build `npm run build` y el directorio de salida `dist` (configurado en `vercel.json`).
3. Cada nuevo commit en la rama principal generará un deploy estático listo para compartir.
