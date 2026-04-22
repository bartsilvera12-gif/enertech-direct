-- Datos de prueba schema enertech (ejecutar después del schema)

INSERT INTO enertech.store_settings (key, value)
VALUES
  ('whatsapp_e164', to_jsonb('595981000000'::text)),
  ('currency', to_jsonb('PYG'::text)),
  ('store_name', to_jsonb('Enertech Direct'::text))
ON CONFLICT (key) DO NOTHING;

INSERT INTO enertech.categories (id, name, slug, description, is_active, sort_order)
VALUES
  ('11111111-1111-4111-8111-111111111101', 'Energía Solar', 'energia-solar',
   'Paneles y sistemas fotovoltaicos.', true, 1),
  ('11111111-1111-4111-8111-111111111102', 'Baterías', 'baterias',
   'Almacenamiento residencial e industrial.', true, 2),
  ('11111111-1111-4111-8111-111111111103', 'Inversores', 'inversores',
   'Conversión y gestión inteligente.', true, 3),
  ('11111111-1111-4111-8111-111111111104', 'Accesorios', 'accesorios',
   'Montaje, cables y protección.', true, 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO enertech.products (
  id, category_id, name, slug, sku, short_description, description,
  price, compare_at_price, stock, featured, is_active, specs
) VALUES
(
  '22222222-2222-4222-8222-222222222201',
  '11111111-1111-4111-8111-111111111101',
  'Panel Solar Prismátic X',
  'panel-solar-prismatic-x',
  'ENT-PSX-450',
  '450W monocristalino alta eficiencia.',
  'Arquitectura monocristalina pensada para climas exigentes.',
  1240000,
  1450000,
  12,
  true,
  true,
  '{"Potencia":"450W","Eficiencia":"21.8%"}'::jsonb
),
(
  '22222222-2222-4222-8222-222222222202',
  '11111111-1111-4111-8111-111111111102',
  'Batería Ion-Core 10kWh',
  'bateria-ion-core-10kwh',
  'ENT-IC-10',
  'Litio LFP modular.',
  'Celdas grado automotriz con BMS inteligente.',
  8950000,
  NULL,
  4,
  true,
  true,
  '{"Capacidad":"10 kWh","Química":"LiFePO4"}'::jsonb
),
(
  '22222222-2222-4222-8222-222222222203',
  '11111111-1111-4111-8111-111111111103',
  'Inversor Nodo Grid-7',
  'inversor-nodo-grid-7',
  'ENT-NG7-5K',
  'Híbrido 5kW.',
  'MPPT dual y monitoreo Wi-Fi.',
  4280000,
  NULL,
  8,
  true,
  true,
  '{"Potencia":"5 kW"}'::jsonb
),
(
  '22222222-2222-4222-8222-222222222204',
  '11111111-1111-4111-8111-111111111101',
  'Panel Solar Lumen 380',
  'panel-solar-lumen-380',
  'ENT-LM-380',
  '380W policristalino.',
  'Relación precio/rendimiento para residencial.',
  890000,
  NULL,
  30,
  false,
  true,
  '{"Potencia":"380W"}'::jsonb
),
(
  '22222222-2222-4222-8222-222222222205',
  '11111111-1111-4111-8111-111111111104',
  'Kit de Montaje Premium',
  'kit-montaje-premium',
  'ENT-MNT-K1',
  'Estructura aluminio para 4 paneles.',
  'Certificado ante vientos extremos.',
  620000,
  NULL,
  18,
  false,
  true,
  '{"Material":"Aluminio"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO enertech.product_images (product_id, url, sort_order, alt)
VALUES
  ('22222222-2222-4222-8222-222222222201',
   'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=80', 0,
   'Panel solar'),
  ('22222222-2222-4222-8222-222222222202',
   'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?auto=format&fit=crop&w=1200&q=80', 0,
   'Batería'),
  ('22222222-2222-4222-8222-222222222203',
   'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80', 0,
   'Inversor'),
  ('22222222-2222-4222-8222-222222222204',
   'https://images.unsplash.com/photo-1559302504-64aae6ca6b6d?auto=format&fit=crop&w=1200&q=80', 0,
   'Panel Lumen'),
  ('22222222-2222-4222-8222-222222222205',
   'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1200&q=80', 0,
   'Kit montaje');

-- Opcional: pedido demo
INSERT INTO enertech.customers (id, phone, full_name, city, address)
VALUES ('33333333-3333-4333-8333-333333333301', '+595981111111', 'Cliente Demo', 'Asunción', 'Av. Demo 123')
ON CONFLICT (id) DO NOTHING;

INSERT INTO enertech.orders (order_number, customer_id, status, total_amount)
VALUES ('ENT-000042', '33333333-3333-4333-8333-333333333301', 'sent_whatsapp', 1240000)
ON CONFLICT (order_number) DO NOTHING;
