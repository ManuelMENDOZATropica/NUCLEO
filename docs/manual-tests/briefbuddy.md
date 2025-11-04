# Manual test: BriefBuddy prompt context reload

Estos pasos verifican que modificar el archivo de contexto de BriefBuddy surte efecto sin reiniciar el servidor backend.

## Requisitos previos
- Variables de entorno configuradas, incluyendo `GEMINI_API_KEY`.
- Dependencias del backend instaladas (`npm install` en `backend/`).

## Pasos
1. Inicia el servidor en modo desarrollo desde `backend/`:
   ```bash
   npm run dev
   ```
2. Desde otro terminal, realiza una petición inicial para obtener una respuesta del bot (por ejemplo con `curl`):
   ```bash
   curl -X POST http://localhost:3000/api/brief-buddy/chat \
     -H "Content-Type: application/json" \
     -d '{"messages": [{"role": "user", "content": "Hola"}]}'
   ```
   Guarda el texto de la respuesta.
3. Edita `frontend/public/Documents/BriefBuddy/prompt_context.txt` y añade un texto distintivo (por ejemplo `Prueba sin reinicio`).
4. Repite la petición `curl` del paso 2.
5. Verifica que la nueva respuesta refleja el cambio del archivo de contexto (deberías ver `Prueba sin reinicio` en la salida) sin haber reiniciado el servidor.
6. (Opcional) Revierte el cambio en el archivo de contexto.

Si el texto añadido aparece en la segunda respuesta, el backend está cargando el archivo actualizado en cada solicitud.
