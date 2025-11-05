# Brief Buddy Backend Migration

Este proyecto reemplaza la integración previa con Gemini por un backend compatible con Vercel basado en Node.js y la API oficial de OpenAI. El frontend existente en `frontend/` se mantiene como SPA y consume los nuevos endpoints desplegados en `frontend/api/`.

## Requisitos

- Node.js 18 o superior
- [Vercel CLI](https://vercel.com/docs/cli) instalada globalmente (`npm i -g vercel`)

## Instalación

1. Instala las dependencias del backend/serverless (en la raíz del repositorio):
   ```bash
   npm install
   ```
2. Instala las dependencias del frontend:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

## Variables de entorno

Configura un archivo `.env` en la raíz (o usa el gestor de secretos de Vercel) con las siguientes variables:

| Variable | Descripción |
| --- | --- |
| `OPENAI_API_KEY` | Clave de la API oficial de OpenAI. |
| `OPENAI_MODEL` | Modelo a utilizar (ej. `gpt-4.1-mini`). |
| `GOOGLE_CLIENT_ID` | Client ID de OAuth 2.0 de Google. |
| `GOOGLE_CLIENT_SECRET` | Client Secret del cliente OAuth. |
| `GOOGLE_REDIRECT_URI` | Redirect URI configurada en Google (apunta a `/api/auth/callback`). |
| `GOOGLE_REFRESH_TOKEN` | Refresh token generado tras completar el flujo OAuth. |
| `DRIVE_FOLDER_ID` | ID de la carpeta raíz en Google Drive donde se guardarán los briefs. |

> Consejo: utiliza los endpoints `/api/auth/login` y `/api/auth/callback` para obtener el `GOOGLE_REFRESH_TOKEN`.

## Ejecución en local

1. Asegúrate de que las dependencias están instaladas y las variables de entorno configuradas.
2. Ejecuta el entorno de desarrollo de Vercel apuntando a la carpeta `frontend`:
   ```bash
   vercel dev frontend
   ```
3. En paralelo, levanta el frontend (si no lo hace automáticamente `vercel dev`):
   ```bash
   cd frontend
   npm run dev
   ```

El archivo de contexto `frontend/public/Documents/BriefBuddy/prompt_context.txt` se carga en tiempo de ejecución por los endpoints y no debe moverse.

## Endpoints principales

- `POST /api/chat/stream` (Edge): chat en streaming mediante SSE con OpenAI (archivo `frontend/api/chat/stream.js`).
- `POST /api/upload` (Node.js): recepción de archivos PDF/DOC(X), extracción de texto y generación de brief inicial (archivo `frontend/api/upload.js`).
- `POST /api/finalize` (Node.js): consolidación del brief, generación de DOCX y subida a Google Drive (archivo `frontend/api/finalize.js`).
- `GET /api/auth/login` y `GET /api/auth/callback`: flujo OAuth para obtener el refresh token de Google (carpeta `frontend/api/auth/`).

El frontend ya está configurado para utilizar estos endpoints y mantener la ruta del contexto original.
