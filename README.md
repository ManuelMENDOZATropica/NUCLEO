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

1. Instala dependencias y prepara los datos opcionales:

   ```bash
   npm install
   npm run sync:licenses
   npm run generate:search
   ```

2. Levanta la API (se ejecuta en `http://localhost:5000` por defecto):

   ```bash
   npm run api
   ```

3. En otra terminal inicia Vite:

   ```bash
   npm run dev
   ```

   El frontend quedará disponible en `http://localhost:5173` y consumirá la API mediante la variable `VITE_API_URL`.

### Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto con la URL de la API que corresponda a tu entorno:

```bash
VITE_API_URL=http://localhost:5000
```

En producción define el valor de `VITE_API_URL` según la plataforma donde hospedes la API.

### Endpoints disponibles

El servidor JSON expone un CRUD básico en `/api/publications`:

- `GET /api/publications`: lista todas las publicaciones.
- `POST /api/publications`: crea una nueva publicación (campos obligatorios: `id`, `title`, `summary`, `body`, `authorEmail`).
- `PUT /api/publications/:id`: actualiza una publicación existente.
- `DELETE /api/publications/:id`: elimina una publicación y responde `204`.

Los datos se almacenan en `data/publications.json`. Si el archivo no existe se genera automáticamente con un arreglo vacío.

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
3. Cada nuevo commit en la rama principal generará un deploy estático listo para compartir. El archivo `vercel.json` incluye un rewrite "catch-all" que redirige las rutas internas al `index.html` de Vite para evitar errores 404 en enlaces profundos.
