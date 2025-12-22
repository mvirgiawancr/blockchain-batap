-- Manual Input Research Areas untuk Asesor
-- Script ini menambahkan research_areas yang bervariasi agar AI bisa membedakan asesor

-- First, ensure all assessors have profiles
INSERT INTO assessor_profiles (user_id)
SELECT id FROM users WHERE role IN ('asesor', 'assessor') AND is_active = true
ON CONFLICT (user_id) DO NOTHING;

-- Update research areas dengan variasi bidang keahlian
-- Based on typical TIP (Teknologi Industri Pertanian) sub-fields

-- Group 1: Pengolahan Pangan & Teknologi Pangan
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Food Processing', 'Food Technology', 'Post-Harvest Technology', 'Food Safety'],
  h_index = 12,
  publication_count = 45
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%Farah Fahma%' OR name LIKE '%Endang Warsiki%'
);

-- Group 2: Bioproses & Bioenergi
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Bioprocess Engineering', 'Bioenergy', 'Fermentation Technology', 'Enzyme Technology'],
  h_index = 15,
  publication_count = 52
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%Khaswar Syamsu%' OR name LIKE '%Prayoga Suryadarma%' OR name LIKE '%Andes Ismayana%'
);

-- Group 3: Manajemen Agroindustri & Supply Chain
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Agroindustry Management', 'Supply Chain Management', 'Production Planning', 'Quality Management'],
  h_index = 18,
  publication_count = 65
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%Marimin%' OR name LIKE '%Hartrisari%' OR name LIKE '%Illah Sailah%'
);

-- Group 4: Teknologi Lingkungan & Pengolahan Limbah
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Environmental Technology', 'Waste Treatment', 'Cleaner Production', 'Life Cycle Assessment'],
  h_index = 14,
  publication_count = 48
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%Suprihatin%' OR name LIKE '%Muhammad Romli%' OR name LIKE '%Nastiti%'
);

-- Group 5: Teknologi Kemasan & Material
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Packaging Technology', 'Biopolymer', 'Biodegradable Materials', 'Nanotechnology'],
  h_index = 16,
  publication_count = 55
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%Titi Candra%' OR name LIKE '%Indah Yuliasih%'
);

-- Group 6: Sistem Informasi & Kecerdasan Buatan
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Decision Support System', 'Artificial Intelligence', 'Fuzzy Logic', 'Expert System'],
  h_index = 20,
  publication_count = 78
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%Ono Suparno%' OR name LIKE '%Elisa Anggraeni%'
);

-- Group 7: Teknik Proses & Perancangan Pabrik
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Process Engineering', 'Plant Design', 'Unit Operations', 'Process Optimization'],
  h_index = 11,
  publication_count = 38
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%Sapta Raharja%' OR name LIKE '%Muslich%'
);

-- Group 8: Ekonomi & Analisis Kelayakan
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Techno-Economic Analysis', 'Feasibility Study', 'Agribusiness', 'Rural Development'],
  h_index = 13,
  publication_count = 42
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%Tajuddin Bantacut%' OR name LIKE '%Anas Miftah%'
);

-- Group 9: Ergonomi & Keselamatan Kerja
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Ergonomics', 'Occupational Safety', 'Human Factors', 'Work System Design'],
  h_index = 9,
  publication_count = 28
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%Moh. Yani%' OR name LIKE '%Sugiarto%'
);

-- Group 10: Teknologi Hasil Pertanian
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Agricultural Product Technology', 'Drying Technology', 'Storage Technology', 'Grain Processing'],
  h_index = 10,
  publication_count = 35
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%Erliza%' OR name LIKE '%Yandra%'
);

-- Default untuk yang belum ter-cover (junior lecturers)
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Agricultural Engineering', 'Food Science', 'Industrial Technology'],
  h_index = 5,
  publication_count = 15
WHERE research_areas IS NULL OR array_length(research_areas, 1) IS NULL;

-- Update last_synced_at
UPDATE assessor_profiles SET last_synced_at = CURRENT_TIMESTAMP;

-- Verify the update
SELECT u.name, ap.research_areas, ap.h_index, ap.publication_count 
FROM users u 
JOIN assessor_profiles ap ON u.id = ap.user_id 
WHERE u.role IN ('asesor', 'assessor')
ORDER BY u.name;
