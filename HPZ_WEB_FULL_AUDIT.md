# HPZ Web — Full Technical Audit

**Fecha:** 2026-07-20 · **Sitio:** https://www.hpzperformance.com · **Rama:** `audit/hpz-web-full-check`
**Nota:** este archivo NO se sirve en producción (`.vercelignore` excluye `*.md`).

---

## 1. Resumen ejecutivo

La web está **estable y en buen estado**. Cero hallazgos críticos, cero altos. Se encontraron 1 hallazgo medio (sin página 404 personalizada), 3 bajos y varias recomendaciones. La única corrección aplicada en esta auditoría fue eliminar `desktop.ini` del repositorio (artefacto de Windows servido públicamente). La postura de seguridad es sólida: todos los headers verificados en vivo, CSP estricto sin `unsafe-inline` en scripts, sin dependencias, sin backend, sin secretos.

## 2. Stack tecnológico

- **Frontend:** HTML/CSS/JS estático puro. Sin framework, sin build, sin npm (cero dependencias → cero vulnerabilidades de dependencias).
- **JS:** un solo archivo `app.js` (2 KB): scroll animations (IntersectionObserver), menú hamburguesa, acordeón FAQ, hooks de analytics (`data-event`).
- **Hosting/Deploy:** Vercel, auto-deploy desde GitHub `Raphyjoel5/hpz-web` rama `main`.
- **Analytics:** Vercel Web Analytics (cookieless — no requiere banner de consentimiento). Eventos custom preparados pero requieren plan Pro.
- **Backend/BD/Auth/Pagos/CMS:** no existen. **Formularios:** no existen (captación vía DM Instagram/email).
- **Fuentes:** Google Fonts (Bebas Neue, Barlow Condensed, Barlow) con `display=swap` y preconnect.

## 3–5. Arquitectura, estado y rutas revisadas

3 páginas: `/` (landing ~78 KB), `/terms.html`, `/privacy.html`. Assets: `favicon.svg`, `apple-touch-icon.png`, `og-image.png` (55 KB), 2 documentos beta en `/docs/`. Todas devuelven 200 con Content-Type correcto (verificado en vivo).

## 6. Funcionalidades revisadas

| Área | Estado |
|---|---|
| Navegación desktop + anclas (7 anchors) | ✅ todos los `href="#x"` tienen `id` destino |
| Menú móvil hamburguesa (Escape, resize, click fuera de links) | ✅ verificado en sesión anterior |
| Acordeón FAQ (8 preguntas, aria-expanded) | ✅ verificado abre/cierra |
| Enlaces internos entre páginas | ✅ sin enlaces rotos |
| Enlaces externos (Instagram ×3, Facebook ×2) | ✅ existen, `noopener noreferrer` |
| Descargas beta (.docx, .pdf) | ✅ 200 en producción |
| Links legales Terms/Privacy | ✅ |
| `TIKTOK_URL`/`THREADS_URL` | dentro de comentario HTML — no son enlaces vivos ✅ |
| Formularios / login / sesiones | N/A — no existen |

## 7–10. Hallazgos

### Críticos: 0 · Altos: 0

### Medios (1)
| # | Hallazgo | Riesgo | Solución | Estado |
|---|---|---|---|---|
| M1 | Sin página 404 personalizada — Vercel muestra texto plano "NOT_FOUND" | UX pobre / pérdida de visitante en URL errónea | Crear `404.html` con branding HPZ + link a home | **Pendiente (requiere aprobación)** |

### Bajos (3)
| # | Hallazgo | Evidencia | Solución | Estado |
|---|---|---|---|---|
| B1 | `desktop.ini` servido públicamente (200) | `curl /desktop.ini` → 200 | Eliminado del repo + `.gitignore` | **Corregido** |
| B2 | Contraste de `.footer-copy` y textos `--mid` (#404858 sobre #07090e ≈ 2.6:1) por debajo de WCAG AA 4.5:1 | CSS index/terms/privacy | Aclarar a ~#6b7585 si se acepta el cambio visual | Requiere revisión manual (afecta diseño) |
| B3 | Sin favicon PNG de respaldo (solo SVG) — navegadores muy antiguos no lo muestran | `<link rel="icon" type="image/svg+xml">` | Añadir `favicon.png` 32×32 como fallback | Pendiente (opcional) |

### Recomendaciones
- **Schema markup**: añadir JSON-LD (`Organization` + `FAQPage` para las 8 FAQs — elegibles para rich results en Google). No se tocó por la regla de no alterar SEO sin aprobación.
- **Skip link** ("Saltar al contenido") para teclado/lectores de pantalla.
- **Cache-Control para assets estáticos**: `og-image.png`, `app.js`, docs se sirven con `max-age=0`; se podría añadir cache largo para assets versionados (mejora repetición de visitas; riesgo bajo).
- **`Access-Control-Allow-Origin: *`** presente (default Vercel para estáticos) — riesgo nulo sin credenciales/API, solo documentado.
- **Captación de emails**: sigue pendiente de elegir proveedor (Formspree/MailerLite).
- **Monitorización**: activar notificaciones de deploy fallido en Vercel (dashboard → Settings → Notifications).

## 11. Seguridad (verificado EN VIVO 2026-07-20)

| Control | Valor | Estado |
|---|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'self'` (sin unsafe-inline en scripts), object-src 'none', frame-ancestors 'none', upgrade-insecure-requests | ✅ |
| Strict-Transport-Security | 2 años, includeSubDomains, preload | ✅ |
| X-Frame-Options / X-Content-Type-Options | DENY / nosniff | ✅ |
| Referrer-Policy / Permissions-Policy / COOP | strict-origin-when-cross-origin / cam-mic-geo bloqueados / same-origin | ✅ |
| HTTPS + redirects | http→https 308, apex→www 307 | ✅ |
| Secretos en repo | Ninguno (grep de patrones API keys/tokens: 0 resultados; sin .env) | ✅ |
| XSS/SQLi/CSRF/uploads/CORS API | Sin superficie: no hay inputs, BD, sesiones ni endpoints | ✅ N/A |
| `HANDOFF.md`, `vercel.json`, `.vercelignore` | 404 en producción | ✅ |
| Source maps / logs sensibles | No existen | ✅ |
| npm audit | N/A — cero dependencias | ✅ |

## 12–13. Formularios/leads y BD/APIs
No existen. Sin riesgo y sin datos personales almacenados. La captación actual es manual (Instagram DM / email).

## 14–15. Rendimiento y Core Web Vitals
Peso total de la página ≈ 90 KB (HTML 78 KB + app.js 2 KB + fuentes). Sin imágenes en el render (todo SVG inline), sin JS de terceros salvo Vercel Insights (diferido, 1.5 KB). CSS inline = cero requests bloqueantes salvo Google Fonts (con preconnect + swap). CLS ≈ 0 (sin imágenes sin dimensiones), LCP dominado por texto. **Expectativa: CWV en verde con holgura.** Única mejora disponible: cache largo para assets (ver recomendaciones).

## 16–17. Responsive y compatibilidad
Breakpoints 768/480px, `100dvh` con fallback `100vh` (iOS Safari), menú móvil verificado, `scrollWidth <= innerWidth` (sin scroll horizontal) verificado en preview. Sin APIs de JS exóticas: IntersectionObserver, `classList`, `dataset` — soportadas por Chrome/Edge/Firefox/Safari desde hace años. `desktop.ini`/quirks de Windows no afectan.

## 18. Accesibilidad
✅ 1 solo `<h1>`, jerarquía h1→h2→h3 correcta · `lang="en"` · viewport correcto · sin `<img>` (SVGs con `aria-hidden` o `aria-label`) · FAQ con `aria-expanded` + `hidden` · hamburguesa con `aria-expanded`/`aria-label` · `:focus-visible` estilizado · `prefers-reduced-motion` respetado · áreas clicables ≥34px.
⚠️ Pendiente: skip link (recomendación), contraste `--mid` (B2).

## 19. SEO técnico
✅ Titles/descriptions únicos por página, canonical en las 3, OG + Twitter cards con imagen 1200×630, sitemap.xml (3 URLs, 200), robots.txt (200, permite todo), sin noindex accidental, sin contenido duplicado, dominio consolidado en `www` con redirects correctos, mobile-friendly.
⚠️ Faltan: schema markup JSON-LD (recomendación), página 404 con branding (M1).

## 20. Analítica
Un solo sistema (Vercel Analytics, cookieless, sin consentimiento requerido, sin PII). Script en las 3 páginas. CSP permite `vitals.vercel-insights.com`. Eventos `data-event` (social_instagram_click, social_facebook_click) implementados; requieren Vercel Pro para registrarse. Sin doble tracking, sin IDs hardcoded.

## 21–22. Dependencias y producción
Cero dependencias (no hay package.json — nada que auditar/actualizar). Deploy: push a main → Vercel. Sin variables de entorno. Rollback disponible: `git revert` + push, o "Instant Rollback" en dashboard Vercel. Preview deployments automáticos por rama disponibles en Vercel.

## 23–24. Pruebas ejecutadas y resultados
No existen suites de test ni lint/typecheck (sin toolchain — N/A). Verificaciones ejecutadas y resultados: **todas pasaron** —
1. Inventario y pesos de archivos ✅
2. Integridad de todos los href/src internos contra ids/archivos ✅
3. Headers de seguridad en vivo ✅
4. Redirects http/apex ✅
5. 13 rutas de producción (status + content-type) ✅
6. Bloqueo de archivos internos (.md, vercel.json) ✅
7. Jerarquía de headings, lang, viewport ✅
8. Grep de secretos/patrones peligrosos (0 hallazgos) ✅

## 25–26. Correcciones realizadas y archivos modificados
- **Eliminado** `desktop.ini` del repositorio (B1).
- **Creado** `.gitignore` (desktop.ini, Thumbs.db, .DS_Store).
- **Creado** este reporte `HPZ_WEB_FULL_AUDIT.md` (no público).

## 27–28. Revisión manual / credenciales necesarias
- B2 (contraste footer): decisión de diseño tuya.
- Eventos custom de analytics: requiere upgrade a Vercel Pro (tu cuenta).
- Email capture: requiere cuenta en proveedor (Formspree/MailerLite/Buttondown).

## 29. Riesgos antes de producción
Los cambios de esta rama (borrar desktop.ini + .gitignore + este .md) son de **riesgo cero**: no tocan HTML, CSS, JS ni configuración servida.

## 30. Comandos para repetir las verificaciones

```bash
# Enlaces internos vs ids
grep -oE 'href="#[^"]+"' index.html | sort -u; grep -oE 'id="[^"]+"' index.html | sort -u
# Headers en vivo
curl -sI https://www.hpzperformance.com/
# Rutas clave
for p in /HANDOFF.md /vercel.json /sitemap.xml /robots.txt /app.js /og-image.png; do curl -s -o /dev/null -w "%{http_code} $p\n" https://www.hpzperformance.com$p; done
# Redirects
curl -sI http://www.hpzperformance.com/ | head -3; curl -sI https://hpzperformance.com/ | head -3
# Secretos
grep -rInE "(api[_-]?key|secret|token|password)\s*[:=]" --include="*.html" --include="*.js" --include="*.json" .
```

**Veredicto: la web está estable y es seguro seguir utilizándola.** Sin hallazgos críticos ni altos. Los pendientes (404 branded, schema, favicon PNG, contraste footer) son mejoras, no riesgos.
