// Seeds the 4 core policies (Términos, Privacidad, Envíos, Devoluciones)
// with reasonable default text for a Peru e-commerce. Admins should review
// and adapt the content from /admin/politicas.
//
// Idempotent — skips slugs that already exist.
//
// Run after seed-themes.ts (and after setup-policies-permissions.ts):
//   npx tsx scripts/seed-policies.ts
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface SeedPolicy {
  slug: string
  title: string
  policyType: "TERMS" | "PRIVACY" | "SHIPPING" | "REFUND"
  body: string
}

const POLICIES: SeedPolicy[] = [
  {
    slug: "terminos",
    title: "Términos y condiciones",
    policyType: "TERMS",
    body: `
<h2>Aceptación de los términos</h2>
<p>Al usar nuestro sitio web, aceptás los términos y condiciones aquí descritos. Si no estás de acuerdo, te pedimos que no utilices nuestros servicios.</p>

<h2>Pedidos y compras</h2>
<p>Todos los pedidos están sujetos a disponibilidad y a la aceptación de los términos. Nos reservamos el derecho de rechazar o cancelar un pedido en cualquier momento por razones que incluyen, sin limitarse, a la disponibilidad de stock, errores en la información del producto o problemas detectados con la transacción.</p>

<h2>Precios y métodos de pago</h2>
<p>Los precios están expresados en soles peruanos (PEN) e incluyen IGV cuando corresponde. Aceptamos los siguientes métodos de pago: tarjetas de crédito y débito, Yape, Plin, PayPal y transferencias bancarias.</p>

<h2>Envíos</h2>
<p>Los envíos se realizan a todo el Perú a través de nuestros couriers asociados. Para más detalles consultá nuestra <a href="/politicas/envios">política de envíos</a>.</p>

<h2>Devoluciones</h2>
<p>Aceptamos devoluciones bajo las condiciones descritas en nuestra <a href="/politicas/devoluciones">política de devoluciones</a>.</p>

<h2>Propiedad intelectual</h2>
<p>Todo el contenido de este sitio web (textos, imágenes, logos) es propiedad de la tienda o de sus respectivos titulares y está protegido por las leyes de propiedad intelectual aplicables.</p>

<h2>Modificaciones</h2>
<p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor desde su publicación en el sitio.</p>

<h2>Contacto</h2>
<p>Si tenés alguna duda sobre estos términos, podés escribirnos desde nuestra <a href="/contacto">página de contacto</a>.</p>
`.trim(),
  },
  {
    slug: "privacidad",
    title: "Política de privacidad",
    policyType: "PRIVACY",
    body: `
<h2>Información que recopilamos</h2>
<p>Recopilamos la información que nos brindás voluntariamente al crear una cuenta, realizar un pedido o suscribirte al newsletter, incluyendo tu nombre, correo electrónico, dirección de envío y teléfono.</p>

<h2>Uso de la información</h2>
<p>Utilizamos tus datos para procesar pedidos, gestionar envíos, brindar atención al cliente y enviarte comunicaciones relacionadas con tu cuenta o promociones (solo si te suscribiste).</p>

<h2>Compartir información con terceros</h2>
<p>No vendemos ni compartimos tu información personal con terceros, salvo cuando es necesario para operar el servicio (couriers, procesadores de pago) o cuando lo exige la ley.</p>

<h2>Seguridad</h2>
<p>Utilizamos conexiones seguras (SSL) y procesadores de pago certificados. La información de tarjetas no se almacena en nuestros servidores.</p>

<h2>Cookies</h2>
<p>Usamos cookies para mejorar tu experiencia, recordar tus preferencias y medir el uso del sitio. Podés configurar tu navegador para rechazar cookies, pero algunas funcionalidades podrían dejar de funcionar.</p>

<h2>Tus derechos</h2>
<p>Tenés derecho a acceder, corregir o eliminar tu información personal en cualquier momento. Para ejercer estos derechos, escribinos desde nuestra <a href="/contacto">página de contacto</a>.</p>

<h2>Cambios en esta política</h2>
<p>Podemos actualizar esta política ocasionalmente. La versión vigente siempre estará disponible en esta página.</p>
`.trim(),
  },
  {
    slug: "envios",
    title: "Política de envíos",
    policyType: "SHIPPING",
    body: `
<h2>Cobertura de envíos</h2>
<p>Realizamos envíos a todas las regiones del Perú. Trabajamos con couriers reconocidos como Olva Courier, Shalom y otros operadores logísticos confiables.</p>

<h2>Tiempos de entrega</h2>
<ul>
  <li><strong>Lima Metropolitana:</strong> 2 a 3 días hábiles.</li>
  <li><strong>Provincia (capitales):</strong> 3 a 5 días hábiles.</li>
  <li><strong>Provincia (zonas alejadas):</strong> 5 a 10 días hábiles.</li>
</ul>
<p>Los tiempos son estimados y pueden variar por feriados, condiciones climáticas o eventos fuera de nuestro control.</p>

<h2>Costo del envío</h2>
<p>El costo se calcula automáticamente en el checkout según el destino, peso y tamaño del paquete. Ofrecemos envío gratis en pedidos que superan ciertos montos (consultá las promociones vigentes).</p>

<h2>Seguimiento del pedido</h2>
<p>Una vez despachado, recibirás por correo el número de seguimiento. También podés revisar el estado desde tu cuenta o desde el enlace de seguimiento del pedido.</p>

<h2>Pedido no entregado</h2>
<p>Si por algún motivo el pedido no pudo ser entregado (dirección incorrecta, ausencia, etc.), nos comunicaremos contigo para reagendar el envío. Después de tres intentos sin éxito, el pedido se devolverá a nuestro almacén y podrá generar costos adicionales.</p>
`.trim(),
  },
  {
    slug: "devoluciones",
    title: "Política de devoluciones",
    policyType: "REFUND",
    body: `
<h2>Plazo para devoluciones</h2>
<p>Aceptamos devoluciones dentro de los <strong>30 días</strong> posteriores a la recepción del producto, siempre que se encuentre en su estado original, sin uso y con el empaque intacto.</p>

<h2>Productos no devolubles</h2>
<p>Por razones de higiene y seguridad, no aceptamos devoluciones de productos personalizados, perecibles, de cuidado personal abiertos o liquidaciones marcadas como "venta final".</p>

<h2>Cómo iniciar una devolución</h2>
<ol>
  <li>Escribinos desde nuestra <a href="/contacto">página de contacto</a> con el número de pedido y el motivo de la devolución.</li>
  <li>Esperá nuestra confirmación con las instrucciones de envío.</li>
  <li>Despachá el producto a la dirección que te indiquemos.</li>
  <li>Una vez recibido y verificado, procesaremos el reembolso o cambio.</li>
</ol>

<h2>Reembolsos</h2>
<p>El reembolso se realiza por el mismo medio de pago utilizado en la compra. El tiempo de acreditación depende de tu banco y puede tomar entre 5 y 10 días hábiles.</p>

<h2>Productos defectuosos</h2>
<p>Si recibís un producto defectuoso o diferente al pedido, contactanos dentro de las 48 horas posteriores a la recepción y nos haremos cargo del cambio o reembolso completo, incluyendo el costo de envío.</p>

<h2>Cambios</h2>
<p>Si preferís cambiar el producto por otro (talla, color, modelo), seguí el mismo proceso de devolución y aclará en el mensaje qué producto deseás recibir a cambio.</p>
`.trim(),
  },
]

async function main() {
  console.log("Sembrando políticas iniciales...")

  for (const p of POLICIES) {
    const exists = await prisma.policy.findUnique({
      where: { slug: p.slug },
      select: { id: true },
    })
    if (exists) {
      console.log(`  · "${p.slug}" ya existe. Skipped.`)
      continue
    }
    await prisma.policy.create({
      data: {
        slug: p.slug,
        title: p.title,
        body: p.body,
        policyType: p.policyType,
        active: true,
      },
    })
    console.log(`  ✓ Política "${p.slug}" creada (${p.policyType}).`)
  }

  console.log("Listo.")
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
