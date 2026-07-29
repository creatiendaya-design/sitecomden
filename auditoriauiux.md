# Auditoría UX/UI integral de `shopgood-pe`

- **Fecha:** 2026-07-27
- **Rama:** `master`
- **Commit auditado:** `d5a6698`
- **Alcance:** storefront, catálogo, producto, carrito, checkout, autenticación y acceso administrativo
- **Modalidad:** navegación real, inspección visual responsive, teclado, mediciones DOM y revisión no destructiva
- **Único archivo de proyecto modificado por esta auditoría:** `auditoriauiux.md`

> Las capturas de móvil y desktop se inspeccionaron durante la sesión, pero no se
> guardaron en el repositorio para respetar la restricción de no generar archivos
> adicionales. Los datos del informe se basan en pantallas abiertas y métricas
> obtenidas en el navegador, no únicamente en lectura de CSS.

## Alcance y condiciones de prueba

Se abrió la aplicación real con Chrome/Playwright en modo headless. El servidor
de desarrollo, usando la configuración actual sin ajustes, devolvió HTTP 500 en
`/`, `/productos`, `/carrito` y `/checkout` por un error TLS de Prisma al
conectarse a Neon. Para poder evaluar la interfaz se ejecutó temporalmente la
compilación existente en otro puerto, cambiando **solo en memoria** la
negociación TLS; no se modificó `.env`, la base de datos, el código ni los
estilos.

Se probaron estas resoluciones:

- Móvil: 320×568, 360×800, 375×812, 390×844 y 430×932.
- Tablet: 768×1024, 820×1180 y 1024×1366.
- Desktop: 1280×720, 1366×768, 1440×900 y 1920×1080.
- Orientación horizontal: 568×320, 800×360, 812×375, 844×390,
  932×430, 1024×768, 1180×820 y 1366×1024 en el acceso administrativo.
- Teclado y orden de foco: acceso administrativo.
- Contenido real: 34 productos, un producto con múltiples imágenes, carrito
  con un producto, checkout con Lima/Lima/Miraflores y métodos de envío.

No se confirmó un pedido, no se realizó un pago y no se ejecutó ninguna acción
administrativa que escribiera datos.

## 1. Resumen ejecutivo

La UX/UI **no está apta para producción**. El sistema demuestra una base
funcional relevante: el catálogo carga productos reales, el detalle permite
agregar al carrito, el carrito recalcula promociones y el checkout permite
seleccionar ubicación, envío y pago. El layout general se adapta razonablemente
desde 320 px hasta 1920 px y no presenta colapsos masivos.

Sin embargo, la presentación pública conserva contenido de plantilla y datos
incongruentes: “Título del hero”, “Habla sobre tu marca”, secciones completas en
inglés, estadísticas clínicas en 0%, “Tiendaa”, “dsd” y tres identidades
distintas (`ShopGood Perú`, `Tiendaa` y `nuejoy PERÚ`). El logotipo apunta a
`/logo.png`, archivo que no existe en `public`, y se muestra como imagen rota.
Estas señales reducen drásticamente confianza y percepción de legitimidad.

En móvil, el catálogo fuerza dos columnas incluso a 320 px. Como resultado, 33
CTAs visibles de tarjetas tienen texto recortado a 320 px y 30 a 360/375 px;
además, la mayoría de títulos se truncan. En el producto evaluado, el CTA
“Agregar al carrito” comienza entre `y=854` y `y=924`, por debajo del primer
viewport en los cinco móviles probados. Esto obliga a desplazarse antes de
encontrar la acción principal.

El checkout tiene un riesgo de operación: al terminar de cargar, Departamento
queda seleccionado silenciosamente en `AMAZONAS`, aunque inicialmente muestra
“Selecciona”. Además, Departamento, Provincia y Distrito no tienen `id`,
`name`, `aria-label` ni asociación programática con sus textos visibles. El
flujo sí consiguió cambiar a Lima, cargar provincias, distritos y seis métodos
de envío, pero no cumple un estándar aceptable de accesibilidad.

La autenticación de clientes no fue operable: `/iniciar-sesion` permaneció más
de 10 segundos en “Cargando...” sin error ni recuperación; `/registro` mostró
el título y enlace de retorno, pero ningún formulario después de 10 segundos.
El panel administrativo interno no pudo auditarse por falta de una sesión
autenticada. Solo se verificaron sus accesos públicos y el estado de espera
previo a la redirección.

## 2. Veredicto general

**No preparado.**

La compra como invitado puede avanzar hasta el paso anterior al pago, pero los
problemas de contenido, marca, responsive móvil, autenticación, accesibilidad y
configuración operativa impiden considerarlo un producto comercial terminado.

## 3. Confianza

**Media.**

La confianza es alta para home, catálogo, el producto probado, carrito, inicio
del checkout y accesos públicos. Es baja para cuenta autenticada, confirmación,
pagos, devoluciones y panel administrativo, porque no se dispuso de credenciales
ni se autorizaron escrituras reales.

## 4. Evaluación por dispositivo

### Móvil

**Resultado: No preparado.**

- No hubo overflow horizontal global en catálogo ni producto.
- La home mide aproximadamente 6.7–7.0 pantallas verticales de contenido; gran
  parte es material de plantilla no relacionado con los productos.
- La cuadrícula de dos columnas comprime títulos, precios y CTAs. A 320 px los
  botones de tarjeta miden 106×32 px y recortan “Agregar al carrito”.
- En 360/375 px los botones miden 126/134×32 px y siguen recortando gran parte
  de los CTAs.
- El CTA del producto queda fuera del primer viewport en 320×568, 360×800,
  375×812 y 390×844. En 430×932 solo aparecen aproximadamente 8 px del botón.
- El drawer del carrito usa todo el viewport y mantiene total y acciones
  visibles, pero sus controles de cantidad/eliminación miden 24×24 px.
- El banner de cookies ocupa 137 px de alto en 390×844, un 16.2% del viewport;
  sus botones miden solo 32 px de alto.
- El checkout ofrece un resumen plegable y CTA inferior fijo, una decisión
  adecuada para uso con una mano, aunque el formulario y sus labels requieren
  correcciones de accesibilidad.

### Tablet

**Resultado: Casi preparado en layout; no preparado en contenido y flujos.**

- El catálogo se adapta sin overflow y ofrece tarjetas más legibles.
- La home y el producto presentan 4 px de scroll horizontal involuntario en
  768×1024 y 1024×1366.
- El CTA de producto sí aparece en el viewport inicial.
- El acceso administrativo no tuvo overflow en 768×1024, 820×1180 ni
  1024×1366.
- El panel administrativo autenticado no fue verificado.

### Desktop

**Resultado: Estructuralmente estable; no preparado para producción.**

- Catálogo y producto mantienen estructura clara y alineada entre 1366 y
  1920 px.
- La home y el producto presentan 4 px de overflow a 1280×720; no apareció en
  1366, 1440 ni 1920.
- La home destina la mayor parte del primer viewport a un hero oscuro con el
  texto genérico “Título del hero”.
- Los CTAs de las tarjetas aparecen principalmente al hover; el contenido de
  plantilla y la identidad inconsistente dominan el problema visual.
- El acceso administrativo es limpio y centrado, pero carece de semántica de
  encabezado y landmark principal.

## 5. Evaluación por área

| Área | Estado | Evidencia |
|---|---|---|
| Storefront | **No preparado** | Hero, contenido y footer de plantilla; logo inexistente; mezcla de idiomas y marcas. |
| Catálogo | **No preparado en móvil** | 34 productos; CTAs recortados a 320–375 px; 25 títulos truncados a 320 px. |
| Producto | **Requiere correcciones** | Galería funcional y precio claro; CTA fuera del primer viewport móvil; contenido clínico irrelevante en 0%. |
| Carrito | **Casi preparado** | Agregar, cantidad, promoción, subtotal y acceso a checkout funcionaron; targets de 24 px y marquee duplicado. |
| Checkout | **Requiere correcciones altas** | Ubicación y envíos cargan; Departamento toma AMAZONAS por defecto; selects sin nombre accesible. |
| Cuenta | **No preparado** | Login bloqueado en “Cargando...” >10 s; registro sin formulario >10 s. |
| Panel administrativo | **No verificado** | Sin sesión; solo acceso, registro y redirección previa pudieron abrirse. |

## 6. Problemas críticos

No se confirmó un bloqueo `Critical` que cree o cobre un pedido de forma
incorrecta, porque la auditoría se detuvo antes del envío final. Sí existen
varios hallazgos `High` que deben tratarse como bloqueadores de lanzamiento.

## 7. Problemas altos

1. Contenido público de plantilla, claims clínicos incongruentes y tres marcas
   distintas en la misma experiencia.
2. Logotipo roto por ausencia de `/public/logo.png`.
3. CTAs de catálogo recortados en 320–375 px.
4. CTA principal del producto fuera del primer viewport en todos los móviles.
5. Login de cliente atrapado en “Cargando...” sin timeout ni recuperación.
6. Registro de cliente sin formulario ni explicación del fallo.
7. Departamento del checkout preseleccionado silenciosamente en AMAZONAS.
8. Selects geográficos del checkout sin nombre accesible.
9. Arranque local normal del storefront con HTTP 500 por la negociación TLS
   actual; requiere validación en el entorno objetivo.

## 8. Problemas medios

1. Overflow horizontal de 4 px en home/producto a 768, 1024 y 1280 px.
2. Targets de 24–40 px en catálogo, drawer, login y banner de cookies.
3. Marquee “LAS MEJORES OFERTAS” duplicado 16 veces en el árbol de lectura.
4. El drawer enfoca primero “Quitar uno”, no el título ni el cierre.
5. El cierre del drawer tiene nombre accesible en inglés: “Close”.
6. El acceso administrativo muestra durante ~3.3 s el shell y skeleton del
   panel antes de redirigir al login.
7. Accesos administrativos sin `h1`, `main` ni atributos `autocomplete`.
8. En checkout, textarea y varios controles personalizados no tienen asociación
   programática directa con su texto visible.
9. En el carrito, “Proceder al Pago” apareció tras esperar la verificación de
   stock, sin una estimación de tiempo.

## 9. Problemas bajos

1. Inputs y botones del acceso administrativo miden 36 px de alto.
2. Botón de mostrar contraseña de 40×36 px y excluido del orden de tabulación
   (`tabIndex=-1`).
3. Errores de ortografía y estilo: “Suscribite”, “Enterate”, “Inalambrico”,
   “Bateroas”, “Recargarble”, “sancudos” y mayúsculas inconsistentes.
4. Enlaces de footer “Información” y “Ayuda” apuntan repetidamente a `/`.

## 10. Riesgos de conversión

- El hero no comunica producto, público, beneficio ni oferta real.
- La imagen de marca rota y el footer incongruente erosionan confianza antes de
  que el usuario llegue a productos.
- Las estadísticas en 0% y los claims clínicos en inglés parecen datos
  incompletos o fabricados.
- El CTA de compra queda debajo del primer viewport en móvil y no existe sticky
  add-to-cart en el producto probado.
- La cuadrícula móvil impide leer de forma consistente títulos, precios
  comparativos y botones.
- El banner de cookies cubre contenido y usa targets pequeños.
- El login/registro roto impide consultar pedidos o convertir invitado a
  cliente.
- La selección silenciosa de AMAZONAS puede producir cotizaciones o direcciones
  erróneas.
- Los costos de envío se conocen solo después de completar ubicación; esto es
  normal, pero la home promete “Envío gratis a todo el Perú” mientras checkout
  ofrece varios métodos pagados. La contradicción debe resolverse.
- El producto evaluado anuncia “Envío gratis / En compras desde S/150”, mientras
  el encabezado dice envío gratis sin condición.

## 11. Riesgos de accesibilidad

- Departamento, Provincia y Distrito no exponen nombre accesible.
- El acceso administrativo no usa headings ni landmark `main`.
- El control de mostrar contraseña no es alcanzable por Tab.
- Los controles de cantidad y eliminación del drawer miden 24×24 px.
- CTAs de catálogo y consentimiento miden 32 px de alto.
- Los indicadores de carrusel miden aproximadamente 8×8 px.
- El marquee repite el mismo texto 16 veces para tecnologías asistivas.
- El estado “Cargando...” del login no usa `aria-busy`; no se observó mensaje
  accionable o de timeout.
- El registro incompleto tampoco expone alerta que explique la ausencia del
  formulario.
- La home contiene dos `h3` vacíos.
- La cantidad en producto es un `input[type=number]` sin `aria-label`.
- El drawer sí usa `role=dialog`, pero el foco inicial cae en “Quitar uno”.

No se declara cumplimiento WCAG. Contraste, lector de pantalla y escalado real
al 200% requieren una ronda específica después de corregir los bloqueadores.

## 12. Riesgos responsive

- A 320 px, el catálogo conserva dos columnas y comprime los botones a 106 px.
- A 360/375 px persiste el recorte de la mayoría de “Agregar al carrito”.
- Entre 19 y 25 títulos de tarjetas se truncan en móvil.
- El CTA de producto empieza fuera del viewport inicial móvil.
- Hay scroll horizontal global de 4 px en home/producto en 768, 1024 y 1280 px.
- En orientación horizontal del login, el CTA puede quedar bajo el pliegue
  (`y=357`, viewport de 320–390 px), aunque el documento permite scroll y no se
  corta.
- No se observó overflow en el acceso administrativo, catálogo o checkout móvil
  verificado.

## 13. Inconsistencias visuales

- Identidad: `ShopGood Perú`, `Tiendaa` y `nuejoy PERÚ`.
- Idioma: español mezclado con “All Categories”, “What are you looking for?”,
  “Human Performance Analytics”, “Sooo many benefits”, “Close” y claims
  clínicos completos en inglés.
- Paleta: header azul, hero negro/azul oscuro, sección morada, CTA de producto
  fucsia, CTA de catálogo negro y botón de filtro amarillo. La combinación no
  se percibe como un sistema cohesivo.
- Footer duplicado con grupos “Tienda / Información / Ayuda” repetidos.
- Home combina bloques de tienda generalista con narrativa clínica de un
  suplemento y productos electrónicos.
- El acceso administrativo usa una identidad sobria diferente del storefront;
  esto puede ser válido, pero hoy se suma a una marca pública no resuelta.

## 14. Procesos confusos o incompletos

- Login: no sale de “Cargando...”.
- Registro: no muestra campos ni error.
- Checkout: Departamento se autoselecciona sin intervención.
- Home: “Comprar ahora” no aporta contexto porque el hero no identifica el
  producto u oferta.
- Footer: “Información” y “Ayuda” parecen destinos, pero vuelven a home.
- Cuenta: no fue posible llegar a pedidos, perfil o recuperación.
- Devolución: existe contenido informativo, pero no se pudo iniciar una
  solicitud.
- Panel: sin sesión no fue posible verificar creación, inventario, pedido,
  envío, cancelación, reembolso o devolución.

## 15. Flujos probados

### Cliente

| Paso | Resultado | Evidencia |
|---|---|---|
| Entrar a home | Completado | HTTP 200 con contenido real y plantilla. |
| Buscar producto | Parcial | Buscador visible; no se ejecutó consulta por el tiempo de carga prolongado. |
| Filtrar/ordenar | Parcial | Filtros y ordenamiento visibles; interacción detallada no verificada. |
| Abrir producto | Completado | `reloj-inteligente-militar-nx6`. |
| Revisar galería | Completado | Imagen principal, flechas, puntos y miniaturas visibles. |
| Cambiar cantidad | Verificado visualmente | Controles −, cantidad y + presentes. |
| Agregar al carrito | Completado | Drawer abrió con 1 producto y subtotal S/1.00. |
| Editar carrito | Parcial | Controles disponibles; no se persistió una edición adicional. |
| Abrir carrito | Completado | Promoción S/1.00 aplicada sobre subtotal S/2.00. |
| Iniciar checkout | Completado | Compra como invitado, sin forzar login. |
| Completar contacto | Completado sin enviar | Datos ficticios solo en el navegador. |
| Elegir ubicación | Completado | Lima / Lima / Miraflores. |
| Cargar envíos | Completado | Seis métodos: 3 estándar/express y 3 courier. |
| Elegir pago | Parcial | Tarjeta y Mercado Pago visibles; no se inició transacción. |
| Confirmar pedido | No ejecutado | Evitado para no escribir datos ni crear un pedido real. |

El flujo hasta checkout requirió aproximadamente 8 interacciones principales,
sin contar el desplazamiento. El mayor riesgo de abandono está en el CTA móvil
del producto, el tiempo de verificación de stock y la información incoherente de
marca/envío.

### Administrador

| Paso | Resultado |
|---|---|
| Abrir login | Completado |
| Probar responsive y teclado | Completado |
| Iniciar sesión | No verificado; no había credenciales autorizadas |
| Navegar dashboard y módulos | No verificado |
| Crear/editar/eliminar | No ejecutado por restricción no destructiva |

## 16. Flujos no verificados

- Búsqueda con resultados, sin resultados y error.
- Persistencia de filtros y scroll al volver desde producto.
- Variantes largas y producto con una sola variante.
- Producto sin imagen y galería de vídeo.
- Carrito con numerosos productos.
- Cupón válido, inválido y vencido.
- Pago Culqi, Mercado Pago y confirmación.
- Rechazo, reintento, doble envío y recuperación del checkout.
- Página de éxito y detalle de pedido.
- Login, recuperación de contraseña, perfil y direcciones.
- Historial, favoritos, recompensas y referidos.
- Solicitud y seguimiento de devolución.
- Todo el panel autenticado.
- Tablas administrativas en móvil/tablet.
- Escalado real de texto al 200% y lector de pantalla.
- Navegación táctil en dispositivo físico.
- Producción desplegada con CDN, imágenes y credenciales reales.

## 17. Tabla de hallazgos

| ID | Página | Componente | Dispositivo / resolución | Categoría | Severidad | Estado | Evidencia | Problema e impacto | Recomendación concreta | Esfuerzo | Prioridad |
|---|---|---|---|---|---|---|---|---|---|---|---|
| UIUX-001 | Home | Hero y bloques editoriales | Todos | Contenido / conversión | High | CONFIRMED | “Título del hero”, “Habla sobre tu marca”, estadísticas 0% y bloques en inglés. | La tienda parece una plantilla sin terminar y pierde credibilidad. | Publicar una propuesta de valor real y ocultar bloques sin contenido aprobado desde el builder. | M | P0 |
| UIUX-002 | Header | Logo | Todos | Error objetivo | High | CONFIRMED | El `<img>` solicita `/logo.png`; no existe ningún archivo de logo en `public`. | Se muestra alt text/imagen rota en el área más visible. | Configurar un asset existente y agregar fallback visual con dimensiones estables. | S | P0 |
| UIUX-003 | `/productos` | CTAs de tarjetas | 320×568, 360×800, 375×812 | Responsive / conversión | High | CONFIRMED | 33 CTAs recortados a 320 px; 30 a 360/375 px; altura 32 px. | La acción principal se lee incompleta y es difícil de tocar. | Cambiar a una columna hasta un ancho donde el CTA completo quepa, o usar CTA breve con nombre accesible completo. Altura mínima 44 px. | M | P0 |
| UIUX-004 | `/productos` | Títulos de tarjetas | Móvil | Responsive | Medium | CONFIRMED | 25 títulos truncados a 320; 21 a 360; 20 a 375; 19 a 390. | Dificulta comparar productos similares. | Reservar altura uniforme y permitir 2–3 líneas; usar una columna en 320–375 px. | S | P1 |
| UIUX-005 | Producto NX6 | CTA principal | Todos los móviles | Conversión | High | CONFIRMED | CTA en `y=870/854/869/884/924`; fuera del viewport inicial. | El usuario no ve cómo comprar tras abrir producto. | Agregar sticky add-to-cart móvil después de seleccionar opciones y reducir altura inicial de galería. | M | P0 |
| UIUX-006 | Login cliente | Estado de carga | 390×844; transversal | Flujo / estado | High | CONFIRMED | “Cargando...” permaneció >10 s, sin `aria-busy`, error ni acción alternativa. | Bloquea acceso a cuenta y pedidos. | Implementar timeout, estado de error accionable, reintento y enlace para continuar como invitado. | M | P0 |
| UIUX-007 | Registro cliente | Formulario | 390×844; transversal | Flujo / estado | High | CONFIRMED | Tras >10 s solo aparecen título y “Volver a la tienda”; 0 formularios. | Impide crear cuenta sin explicar la causa. | Manejar fallo/carga de Clerk y mostrar error recuperable; instrumentar evento de fallo. | M | P0 |
| UIUX-008 | Checkout | Departamento | Móvil y transversal | Prevención de errores | High | CONFIRMED | Inicialmente “Selecciona”; al cargar queda `AMAZONAS` y no cuenta como campo faltante. | Riesgo de cotizar/registrar región no elegida por el comprador. | Mantener placeholder con valor vacío y exigir selección explícita. | S | P0 |
| UIUX-009 | Checkout | Selects geográficos | Todos | Accesibilidad | High | CONFIRMED | Selects sin `id`, `name`, `aria-label` ni `aria-labelledby`; `labels=null`. | Lectores de pantalla no identifican Departamento, Provincia y Distrito. | Asociar cada label mediante `htmlFor/id`, conservar `name` y anunciar carga/deshabilitado. | S | P0 |
| UIUX-010 | Home/producto | Contenedor global | 768×1024, 1024×1366, 1280×720 | Responsive | Medium | CONFIRMED | `scrollWidth = clientWidth + 4 px`. | Produce desplazamiento lateral y sensación de layout impreciso. | Localizar el bloque con ancho/borde exterior y contenerlo sin ocultar problemas de contenido. | S | P1 |
| UIUX-011 | Home | Banner de cookies | 390×844 | Usabilidad / accesibilidad | Medium | CONFIRMED | 137 px de alto; botones de 32 px. | Cubre 16.2% del viewport y ofrece targets pequeños. | Compactar copy móvil, permitir expansión y elevar controles a 44 px. | S | P1 |
| UIUX-012 | Home/producto | Claims y estadísticas | Todos | Confianza / contenido | High | CONFIRMED | Tres métricas visibles en 0%, texto clínico en inglés y producto evaluado no relacionado. | Afirmaciones incoherentes pueden parecer engañosas. | Eliminar el bloque de plantillas no aplicables; exigir fuente y producto asociado antes de publicar claims. | S | P0 |
| UIUX-013 | Footer | Marca y enlaces | Todos | Navegación / contenido | High | CONFIRMED | “Tiendaa”, “nuejoy PERÚ”, grupos repetidos; Información/Ayuda apuntan a `/`; texto “dsd”. | Rompe confianza y crea enlaces falsos. | Consolidar un único footer/branding y bloquear publicación de enlaces sin destino. | M | P0 |
| UIUX-014 | Carrito | Drawer | 390×844 | Accesibilidad | Medium | CONFIRMED | Foco inicial en “Quitar uno”; cantidad/eliminar 24×24; cierre 16×16 con nombre “Close”. | Aumenta errores táctiles y confunde teclado/lector. | Enfocar título o cierre, usar nombre “Cerrar carrito” y targets de 44 px. | S | P1 |
| UIUX-015 | Carrito | Marquee ofertas | Móvil y desktop | Accesibilidad / contenido | Medium | CONFIRMED | “LAS MEJORES OFERTAS” aparece 16 veces en el árbol de lectura. | Ruido severo para lector de pantalla. | Marcar copias animadas `aria-hidden=true` y mantener una sola frase accesible. | S | P1 |
| UIUX-016 | Admin público | Redirección a login | 390×844 y 1440×900 | Rendimiento percibido | Medium | CONFIRMED | `/admin/login` muestra shell+skeleton y redirige a `/admin-auth/login` en ~3268 ms. | Expone navegación que no podrá usarse y hace parecer que el panel cargará. | Resolver autenticación antes de renderizar el shell o usar un loader neutral corto. | M | P1 |
| UIUX-017 | Admin login/registro | Semántica y controles | 320–1920 px | Accesibilidad | Medium | CONFIRMED | Sin headings ni `main`; autocomplete vacío; inputs/CTA de 36 px. | Reduce estructura semántica, autocompletado y precisión táctil. | Usar `h1`, `main`, `autocomplete=email/current-password/new-password/name` y altura ≥44 px. | S | P1 |
| UIUX-018 | Storefront local | Arranque normal | Todos | Operación | High | REQUIRES TEST | Con configuración actual: HTTP 500 por TLS Prisma; variante temporal permitió HTTP 200. | Un entorno con la misma pila TLS no puede mostrar ninguna pantalla comercial. | Validar `DATABASE_URL`, `sslmode` y `channel_binding` en CI/staging Windows/Linux sin debilitar TLS en producción. | M | P0 |
| UIUX-019 | Carrito | Verificación de stock | 390×844 | Rendimiento percibido | Medium | CONFIRMED | CTA cambia de “Verificando stock...” a “Proceder al Pago” tras varios segundos. | El usuario no conoce duración ni alternativa si falla. | Añadir skeleton/estado con timeout, error y reintento; conservar el total visible. | M | P1 |
| UIUX-020 | Panel autenticado | Módulos administrativos | Todos | Cobertura | Informational | NOT VERIFIED | No hubo sesión administrativa autorizada. | No se puede dictaminar eficiencia operativa ni responsive interno. | Ejecutar ronda específica con cuenta de solo lectura y dataset de prueba. | M | P0 antes de lanzamiento |

## 18. Matriz responsive

| Pantalla | Móvil | Tablet | Desktop | Overflow | Legibilidad | Interacción | Navegación | Estado |
|---|---|---|---|---|---|---|---|---|
| Home | Se adapta, pero es muy extensa y el banner cubre contenido | 4 px en 768/1024 | 4 px en 1280; estable desde 1366 | Sí, puntual | Baja por contenido de plantilla | CTA visible | Header funcional | **No preparado** |
| Catálogo | Dos columnas demasiado densas | Correcto | Correcto | No | Baja en 320–375 | CTAs recortados y pequeños | Filtros visibles | **No preparado móvil** |
| Producto | Galería domina el primer viewport | CTA visible; 4 px overflow en 768/1024 | Estable salvo 1280 | Sí, puntual | Buena en datos esenciales | CTA fuera del primer viewport móvil | Breadcrumb visible | **Requiere corrección** |
| Drawer carrito | Ocupa viewport completo | No probado visualmente | No probado visualmente | No en móvil | Buena | Targets de 24 px | Cierre disponible | **Casi preparado** |
| Carrito | Tarjeta y resumen legibles | No verificado | No verificado | No en móvil | Buena | CTA aparece tras stock | Seguir comprando visible | **Requiere feedback** |
| Checkout | Formulario legible y CTA sticky | No verificado | No verificado | No observado | Buena visual, baja semántica | Ubicación/envíos funcionan | Progreso visible | **Requiere corrección alta** |
| Login cliente | Carga indefinida | No verificado | No verificado | No | Texto legible | Sin recuperación | Bloqueado | **No preparado** |
| Registro cliente | Sin formulario | No verificado | No verificado | No | Carcasa legible | Imposible registrar | Solo retorno | **No preparado** |
| Admin login | Correcto; scroll en landscape | Correcto | Correcto | No | Buena | Targets bajos | Simple | **Casi preparado** |
| Panel admin | No verificado | No verificado | No verificado | No verificado | No verificado | No verificado | No verificado | **NOT VERIFIED** |

## 19. Matriz de UX

| Flujo | Comprensible | Eficiente | Recuperable ante errores | Accesible | Consistente | Preparado para producción |
|---|---|---|---|---|---|---|
| Descubrir oferta en home | No | No | N/A | Parcial | No | No |
| Explorar catálogo | Parcial | Parcial | No verificado | Parcial | Parcial | No en móvil |
| Evaluar producto | Sí en datos básicos | Parcial | No verificado | Parcial | No por claims | No |
| Agregar al carrito | Sí | Sí | No verificado | Parcial | Sí | Casi |
| Revisar carrito | Sí | Parcial | Parcial | Parcial | Sí | Casi |
| Checkout invitado | Sí | Parcial | No verificado | No | Parcial | No |
| Login cliente | No | No | No | No | No | No |
| Registro cliente | No | No | No | No | No | No |
| Operación administrativa | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | No dictaminable |

## 20. Roadmap recomendado

### Fase 0: errores que bloquean tareas

1. Corregir login y registro de clientes con timeout y recuperación.
2. Evitar la selección automática de AMAZONAS.
3. Resolver el arranque TLS en staging/producción y añadir una prueba smoke de
   `/`, `/productos`, `/carrito` y `/checkout`.
4. Sustituir el logo roto.
5. Retirar todo contenido y claim de plantilla no aprobado.

**Criterio de salida:** rutas críticas 200, autenticación operable, ubicación
vacía por defecto y cero placeholders públicos.

### Fase 1: problemas responsive

1. Cambiar catálogo móvil a una columna en anchos donde el CTA se recorta.
2. Elevar CTAs y controles táctiles a 44 px.
3. Eliminar los 4 px de overflow en 768/1024/1280.
4. Añadir sticky add-to-cart móvil.
5. Probar landscape y teclado móvil abierto.

**Criterio de salida:** cero overflow, cero texto de CTA recortado y acción de
compra visible/accesible en todos los viewports requeridos.

### Fase 2: flujos de compra

1. Mejorar feedback de verificación de stock.
2. Asociar labels de checkout y revisar valores iniciales.
3. Verificar cupones, errores, doble clic, recuperación y los dos pagos.
4. Probar confirmación y detalle de orden con pasarelas sandbox.
5. Alinear promesas de envío entre header, producto y checkout.

### Fase 3: panel administrativo

Ejecutar auditoría autenticada con cuenta de solo lectura y ambiente de prueba:
dashboard, productos/variantes, inventario, pedidos, clientes, pagos, envíos,
devoluciones, cupones, usuarios, roles, reportes y builders. Medir clics por
tarea y responsive en 768, 1024 y 1280.

### Fase 4: accesibilidad

1. Corregir labels, headings, landmarks, nombres y foco de dialogs.
2. Revisar targets táctiles y contenido duplicado del marquee.
3. Probar teclado completo, lector de pantalla, contraste y zoom 200%.
4. Añadir pruebas automáticas como apoyo, nunca como única validación.

### Fase 5: conversión

1. Publicar una propuesta de valor específica.
2. Reducir contenido ajeno a la intención de compra.
3. Unificar evidencia de confianza, envío, devoluciones y medios de pago.
4. Medir funnel home → producto → carrito → checkout → pago.

### Fase 6: pulido visual

Unificar tokens de color, CTA, radios, sombras, tipografía, iconos y microcopy
entre storefront, checkout y admin. Corregir ortografía, traducciones y footer.

## 21. Dictamen final

**UX/UI no apta para producción.**

La arquitectura visual y los flujos base muestran una beta avanzada, no un
producto comercial terminado. Para un MVP interno podría usarse únicamente con
usuarios controlados, sin claims públicos y con compra/pago en sandbox. Antes
de vender a público deben cerrarse como mínimo las fases 0, 1 y 2, y debe
completarse la auditoría del panel administrativo.

## Evidencia de integridad del repositorio

Al iniciar, `git status --short` mostraba:

```text
 M auditoriados.md
?? auditoriauiux.md
```

`auditoriados.md` era un cambio preexistente y no fue editado por esta
auditoría. Se crearon dos logs temporales al levantar el servidor, se detuvieron
los servidores de prueba y dichos logs se retiraron. No se modificaron código,
estilos, dependencias, `.env`, migraciones, datos ni configuración. La única
escritura deliberada y conservada es este informe solicitado.
