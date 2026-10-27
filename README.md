# Log Pose Console — TEAM-011 · Macarrón 3

Consola operativa de la Guild de Cazarrecompensas, construida sobre la API cerrada del curso.
React 18+ · TypeScript estricto · Vite · React Router · Tailwind CSS.

## Integrantes

| Nombre | Código | GitHub |
|---|---|---|
| Marco Bautista | `202310546` | [@marcobautista-sketch](https://github.com/marcobautista-sketch) |
| Fabiana Gómez | `202310563` | [@fabsgomez](https://github.com/fabsgomez) |
| Juan Carlos Alexander Vergara Montalván | `202120598` | [@JuancarlosVergara23](https://github.com/JuancarlosVergara23) |

## Requisitos

- Node 24 LTS
- npm

## Cómo ejecutar

```bash
npm install
```

Copiar el archivo de ejemplo de variables de entorno:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Levantar el servidor de desarrollo:

```bash
npm run dev
```

La aplicación queda en <http://localhost:5173>.

## Variables requeridas

| Variable | Valor |
|---|---|
| `VITE_API_BASE_URL` | `https://logpose-api-jg7f.onrender.com/api/v1` |

Ya viene en `.env.example`. El archivo `.env` no se versiona, y las credenciales de la tripulación no están en el repositorio.

> El backend está alojado en un plan gratuito que se suspende tras unos minutos sin uso. La primera petición después de un rato puede tardar; las siguientes responden con normalidad.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Verificación de tipos y compilación de producción |
| `npm run preview` | Sirve la compilación de producción |
| `npm run typecheck` | Solo verificación de tipos |
| `npm run lint` | Linter |

## Rutas

| Ruta | Contenido |
|---|---|
| `/login`, `/register` | Acceso y registro de la tripulación |
| `/dashboard` | Indicadores del workspace y estado del Log Pose |
| `/wanted`, `/wanted/:id` | Carteles de "Se Busca" y su detalle |
| `/news`, `/news/:id` | Feed de noticias y verificación de rumores |
| `/sagas`, `/sagas/:id` | Resumen de sagas e historia con scrollytelling |

Todas salvo el acceso son privadas. Cualquier ruta inexistente muestra una página 404.

## Decisiones técnicas

**Una sola puerta hacia la API.** Todas las peticiones pasan por `apiFetch` (`src/lib/api.ts`), que concentra la URL base, la cabecera `Authorization`, el parseo del formato de error de la API y la detección del token expirado. Los tipos de `src/types/api.ts` están calcados del contrato público, de modo que ninguna respuesta usa `any`.

**Tres estados de sesión en lugar de dos.** Mientras se valida el token guardado contra `/auth/me`, la aplicación permanece en `checking` y muestra un indicador de carga. Con un booleano, al recargar se vería el formulario de acceso durante la verificación.

**La URL es la única fuente de verdad de los listados.** Filtros, búsqueda, orden, página y etapa activa de la saga viven en la barra de direcciones y no se duplican en el estado de React. Recargar, compartir un enlace o usar el historial reconstruye la misma vista. Los valores que llegan por la URL se validan contra su lista permitida antes de usarse.

**Estado de servidor escrito a mano.** El enunciado no permite librerías de caché, de estado en URL ni de scroll infinito, así que la cancelación de peticiones obsoletas (`AbortController`), el descarte de respuestas que llegan fuera de orden, la deduplicación por identificador y la garantía de una sola carga en vuelo están implementadas directamente en los efectos.

**El detalle de una noticia es una ruta hija.** `/news/:id` se monta dentro de `/news` mediante `Outlet`, por lo que el feed no se desmonta: conserva las páginas ya cargadas y la posición de lectura, y recibe la noticia actualizada tras verificarla sin volver a consultar el servidor.

**Animaciones con alternativa en todos los casos.** El scrollytelling usa animaciones CSS guiadas por scroll bajo `@supports` y transiciones de vista cuando el navegador las soporta; donde no existen, la narrativa avanza igual mediante clases aplicadas por observador. Con `prefers-reduced-motion` el movimiento se desactiva y el contenido sigue siendo legible y navegable por teclado.

## Estructura

```
src/
├── auth/        sesión, rutas privadas y errores de formulario
├── components/  layout y vistas de carga, error y vacío
├── lib/         cliente de la API
├── news/        feed con cursor y sus filtros
├── pages/       una página por ruta
├── sagas/       mapa, animaciones y estado bloqueado
├── types/       tipos del contrato de la API
└── wanted/      filtros en URL del listado de carteles
```
