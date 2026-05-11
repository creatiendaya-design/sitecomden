# Guía: Activar personalización en un producto

Esta guía cubre el flujo end-to-end para activar la funcionalidad de "diseño personalizado por el cliente" en un producto (camisetas/polos para empezar, extensible a otros).

## Paso 1 — Crear una plantilla

1. Ir a **Admin → Plantillas personalizables → Nueva plantilla**.
2. **Nombre:** descriptivo (ej. "Polo blanco unisex Bella+Canvas 3001").
3. **Sobrecargo opcional:** ej. S/ 5.00 (déjalo vacío si la personalización no cuesta extra).
4. **Subir mockup frontal** y dibujar el rectángulo del área imprimible arrastrando los bordes.
5. **(Opcional) Subir mockup trasero** y dibujar bounds de la zona trasera.
6. **Seleccionar fuentes** que el cliente podrá usar (de las 60 Google Fonts pre-cargadas, agrupadas en 5 categorías). Default: las 60.
7. **Seleccionar paleta de colores** (de los ~120 swatches curados). Default: la paleta completa.
8. **Permitir color personalizado:** si está activo, el cliente puede elegir cualquier hex con un picker. Si está off, solo los swatches de tu paleta.
9. **Tabla de medidas (opcional):** define columnas (Pecho, Largo, etc.) y filas por talla. El cliente la verá vía "Guía de tallas" en el builder.
10. **Guardar.** Auto-save habilitado, no hay botón Save.

## Paso 2 — Asignar la plantilla a un producto

1. Ir a **Admin → Productos → [tu producto]**.
2. En la card **"Personalización"** (debajo de "Presentación"), elegir la plantilla del dropdown.
3. **(Opcional) Mockups por color:**
   - Si vendes el polo en varios colores (blanco, negro, azul, etc.), aquí subes una imagen específica de cada color por zona.
   - **Si dejas vacío**, el cliente verá el mockup default de la plantilla con un disclaimer *"Vista previa sobre mockup base · se imprimirá sobre la variante seleccionada"*.
   - Para activar la grilla, primero define el "Eje" (qué `ProductOption` cambia el mockup — típicamente "Color"). Luego sube cada combinación zona × color.
4. **Guardar el producto.**

## Paso 3 — Verificar en el storefront

Visita la página del producto (`/productos/[slug]`).

- El botón "Añadir al carrito" se reemplaza por **"Empieza a diseñar"** (rojo).
- Si la plantilla tiene sobrecargo, debajo del precio aparece la línea descomponiendo: `S/ 39.90 + S/ 5.00 personalización`.
- Click → `/productos/[slug]/personalizar` → el builder con sidebar Producto/Capas, canvas central, sidebar de propiedades (Texto/Color/Fuente/Transformar/Posición), bottom bar con precio total.

## Paso 4 — Cuando llega una orden

En **Admin → Órdenes → [orderId]**, cada item personalizado muestra una sección "Diseño personalizado" con:

- **Galería de PNGs por zona** (frontal, trasera). Click → lightbox full-resolution. Botón "Descargar PNG" con nombre semántico (`orden-{id}-item-{itemId}-{zona}.png`).
- **Detalles textuales del diseño:** lista de capas con texto, fuente, tamaño, color y alineación. Útil para verificar antes de imprimir o si el PNG sale borroso.
- **Plantilla usada:** link al admin de la plantilla por si necesitas chequear bounds o DPI.
- **Variante:** color y talla del producto.

## Notas operativas

- **Cambiar el sobrecargo** de la plantilla NO afecta órdenes ya creadas (los precios quedan congelados en `OrderItem.price`).
- **Desactivar la plantilla:** los productos que la usan dejan de mostrar el botón "Empieza a diseñar". Carritos pendientes pueden quedar inválidos al checkout (validación contra `templateSnapshot` rechaza si la plantilla del producto cambió).
- **Eliminar la plantilla:** bloqueado mientras haya productos usándola — desactiva primero o reasigna los productos a otra plantilla.
- **Re-edición desde carrito:** el cliente puede editar su diseño desde el cart antes de pagar. El item NO se duplica — se reemplaza in-place manteniendo cantidad.
- **PNGs huérfanos:** carritos abandonados dejan PNGs en Vercel Blob hasta que se implemente el cron de limpieza (Fase 2 del roadmap).

## Permisos RBAC

Los siguientes permisos están disponibles para asignar a roles:

- `customizables:view` — ver lista y detalle de plantillas
- `customizables:create` — crear plantillas
- `customizables:update` — editar plantillas
- `customizables:delete` — eliminar plantillas (sujeto a la restricción de productos en uso)

Por defecto se asignan al rol **admin** (vía `scripts/setup-customizables-permissions.ts`).

## Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| Mockup no aparece en builder | Imagen no carga (CORS o 404) | DevTools console → buscar `[MockupImage] failed to load`. Verifica que la URL en Vercel Blob esté accesible |
| Botón "Añadir al carrito" deshabilitado | Cliente no añadió ninguna capa de texto | Añadir al menos un texto en alguna zona |
| Toast "El diseño expiró" en cart | PNG de Vercel Blob fue purgado | Cliente debe re-personalizar (link en el badge) |
| Checkout rechaza con "plantilla cambió" | Dueño cambió la plantilla del producto entre add-to-cart y pay | Cliente debe re-personalizar |
