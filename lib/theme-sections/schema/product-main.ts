import {
  Package,
  Images,
  Heading1,
  Tag,
  ListChecks,
  ShoppingCart,
  AlignLeft,
  Info,
  Type,
  ShieldCheck,
  CreditCard,
  ChevronDown,
} from "lucide-react"
import type {
  ThemeSectionDefinition,
  ThemeSectionBlockDefinition,
} from "../types"

const productGalleryDefinition: ThemeSectionBlockDefinition = {
  type: "PRODUCT_GALLERY",
  label: "Galería",
  icon: Images,
  maxPerSection: 1,
  fields: [
    {
      type: "select",
      key: "layout",
      label: "Diseño (escritorio)",
      helpText:
        "En móvil siempre se usa el carrusel; este ajuste solo aplica a pantallas medianas o más grandes.",
      options: [
        { value: "carousel", label: "Carrusel" },
        { value: "two_column", label: "Dos columnas" },
        { value: "stacked", label: "Apilado" },
        { value: "grid", label: "Cuadrícula" },
      ],
    },
    { type: "switch", key: "showThumbnails", label: "Mostrar miniaturas" },
    {
      type: "switch",
      key: "autoplay",
      label: "Reproducción automática",
      helpText: "Aplica al carrusel (móvil siempre, y escritorio si elegís Carrusel).",
    },
    {
      type: "select",
      key: "aspectRatio",
      label: "Relación de aspecto",
      options: [
        { value: "square", label: "Cuadrada" },
        { value: "portrait", label: "Vertical" },
        { value: "landscape", label: "Horizontal" },
      ],
    },
  ],
  defaultContent: {
    layout: "two_column",
    showThumbnails: true,
    autoplay: false,
    aspectRatio: "square",
  },
}

const productTitleDefinition: ThemeSectionBlockDefinition = {
  type: "PRODUCT_TITLE",
  label: "Título",
  icon: Heading1,
  maxPerSection: 1,
  fields: [
    { type: "switch", key: "showCategoryBadges", label: "Mostrar categorías" },
    {
      type: "switch",
      key: "showShortDescription",
      label: "Mostrar descripción corta",
    },
    {
      type: "select",
      key: "headingTag",
      label: "Etiqueta del encabezado",
      helpText: "h1 es recomendado para SEO; sólo un h1 por página.",
      options: [
        { value: "h1", label: "h1" },
        { value: "h2", label: "h2" },
      ],
    },
  ],
  defaultContent: {
    showCategoryBadges: true,
    showShortDescription: true,
    headingTag: "h1",
  },
}

const productPriceDefinition: ThemeSectionBlockDefinition = {
  type: "PRODUCT_PRICE",
  label: "Precio",
  icon: Tag,
  maxPerSection: 1,
  fields: [
    {
      type: "switch",
      key: "showCompareAt",
      label: "Mostrar precio tachado",
      helpText:
        "Si el producto tiene precio de comparación, se muestra tachado al lado del precio actual.",
    },
    {
      type: "switch",
      key: "showSavingsBadge",
      label: "Mostrar etiqueta de ahorro",
      helpText: "Calcula el descuento porcentual y lo muestra como badge.",
    },
    {
      type: "select",
      key: "currencyPosition",
      label: "Posición del símbolo",
      options: [
        { value: "before", label: "Antes (S/ 100)" },
        { value: "after", label: "Después (100 S/)" },
      ],
    },
  ],
  defaultContent: {
    showCompareAt: true,
    showSavingsBadge: true,
    currencyPosition: "before",
  },
}

const productVariantPickerDefinition: ThemeSectionBlockDefinition = {
  type: "PRODUCT_VARIANT_PICKER",
  label: "Selector de variantes",
  icon: ListChecks,
  maxPerSection: 1,
  fields: [
    {
      type: "select",
      key: "swatchSize",
      label: "Tamaño de muestras",
      options: [
        { value: "sm", label: "Pequeño" },
        { value: "md", label: "Mediano" },
        { value: "lg", label: "Grande" },
      ],
    },
    { type: "switch", key: "showLabels", label: "Mostrar etiquetas" },
    {
      type: "select",
      key: "outOfStockBehavior",
      label: "Variantes sin stock",
      options: [
        { value: "disable", label: "Deshabilitar" },
        { value: "hide", label: "Ocultar" },
        { value: "badge", label: "Mostrar badge 'Agotado'" },
      ],
    },
  ],
  defaultContent: {
    swatchSize: "md",
    showLabels: true,
    outOfStockBehavior: "disable",
  },
}

const productBuyButtonDefinition: ThemeSectionBlockDefinition = {
  type: "PRODUCT_BUY_BUTTON",
  label: "Botón de compra",
  icon: ShoppingCart,
  maxPerSection: 1,
  fields: [
    {
      type: "text",
      key: "buttonText",
      label: "Texto del botón",
      placeholder: "Agregar al carrito",
    },
    {
      type: "switch",
      key: "showQuantityPicker",
      label: "Mostrar selector de cantidad",
    },
    {
      type: "number",
      key: "quantityMin",
      label: "Cantidad mínima",
      min: 1,
      showWhen: { field: "showQuantityPicker", equals: true },
    },
    {
      type: "number",
      key: "quantityMax",
      label: "Cantidad máxima",
      min: 1,
      showWhen: { field: "showQuantityPicker", equals: true },
    },
    // Plan 17 — Per-button colors. The shadcn Button used to render with
    // `bg-primary text-primary-foreground` baked in, which override any
    // color the admin set on the wrapper. These fields opt the renderer
    // into reading admin-chosen colors and apply them as inline styles on
    // the <button> itself. `showInStyleTab: true` moves them to the Estilo
    // tab so they sit next to the section's bg/text controls.
    {
      type: "color",
      key: "buttonBgColor",
      label: "Color de fondo del botón",
      showInStyleTab: true,
    },
    {
      type: "color",
      key: "buttonTextColor",
      label: "Color del texto del botón",
      showInStyleTab: true,
    },
  ],
  defaultContent: {
    buttonText: "Agregar al carrito",
    showQuantityPicker: true,
    quantityMin: 1,
    quantityMax: 99,
    buttonBgColor: "",
    buttonTextColor: "",
  },
}

const productDescriptionDefinition: ThemeSectionBlockDefinition = {
  type: "PRODUCT_DESCRIPTION",
  label: "Descripción",
  icon: AlignLeft,
  maxPerSection: 1,
  fields: [
    {
      type: "text",
      key: "heading",
      label: "Título de la sección",
      placeholder: "Descripción",
    },
    {
      type: "switch",
      key: "collapsible",
      label: "Permitir expandir/colapsar",
    },
    {
      type: "switch",
      key: "defaultExpanded",
      label: "Iniciar expandido",
      showWhen: { field: "collapsible", equals: true },
    },
  ],
  defaultContent: {
    heading: "Descripción",
    collapsible: false,
    defaultExpanded: true,
  },
}

const productMetaDefinition: ThemeSectionBlockDefinition = {
  type: "PRODUCT_META",
  label: "Información del producto",
  icon: Info,
  maxPerSection: 1,
  fields: [
    {
      type: "text",
      key: "heading",
      label: "Título de la caja",
      placeholder: "Información del producto",
    },
    { type: "switch", key: "showSku", label: "Mostrar SKU" },
    { type: "switch", key: "showWeight", label: "Mostrar peso" },
    { type: "switch", key: "showAvailability", label: "Mostrar disponibilidad" },
    { type: "switch", key: "showBrand", label: "Mostrar marca" },
    { type: "switch", key: "showCategories", label: "Mostrar categorías" },
  ],
  defaultContent: {
    heading: "Información del producto",
    showSku: true,
    showWeight: true,
    showAvailability: true,
    showBrand: false,
    showCategories: false,
  },
}

const productRichTextSubBlockDefinition: ThemeSectionBlockDefinition = {
  type: "PRODUCT_RICH_TEXT",
  label: "Texto enriquecido",
  icon: Type,
  maxPerSection: 5,
  fields: [
    { type: "richtext", key: "body", label: "Contenido" },
  ],
  defaultContent: { body: "" },
}

const productTrustBadgesDefinition: ThemeSectionBlockDefinition = {
  type: "PRODUCT_TRUST_BADGES",
  label: "Sellos de confianza",
  icon: ShieldCheck,
  maxPerSection: 2,
  fields: [
    {
      type: "select",
      key: "layout",
      label: "Diseño",
      options: [
        { value: "horizontal", label: "Horizontal" },
        { value: "vertical", label: "Vertical" },
        { value: "grid", label: "Cuadrícula 2 columnas" },
      ],
    },
    {
      type: "array",
      key: "items",
      label: "Sellos",
      addButtonText: "+ Agregar sello",
      itemLabel: (item, i) => {
        const label = typeof item.label === "string" ? item.label.trim() : ""
        return label || `Sello ${i + 1}`
      },
      newItem: () => ({
        icon: "truck",
        label: "Envío gratis",
        helpText: "",
      }),
      itemSchema: [
        {
          type: "select",
          key: "icon",
          label: "Icono",
          options: [
            { value: "truck", label: "Camión (envío)" },
            { value: "shield-check", label: "Escudo (garantía)" },
            { value: "rotate-ccw", label: "Devolución" },
            { value: "credit-card", label: "Tarjeta (pagos)" },
            { value: "award", label: "Medalla (calidad)" },
            { value: "clock", label: "Reloj (rapidez)" },
            { value: "headphones", label: "Auriculares (soporte)" },
            { value: "lock", label: "Candado (seguridad)" },
            { value: "package", label: "Paquete" },
            { value: "leaf", label: "Hoja (sustentable)" },
          ],
        },
        { type: "text", key: "label", label: "Texto principal" },
        {
          type: "text",
          key: "helpText",
          label: "Texto secundario (opcional)",
          placeholder: "",
        },
      ],
    },
  ],
  defaultContent: {
    layout: "horizontal",
    items: [
      { icon: "truck", label: "Envío gratis", helpText: "En compras desde S/ 150" },
      { icon: "shield-check", label: "Compra protegida", helpText: "Garantía del fabricante" },
      { icon: "rotate-ccw", label: "Devolución fácil", helpText: "30 días para cambios" },
    ],
  },
}

const productPaymentIconsDefinition: ThemeSectionBlockDefinition = {
  type: "PRODUCT_PAYMENT_ICONS",
  label: "Métodos de pago",
  icon: CreditCard,
  maxPerSection: 1,
  fields: [
    {
      type: "text",
      key: "heading",
      label: "Texto previo (opcional)",
      placeholder: "Aceptamos",
    },
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
    {
      type: "select",
      key: "align",
      label: "Alineación",
      options: [
        { value: "start", label: "Izquierda" },
        { value: "center", label: "Centro" },
        { value: "end", label: "Derecha" },
      ],
    },
  ],
  defaultContent: {
    heading: "Aceptamos",
    methods: ["VISA", "MASTERCARD", "YAPE", "PLIN"],
    align: "start",
  },
}

const productCollapseRowDefinition: ThemeSectionBlockDefinition = {
  type: "PRODUCT_COLLAPSE_ROW",
  label: "Fila colapsable",
  icon: ChevronDown,
  maxPerSection: 8,
  fields: [
    {
      type: "select",
      key: "icon",
      label: "Icono (opcional)",
      options: [
        // Radix `SelectItem` doesn't allow `value=""` — it reserves the
        // empty string for "no selection / show placeholder" and throws if
        // any item uses it. Use a sentinel string instead; the storefront
        // renderer falls back to "no icon" because `"none"` isn't in
        // `ICON_MAP`. Legacy rows with `icon: ""` still render correctly
        // (Select shows the placeholder, ProductCollapseRow draws no icon).
        { value: "none", label: "Sin icono" },
        { value: "info", label: "Info" },
        { value: "truck", label: "Camión (envío)" },
        { value: "shield-check", label: "Escudo (garantía)" },
        { value: "rotate-ccw", label: "Devolución" },
        { value: "ruler", label: "Regla (medidas)" },
        { value: "package", label: "Paquete" },
        { value: "leaf", label: "Materiales" },
      ],
    },
    {
      type: "text",
      key: "title",
      label: "Título",
      placeholder: "Envío y devoluciones",
    },
    { type: "richtext", key: "body", label: "Contenido" },
    {
      type: "switch",
      key: "defaultOpen",
      label: "Iniciar abierta",
    },
  ],
  defaultContent: {
    icon: "info",
    title: "Más información",
    body: "",
    defaultOpen: false,
  },
}

export const productMainDefinition: ThemeSectionDefinition = {
  type: "PRODUCT_MAIN",
  groups: ["PRODUCT"],
  label: "Información principal del producto",
  description:
    "Sección obligatoria que agrupa la galería y la información del producto. Acá controlás el layout general (posición de la galería, anchos de columna, etc.). Para editar textos, precios o el botón de compra seleccioná uno de los sub-bloques listados abajo.",
  icon: Package,
  maxPerGroup: 1,
  acceptedBlockTypes: [
    productGalleryDefinition,
    productTitleDefinition,
    productPriceDefinition,
    productVariantPickerDefinition,
    productBuyButtonDefinition,
    productDescriptionDefinition,
    productMetaDefinition,
    productTrustBadgesDefinition,
    productPaymentIconsDefinition,
    productCollapseRowDefinition,
    productRichTextSubBlockDefinition,
  ],
  fields: [
    {
      type: "select",
      key: "galleryPosition",
      label: "Posición de la galería (escritorio)",
      helpText: "En móvil siempre va arriba.",
      options: [
        { value: "left", label: "Izquierda" },
        { value: "right", label: "Derecha" },
      ],
    },
    {
      type: "select",
      key: "columnRatio",
      label: "Proporción de columnas",
      helpText:
        "Ancho de la galería frente a la columna de información en escritorio.",
      options: [
        { value: "50_50", label: "50 / 50" },
        { value: "60_40", label: "60 / 40 (galería más ancha)" },
        { value: "40_60", label: "40 / 60 (información más ancha)" },
      ],
    },
    {
      type: "switch",
      key: "infoSticky",
      label: "Información fija al hacer scroll",
      helpText:
        "En escritorio, la columna de información se mantiene visible mientras el usuario scrollea la galería.",
    },
    {
      type: "switch",
      key: "fullWidth",
      label: "Ancho completo",
      helpText:
        "Quita el contenedor con margen y ocupa todo el ancho de la pantalla.",
    },
  ],
  defaultContent: {
    galleryPosition: "left",
    columnRatio: "50_50",
    infoSticky: false,
    fullWidth: false,
  },
  defaultBlocks: [
    { type: "PRODUCT_GALLERY", content: productGalleryDefinition.defaultContent },
    { type: "PRODUCT_TITLE", content: productTitleDefinition.defaultContent },
    { type: "PRODUCT_PRICE", content: productPriceDefinition.defaultContent },
    {
      type: "PRODUCT_VARIANT_PICKER",
      content: productVariantPickerDefinition.defaultContent,
    },
    {
      type: "PRODUCT_BUY_BUTTON",
      content: productBuyButtonDefinition.defaultContent,
    },
    {
      type: "PRODUCT_META",
      content: productMetaDefinition.defaultContent,
    },
    {
      type: "PRODUCT_DESCRIPTION",
      content: productDescriptionDefinition.defaultContent,
    },
  ],
  // Border / shadow / corner radius don't apply to a wrapper that hosts
  // the main product info — those belong to inner sub-blocks if anywhere.
  styleSupport: {
    border: false,
    shadow: false,
    cornerRadius: false,
  },
}
