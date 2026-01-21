import { prisma } from "@/lib/db";

async function updateSettings() {
  console.log('🔧 Actualizando settings del sitio...');

  try {
    // Nombre del sitio
    await prisma.setting.upsert({
      where: { key: 'site_name' },
      update: { value: 'ShopGood Perú' },
      create: { 
        key: 'site_name', 
        value: 'ShopGood Perú', 
        category: 'general',
        description: 'Nombre del sitio web'
      },
    });
    console.log('✅ site_name actualizado');

    // URL del sitio
    await prisma.setting.upsert({
      where: { key: 'site_url' },
      update: { value: 'https://shopgood.pe' },
      create: { 
        key: 'site_url', 
        value: 'https://shopgood.pe', 
        category: 'general',
        description: 'URL principal del sitio'
      },
    });
    console.log('✅ site_url actualizado');

    // Descripción SEO (se usa en el footer)
    await prisma.setting.upsert({
      where: { key: 'seo_home_description' },
      update: { 
        value: 'Tu tienda online de confianza con envío a todo el Perú.' 
      },
      create: { 
        key: 'seo_home_description', 
        value: 'Tu tienda online de confianza con envío a todo el Perú.', 
        category: 'seo',
        description: 'Descripción SEO de la página principal'
      },
    });
    console.log('✅ seo_home_description actualizado');

    // Email de contacto
    await prisma.setting.upsert({
      where: { key: 'contact_email' },
      update: { value: 'contacto@shopgood.pe' },
      create: { 
        key: 'contact_email', 
        value: 'contacto@shopgood.pe', 
        category: 'contact',
        description: 'Email de contacto principal'
      },
    });
    console.log('✅ contact_email actualizado');

    // Teléfono de contacto
    await prisma.setting.upsert({
      where: { key: 'contact_phone' },
      update: { value: '+51 999 999 999' },
      create: { 
        key: 'contact_phone', 
        value: '+51 999 999 999', 
        category: 'contact',
        description: 'Teléfono de contacto principal'
      },
    });
    console.log('✅ contact_phone actualizado');

    // Facebook
    await prisma.setting.upsert({
      where: { key: 'social_facebook' },
      update: { value: 'https://facebook.com/shopgoodperu' },
      create: { 
        key: 'social_facebook', 
        value: 'https://facebook.com/shopgoodperu', 
        category: 'social',
        description: 'URL del perfil de Facebook'
      },
    });
    console.log('✅ social_facebook actualizado');

    // Instagram
    await prisma.setting.upsert({
      where: { key: 'social_instagram' },
      update: { value: 'https://instagram.com/shopgoodperu' },
      create: { 
        key: 'social_instagram', 
        value: 'https://instagram.com/shopgoodperu', 
        category: 'social',
        description: 'URL del perfil de Instagram'
      },
    });
    console.log('✅ social_instagram actualizado');

    // Twitter
    await prisma.setting.upsert({
      where: { key: 'social_twitter' },
      update: { value: 'https://twitter.com/shopgoodpe' },
      create: { 
        key: 'social_twitter', 
        value: 'https://twitter.com/shopgoodpe', 
        category: 'social',
        description: 'URL del perfil de Twitter/X'
      },
    });
    console.log('✅ social_twitter actualizado');

    // TikTok (opcional - dejar vacío si no lo usas)
    await prisma.setting.upsert({
      where: { key: 'social_tiktok' },
      update: { value: '' },
      create: { 
        key: 'social_tiktok', 
        value: '', 
        category: 'social',
        description: 'URL del perfil de TikTok (opcional)'
      },
    });
    console.log('✅ social_tiktok actualizado');

    console.log('\n🎉 ¡Todos los settings actualizados correctamente!');
    console.log('\n📋 Resumen de settings:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Nombre: ShopGood Perú');
    console.log('Descripción: Tu tienda online de confianza con envío a todo el Perú.');
    console.log('Facebook: https://facebook.com/shopgoodperu');
    console.log('Instagram: https://instagram.com/shopgoodperu');
    console.log('Twitter: https://twitter.com/shopgoodpe');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 Siguiente paso: Reinicia tu servidor (npm run dev)');
    
  } catch (error) {
    console.error('❌ Error actualizando settings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
updateSettings();