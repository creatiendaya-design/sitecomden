import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Limpiar datos existentes
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.cart.deleteMany()
  await prisma.productReview.deleteMany()
  await prisma.inventoryMovement.deleteMany()
  await prisma.productVariant.deleteMany()
  await prisma.productOptionValue.deleteMany()
  await prisma.productOption.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.coupon.deleteMany()
  await prisma.user.deleteMany()
  await prisma.setting.deleteMany()
  await prisma.newsletterSubscriber.deleteMany()

  // ============================================================================
  // USUARIOS ADMIN
  // ============================================================================
  console.log('👤 Creando usuarios admin...')
  
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@shopgood.pe',
      password: hashedPassword,
      name: 'Administrador',
      role: 'ADMIN',
      active: true,
    },
  })

  console.log('✅ Usuario admin creado:', admin.email)

  // ============================================================================
  // CATEGORÍAS
  // ============================================================================
  console.log('📁 Creando categorías...')

  const categorias = await prisma.category.createMany({
    data: [
      {
        name: 'Ropa',
        slug: 'ropa',
        description: 'Ropa de moda para hombres y mujeres',
        order: 1,
        active: true,
      },
      {
        name: 'Calzado',
        slug: 'calzado',
        description: 'Zapatillas y zapatos para todas las ocasiones',
        order: 2,
        active: true,
      },
      {
        name: 'Accesorios',
        slug: 'accesorios',
        description: 'Complementos para completar tu look',
        order: 3,
        active: true,
      },
      {
        name: 'Electrónicos',
        slug: 'electronicos',
        description: 'Tecnología y gadgets',
        order: 4,
        active: true,
      },
    ],
  })

  const ropaCategory = await prisma.category.findUnique({
    where: { slug: 'ropa' },
  })

  const calzadoCategory = await prisma.category.findUnique({
    where: { slug: 'calzado' },
  })

  console.log('✅ Categorías creadas')

  // ============================================================================
  // PRODUCTOS SIMPLES (sin variantes)
  // ============================================================================
  console.log('📦 Creando productos simples...')

  await prisma.product.create({
    data: {
      name: 'Mochila Deportiva Nike',
      slug: 'mochila-deportiva-nike',
      description: 'Mochila deportiva de alta calidad con múltiples compartimentos',
      shortDescription: 'Mochila deportiva Nike con compartimentos',
      basePrice: 89.90,
      compareAtPrice: 129.90,
      sku: 'MOCHILA-NIKE-001',
      stock: 25,
      images: [
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
        'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=500',
      ],
      hasVariants: false,
      featured: true,
      active: true,
      weight: 0.5,
      categoryId: ropaCategory?.id,
      metaTitle: 'Mochila Deportiva Nike | ShopGood Perú',
      metaDescription: 'Compra tu mochila deportiva Nike con envío gratis',
    },
  })

  await prisma.product.create({
    data: {
      name: 'Gorra Adidas Original',
      slug: 'gorra-adidas-original',
      description: 'Gorra deportiva Adidas 100% original',
      shortDescription: 'Gorra deportiva Adidas',
      basePrice: 45.90,
      sku: 'GORRA-ADIDAS-001',
      stock: 50,
      images: [
        'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500',
      ],
      hasVariants: false,
      active: true,
      weight: 0.2,
      categoryId: ropaCategory?.id,
    },
  })

  console.log('✅ Productos simples creados')

  // ============================================================================
  // PRODUCTO CON VARIANTES - Zapatillas
  // ============================================================================
  console.log('👟 Creando producto con variantes (Zapatillas)...')

  const zapatillas = await prisma.product.create({
    data: {
      name: 'Zapatillas Nike Air Max',
      slug: 'zapatillas-nike-air-max',
      description: `
        <h2>Zapatillas Nike Air Max</h2>
        <p>Las legendarias Nike Air Max con tecnología de amortiguación visible que proporciona comodidad durante todo el día.</p>
        <h3>Características:</h3>
        <ul>
          <li>Tecnología Air Max visible</li>
          <li>Suela de goma resistente</li>
          <li>Upper de mesh transpirable</li>
          <li>Ideal para uso diario y deportivo</li>
        </ul>
      `,
      shortDescription: 'Zapatillas Nike Air Max con amortiguación visible',
      basePrice: 299.90,
      compareAtPrice: 399.90,
      images: [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
        'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500',
      ],
      hasVariants: true,
      featured: true,
      active: true,
      weight: 0.8,
      categoryId: calzadoCategory?.id,
      metaTitle: 'Zapatillas Nike Air Max | ShopGood Perú',
      metaDescription: 'Compra zapatillas Nike Air Max originales con envío gratis',
    },
  })

  // Crear opciones (Color y Talla)
  const colorOption = await prisma.productOption.create({
    data: {
      productId: zapatillas.id,
      name: 'Color',
      position: 1,
      values: {
        create: [
          { value: 'Negro', position: 1 },
          { value: 'Blanco', position: 2 },
          { value: 'Rojo', position: 3 },
        ],
      },
    },
  })

  const tallaOption = await prisma.productOption.create({
    data: {
      productId: zapatillas.id,
      name: 'Talla',
      position: 2,
      values: {
        create: [
          { value: '38', position: 1 },
          { value: '39', position: 2 },
          { value: '40', position: 3 },
          { value: '41', position: 4 },
          { value: '42', position: 5 },
        ],
      },
    },
  })

  // Crear variantes (combinaciones Color x Talla)
  const colores = ['Negro', 'Blanco', 'Rojo']
  const tallas = ['38', '39', '40', '41', '42']
  const precios = { Negro: 299.90, Blanco: 299.90, Rojo: 319.90 }

  for (const color of colores) {
    for (const talla of tallas) {
      await prisma.productVariant.create({
        data: {
          productId: zapatillas.id,
          sku: `NIKE-${color.substring(0, 3).toUpperCase()}-${talla}`,
          options: { Color: color, Talla: talla },
          price: precios[color as keyof typeof precios],
          compareAtPrice: 399.90,
          stock: Math.floor(Math.random() * 20) + 5, // Stock aleatorio entre 5-24
          active: true,
          weight: 0.8,
        },
      })
    }
  }

  console.log('✅ Producto con variantes creado (15 variantes)')

  // ============================================================================
  // PRODUCTO CON VARIANTES - Polo
  // ============================================================================
  console.log('👕 Creando producto con variantes (Polo)...')

  const polo = await prisma.product.create({
    data: {
      name: 'Polo Básico Algodón',
      slug: 'polo-basico-algodon',
      description: 'Polo básico de algodón 100% peruano, suave y cómodo',
      shortDescription: 'Polo básico de algodón',
      basePrice: 39.90,
      images: [
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
      ],
      hasVariants: true,
      active: true,
      weight: 0.3,
      categoryId: ropaCategory?.id,
    },
  })

  await prisma.productOption.create({
    data: {
      productId: polo.id,
      name: 'Color',
      position: 1,
      values: {
        create: [
          { value: 'Blanco', position: 1 },
          { value: 'Negro', position: 2 },
          { value: 'Azul', position: 3 },
        ],
      },
    },
  })

  await prisma.productOption.create({
    data: {
      productId: polo.id,
      name: 'Talla',
      position: 2,
      values: {
        create: [
          { value: 'S', position: 1 },
          { value: 'M', position: 2 },
          { value: 'L', position: 3 },
          { value: 'XL', position: 4 },
        ],
      },
    },
  })

  const coloresPolo = ['Blanco', 'Negro', 'Azul']
  const tallasPolo = ['S', 'M', 'L', 'XL']

  for (const color of coloresPolo) {
    for (const talla of tallasPolo) {
      await prisma.productVariant.create({
        data: {
          productId: polo.id,
          sku: `POLO-${color.substring(0, 3).toUpperCase()}-${talla}`,
          options: { Color: color, Talla: talla },
          price: 39.90,
          stock: Math.floor(Math.random() * 30) + 10,
          active: true,
          weight: 0.3,
        },
      })
    }
  }

  console.log('✅ Polo con variantes creado (12 variantes)')

  // ============================================================================
  // CUPONES
  // ============================================================================
  console.log('🎟️ Creando cupones...')

  await prisma.coupon.createMany({
    data: [
      {
        code: 'BIENVENIDO10',
        description: '10% de descuento en tu primera compra',
        type: 'PERCENTAGE',
        value: 10,
        minPurchase: 50,
        maxDiscount: 30,
        usageLimit: 100,
        usageLimitPerUser: 1,
        active: true,
        expiresAt: new Date('2024-12-31'),
      },
      {
        code: 'VERANO20',
        description: '20 soles de descuento',
        type: 'FIXED_AMOUNT',
        value: 20,
        minPurchase: 100,
        usageLimit: 50,
        active: true,
        expiresAt: new Date('2024-03-31'),
      },
      {
        code: 'ENVIOGRATIS',
        description: 'Envío gratis en compras mayores a 150 soles',
        type: 'FREE_SHIPPING',
        value: 0,
        minPurchase: 150,
        active: true,
      },
    ],
  })

  console.log('✅ Cupones creados')

  // ============================================================================
  // CONFIGURACIÓN
  // ============================================================================
  console.log('⚙️ Creando configuración...')

  await prisma.setting.createMany({
    data: [
      {
        key: 'store_info',
        category: 'general',
        description: 'Información de la tienda',
        value: {
          name: 'ShopGood Perú',
          phone: '+51987654321',
          email: 'info@shopgood.pe',
          address: 'Av. Larco 123, Miraflores, Lima',
          whatsapp: '+51987654321',
        },
      },
      {
        key: 'shipping_methods',
        category: 'shipping',
        description: 'Métodos de envío disponibles',
        value: {
          olva: { name: 'Olva Courier', price: 15, enabled: true },
          shalom: { name: 'Shalom', price: 12, enabled: true },
          recojo: { name: 'Recojo en tienda', price: 0, enabled: true },
        },
      },
      {
        key: 'payment_methods',
        category: 'payment',
        description: 'Métodos de pago disponibles',
        value: {
          yape: {
            name: 'Yape',
            enabled: true,
            phone: '987654321',
            qrImage: '/images/yape-qr.png',
          },
          plin: {
            name: 'Plin',
            enabled: true,
            phone: '987654321',
            qrImage: '/images/plin-qr.png',
          },
          culqi: { name: 'Tarjeta (Culqi)', enabled: true },
          paypal: { name: 'PayPal', enabled: true },
          mercadopago: { name: 'Mercado Pago', enabled: false },
        },
      },
      {
        key: 'email_config',
        category: 'email',
        description: 'Configuración de emails',
        value: {
          fromName: 'ShopGood Perú',
          fromEmail: 'pedidos@shopgood.pe',
          replyTo: 'soporte@shopgood.pe',
        },
      },
    ],
  })

  console.log('✅ Configuración creada')

  // ============================================================================
  // NEWSLETTER
  // ============================================================================
  console.log('📧 Creando suscriptores de prueba...')

  await prisma.newsletterSubscriber.createMany({
    data: [
      {
        email: 'cliente1@example.com',
        name: 'Juan Pérez',
        active: true,
      },
      {
        email: 'cliente2@example.com',
        name: 'María García',
        active: true,
      },
    ],
  })

  console.log('✅ Suscriptores creados')

  console.log('🎉 Seed completado exitosamente!')
  console.log('')
  console.log('📊 Resumen:')
  console.log('  - 1 usuario admin (admin@shopgood.pe / admin123)')
  console.log('  - 4 categorías')
  console.log('  - 2 productos simples')
  console.log('  - 2 productos con variantes (27 variantes total)')
  console.log('  - 3 cupones')
  console.log('  - 4 configuraciones')
  console.log('  - 2 suscriptores newsletter')
  console.log('')
  console.log('🔐 Credenciales admin:')
  console.log('  Email: admin@shopgood.pe')
  console.log('  Password: admin123')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
