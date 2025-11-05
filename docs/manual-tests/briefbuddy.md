# Manual test: BriefBuddy prompt context reload

Estos pasos verifican que modificar el archivo de contexto de BriefBuddy surte efecto sin reiniciar el entorno serverless.

## Requisitos previos
- Variables de entorno configuradas (`OPENAI_API_KEY`, `OPENAI_MODEL`, credenciales de Google si corresponde).
- Dependencias instaladas en la raíz (`npm install`).

## Pasos
1. Inicia el entorno local con Vercel apuntando a la carpeta `frontend` del proyecto:
   ```bash
   vercel dev frontend
   ```
2. Desde otro terminal, realiza una petición inicial al endpoint de streaming (por ejemplo con `curl`):
   ```bash
   curl -N -X POST http://localhost:3000/api/chat/stream \
     -H "Content-Type: application/json" \
     -d '{"messages": [{"role": "user", "content": "Hola"}]}'
   ```
   Guarda el texto de la respuesta.
3. Edita `frontend/public/Documents/BriefBuddy/prompt_context.txt` y añade un texto distintivo (por ejemplo `Prueba sin reinicio`).
4. Repite la petición `curl` del paso 2.
5. Verifica que la nueva respuesta refleja el cambio del archivo de contexto (deberías ver `Prueba sin reinicio` en la salida) sin haber reiniciado `vercel dev`.
6. (Opcional) Revierte el cambio en el archivo de contexto.

Si el texto añadido aparece en la segunda respuesta, el backend está cargando el archivo actualizado en cada solicitud.

## Verificación manual de CORS
1. Define `CORS_ALLOWED_ORIGINS` con la URL del frontend (por ejemplo `https://nucleo-nine.vercel.app`).
2. Inicia el servidor heredado (`cd backend && npm run dev`) si necesitas probar ese servicio.
3. Desde un navegador, ejecuta:
   ```js
   fetch("https://TU_BACKEND/api/chat/stream", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ messages: [{ role: "user", content: "ping" }] })
   }).then(r => ({ ok: r.ok, status: r.status, origin: r.headers.get("access-control-allow-origin") }))
   ```
4. Verifica que la promesa se resuelve (no se rechaza por CORS) y que `origin` coincide con la URL configurada en `CORS_ALLOWED_ORIGINS`.
