import {
  Copyright,
  CreditCard,
  FileText,
  Footprints,
  Image as ImageIcon,
  List,
  Mail,
  Share2,
  Type,
} from "lucide-react"
import type {
  ThemeSectionBlockDefinition,
  ThemeSectionDefinition,
} from "../types"

/**
 * Phase 3 of the Shopify-style footer refactor — unified FOOTER section.
 *
 * In the previous model the footer was a list of peer sections
 * (FOOTER_COLUMNS, FOOTER_NEWSLETTER, FOOTER_SOCIAL, FOOTER_RICH_TEXT,
 * FOOTER_PAYMENT_ICONS, FOOTER_COPYRIGHT). That diverged from Shopify,
 * where the entire footer is ONE section and each thing inside is a
 * BLOCK ("Link column", "Newsletter", "Social icons", "Image", "Text").
 *
 * This file consolidates all seven prior types into a single parent
 * section with sub-blocks, matching the Shopify customizer UX:
 *   - The "Pie de página" zone shows one collapsible "Footer" entry.
 *   - "Add block" lists the block types below.
 *   - The parent section owns the layout grid + global wrapper styles
 *     (color scheme, padding, border-top — those live on Theme.tokens.footer).
 *
 * Existing data is rewritten by `scripts/migrate-footer-sections.ts`.
 */

const linkColumnBlock: ThemeSectionBlockDefinition = {
  type: "LINK_COLUMN",
  label: "Columna de enlaces",
  icon: List,
  maxPerSection: 6,
  fields: [
    { type: "text", key: "title", label: "Título de la columna" },
    {
      type: "menu-picker",
      key: "menuId",
      label: "Menú a mostrar",
      helpText:
        "Los ítems del menú aparecen como enlaces de la columna. Creá o editá menús en /admin/menus.",
    },
  ],
  defaultContent: { title: "Tienda", menuId: null },
}

const textColumnBlock: ThemeSectionBlockDefinition = {
  type: "TEXT_COLUMN",
  label: "Columna de texto",
  icon: Type,
  maxPerSection: 4,
  fields: [
    { type: "text", key: "title", label: "Título" },
    { type: "richtext", key: "body", label: "Texto" },
  ],
  defaultContent: { title: "Sobre nosotros", body: "" },
}

const newsletterBlock: ThemeSectionBlockDefinition = {
  type: "NEWSLETTER",
  label: "Newsletter",
  icon: Mail,
  maxPerSection: 1,
  fields: [
    { type: "text", key: "title", label: "Título" },
    { type: "richtext", key: "description", label: "Descripción" },
    { type: "text", key: "buttonLabel", label: "Etiqueta del botón" },
    { type: "text", key: "successMessage", label: "Mensaje de éxito" },
  ],
  defaultContent: {
    title: "Suscribite a nuestro newsletter",
    description: "Enterate de novedades y promociones.",
    buttonLabel: "Suscribirme",
    successMessage: "¡Gracias por suscribirte!",
  },
}

const socialBlock: ThemeSectionBlockDefinition = {
  type: "SOCIAL",
  label: "Redes sociales",
  icon: Share2,
  maxPerSection: 1,
  fields: [{ type: "text", key: "title", label: "Título" }],
  defaultContent: { title: "Síguenos" },
}

const richTextBlock: ThemeSectionBlockDefinition = {
  type: "RICH_TEXT_BLOCK",
  label: "Texto enriquecido",
  icon: FileText,
  fields: [
    { type: "text", key: "title", label: "Título" },
    { type: "richtext", key: "body", label: "Contenido" },
  ],
  defaultContent: { title: "", body: "" },
}

const paymentIconsBlock: ThemeSectionBlockDefinition = {
  type: "PAYMENT_ICONS",
  label: "Métodos de pago",
  icon: CreditCard,
  maxPerSection: 1,
  fields: [
    {
      type: "multi-select",
      key: "methods",
      label: "Métodos a mostrar",
      options: [
        { value: "VISA", label: "Visa" },
        { value: "MASTERCARD", label: "Mastercard" },
        { value: "AMEX", label: "American Express" },
        { value: "YAPE", label: "Yape" },
        { value: "PLIN", label: "Plin" },
        { value: "PAYPAL", label: "PayPal" },
      ],
    },
  ],
  defaultContent: { methods: ["VISA", "MASTERCARD", "YAPE", "PLIN"] },
}

/**
 * Generic image block — meant primarily for a brand logo, but also
 * works for badges, brand seals, or any decorative footer image.
 * The admin-configurable `width` is enforced at render time as a CSS
 * `max-width`; the image preserves its native aspect ratio.
 */
const imageBlock: ThemeSectionBlockDefinition = {
  type: "IMAGE",
  label: "Imagen / Logo",
  icon: ImageIcon,
  maxPerSection: 4,
  fields: [
    {
      type: "image",
      key: "image",
      label: "Imagen",
      deviceOverride: false,
    },
    {
      type: "number",
      key: "width",
      label: "Ancho (px)",
      min: 40,
      max: 600,
      helpText: "Ancho máximo de la imagen en píxeles. El alto se ajusta proporcionalmente.",
    },
    {
      type: "text",
      key: "alt",
      label: "Texto alternativo",
      placeholder: "Logo de la tienda",
      helpText: "Importante para accesibilidad y SEO.",
    },
    {
      type: "text",
      key: "href",
      label: "Enlace (opcional)",
      placeholder: "/",
      helpText: "Si se completa, la imagen se vuelve clickeable.",
    },
    {
      type: "select",
      key: "alignment",
      label: "Alineación",
      options: [
        { value: "left", label: "Izquierda" },
        { value: "center", label: "Centro" },
        { value: "right", label: "Derecha" },
      ],
    },
  ],
  defaultContent: {
    image: "",
    width: 150,
    alt: "",
    href: "",
    alignment: "left",
  },
}

const copyrightBlock: ThemeSectionBlockDefinition = {
  type: "COPYRIGHT",
  label: "Copyright",
  icon: Copyright,
  maxPerSection: 1,
  fields: [
    {
      type: "text",
      key: "text",
      label: "Texto",
      helpText:
        "Usá {{year}} para el año actual y {{siteName}} para el nombre de la tienda.",
    },
  ],
  defaultContent: {
    text: "© {{year}} {{siteName}}. Todos los derechos reservados.",
  },
}

export const footerDefinition: ThemeSectionDefinition = {
  type: "FOOTER",
  groups: ["FOOTER"],
  label: "Footer",
  description: "Pie de página unificado con bloques de columnas, newsletter, redes y más.",
  icon: Footprints,
  // Singleton — only one FOOTER section per theme, matching Shopify.
  maxPerGroup: 1,
  acceptedBlockTypes: [
    linkColumnBlock,
    textColumnBlock,
    newsletterBlock,
    imageBlock,
    socialBlock,
    richTextBlock,
    paymentIconsBlock,
    copyrightBlock,
  ],
  fields: [
    {
      type: "select",
      key: "layout",
      label: "Disposición de columnas",
      options: [
        { value: "auto", label: "Auto (responsive)" },
        { value: "2", label: "2 columnas" },
        { value: "3", label: "3 columnas" },
        { value: "4", label: "4 columnas" },
        { value: "5", label: "5 columnas" },
      ],
      helpText:
        "Distribución de los bloques tipo Columna y Newsletter. Las redes, métodos de pago y copyright se ubican debajo, a lo ancho.",
    },
  ],
  defaultContent: { layout: "auto" },
  defaultBlocks: [
    { type: "LINK_COLUMN", content: { title: "Tienda", menuId: null } },
    {
      type: "COPYRIGHT",
      content: {
        text: "© {{year}} {{siteName}}. Todos los derechos reservados.",
      },
    },
  ],
}
