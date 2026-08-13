# HPZ Early Access — Guía del propietario

Sistema de captación de correos de www.hpzperformance.com.
No se publica en la web (excluido por `.vercelignore`).

---

## ⚠️ LO ÚNICO QUE TIENES QUE HACER

El sistema está construido y probado, pero **no guardará ningún correo hasta que
añadas 2 claves**. Son 10 minutos.

### Paso 1 — Clave de la base de datos (obligatoria)

1. Entra a **supabase.com** → proyecto *Human Performance Zone Project*
2. Menú lateral: **Project Settings → API**
3. En la sección *Project API keys*, copia la clave **`service_role`** (dice "secret")
4. Entra a **vercel.com** → proyecto **hpz-web** → **Settings → Environment Variables**
5. Añade:
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: *(la clave que copiaste)*
   - Environments: marca **Production**, **Preview** y **Development**
6. Guarda

> Esta clave da acceso total a la base de datos. No la pegues nunca en un chat,
> ni en el código, ni se la envíes a nadie. Solo va en Vercel.

### Paso 2 — Correo de bienvenida (opcional pero recomendado)

Sin esto los correos **sí se guardan**, simplemente no se envía el email de bienvenida.

1. Crea una cuenta gratis en **resend.com** (3.000 correos/mes gratis)
2. **API Keys → Create API Key**, copia la clave
3. En Vercel añade la variable `RESEND_API_KEY` con ese valor
4. *(Opcional, para que los correos salgan desde @hpzperformance.com)*: en Resend
   → **Domains → Add Domain**, añade `hpzperformance.com` y copia los registros DNS
   que te dé a tu proveedor de dominio. Cuando verifique, añade en Vercel:
   `EMAIL_FROM` = `HPZ Performance <hello@hpzperformance.com>`

   Mientras tanto los correos salen desde la dirección compartida de Resend, que
   funciona perfectamente para empezar.

### Paso 3 — Activar

En Vercel → **Deployments** → en el último, menú `⋯` → **Redeploy**.
Las variables solo se aplican tras un nuevo despliegue.

### Paso 4 — Probar

Entra a www.hpzperformance.com, escribe tu propio correo y pulsa *Get Early Access*.
Deberías ver "YOU'RE IN THE ZONE." y recibir el correo de bienvenida.

---

## Dónde están los correos

En Supabase, tabla **`marketing_leads`**.

**Para verlos:** supabase.com → tu proyecto → **Table Editor** → `marketing_leads`.

Nadie puede leer esta tabla desde internet: está bloqueada y solo el servidor de la
web puede escribir en ella. Verificado con pruebas.

## Cómo exportar la lista

Table Editor → `marketing_leads` → botón **Export** → *Download as CSV*.
Ese archivo se puede subir directo a Mailchimp, Brevo o cualquier herramienta de correo.

Si solo quieres los activos, en Supabase → **SQL Editor** y pega:

```sql
select email, segment, utm_source, form_location, created_at
from marketing_leads
where status = 'active'
order by created_at desc;
```

## De dónde vino cada persona

Cada registro guarda su origen automáticamente:

| Columna | Qué te dice |
|---|---|
| `utm_source` | La red o sitio (instagram, facebook…) |
| `utm_campaign` | La campaña concreta |
| `form_location` | Qué formulario usó: `hero`, `beta` o `final` |
| `page` | La página donde se apuntó |

**Para que esto funcione, comparte enlaces con etiqueta.** Ejemplo — el enlace de tu bio de Instagram:

```
https://www.hpzperformance.com/?utm_source=instagram&utm_medium=social&utm_campaign=bio
```

Y en una historia concreta:

```
https://www.hpzperformance.com/?utm_source=instagram&utm_medium=social&utm_campaign=beta-julio
```

Después puedes ver qué funciona mejor:

```sql
select utm_source, utm_campaign, count(*) as leads
from marketing_leads
group by utm_source, utm_campaign
order by leads desc;
```

## Atletas vs entrenadores

Después de apuntarse, se les pregunta "How do you train?" (es opcional, pueden ignorarlo).
La respuesta queda en la columna `segment`: `athlete`, `coach`, `lifestyle` o `unknown`.

```sql
select segment, count(*) from marketing_leads group by segment;
```

## Bajas (unsubscribe)

Cada correo lleva un enlace de baja al final. Cuando alguien lo usa:

- Ve una página de HPZ que le pide confirmar (así un clic accidental no le da de baja)
- Al confirmar, su registro pasa a `status = 'unsubscribed'`
- **No borres esos registros.** Se conservan justamente para saber a quién no escribir.

**Antes de cualquier envío masivo, filtra siempre por `status = 'active'`.**

Si esa persona vuelve a apuntarse por la web más adelante, el sistema la reactiva sola.

## Correo de bienvenida

Se envía solo, al instante, a quien se apunta. Asunto: *"Welcome to the Zone."*
Si el envío falla, el correo de la persona igual queda guardado — nunca se pierde un contacto.

El texto está en `api/_email.js` por si quieres cambiarlo.

## Estadísticas

En **vercel.com → hpz-web → Analytics** verás las visitas.

El sistema también manda estos eventos (cuántos ven el formulario, cuántos lo envían,
cuántos lo completan, y desde qué formulario):

`lead_form_view`, `lead_form_started`, `lead_form_submit`, `lead_form_success`,
`lead_form_error`, `lead_segment_selected`

> Para ver estos eventos hace falta el plan **Vercel Pro**. Sin él todo sigue
> funcionando igual, solo que no verás el desglose. **Nunca se envía ningún correo
> electrónico a las estadísticas** — solo datos anónimos.

Mientras tanto puedes calcular la conversión a mano: leads en Supabase ÷ visitas en Vercel.

---

## Resumen técnico (por si otro desarrollador entra)

| Pieza | Dónde |
|---|---|
| Formularios | `index.html` → 3 puntos con `data-lead-mount` |
| Lógica del navegador | `leads.js` |
| Guardar el lead | `api/subscribe.js` |
| Segmentación | `api/segment.js` |
| Bajas | `api/unsubscribe.js` |
| Envío de correo | `api/_email.js` (cambiar de proveedor se hace solo aquí) |
| Utilidades | `api/_lib.js` |
| Variables necesarias | `.env.example` |

Protecciones: campo trampa para bots, rechazo de envíos instantáneos, límite por IP
(5 cada 10 min y 10 por hora), validación en servidor, IPs guardadas solo como huella
irreversible, correos nunca escritos completos en los registros.
