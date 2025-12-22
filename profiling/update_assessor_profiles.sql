-- Update assessor_profiles with h_index, publication_count, and research_areas
-- Run this on VPS: docker exec -it postgres-akreditasi psql -U lamtek -d akreditasi -f /tmp/update_profiles.sql

UPDATE assessor_profiles SET h_index = 18, publication_count = 65, research_areas = ARRAY['Agroindustry Management', 'Supply Chain Management', 'Production Planning', 'Quality Management']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_001');

UPDATE assessor_profiles SET h_index = 14, publication_count = 48, research_areas = ARRAY['Environmental Technology', 'Waste Treatment', 'Cleaner Production', 'Life Cycle Assessment']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_002');

UPDATE assessor_profiles SET h_index = 15, publication_count = 52, research_areas = ARRAY['Bioprocess Engineering', 'Bioenergy', 'Fermentation Technology', 'Enzyme Technology']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_003');

UPDATE assessor_profiles SET h_index = 14, publication_count = 48, research_areas = ARRAY['Environmental Technology', 'Waste Treatment', 'Cleaner Production', 'Life Cycle Assessment']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_004');

UPDATE assessor_profiles SET h_index = 10, publication_count = 35, research_areas = ARRAY['Agricultural Product Technology', 'Drying Technology', 'Storage Technology', 'Grain Processing']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_005');

UPDATE assessor_profiles SET h_index = 10, publication_count = 35, research_areas = ARRAY['Agricultural Product Technology', 'Drying Technology', 'Storage Technology', 'Grain Processing']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_006');

UPDATE assessor_profiles SET h_index = 14, publication_count = 48, research_areas = ARRAY['Environmental Technology', 'Waste Treatment', 'Cleaner Production', 'Life Cycle Assessment']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_007');

UPDATE assessor_profiles SET h_index = 13, publication_count = 42, research_areas = ARRAY['Techno-Economic Analysis', 'Feasibility Study', 'Agribusiness', 'Rural Development']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_008');

UPDATE assessor_profiles SET h_index = 20, publication_count = 78, research_areas = ARRAY['Decision Support System', 'Artificial Intelligence', 'Fuzzy Logic', 'Expert System']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_009');

UPDATE assessor_profiles SET h_index = 10, publication_count = 35, research_areas = ARRAY['Agricultural Product Technology', 'Drying Technology', 'Storage Technology', 'Grain Processing']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_010');

UPDATE assessor_profiles SET h_index = 18, publication_count = 65, research_areas = ARRAY['Agroindustry Management', 'Supply Chain Management', 'Production Planning', 'Quality Management']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_011');

UPDATE assessor_profiles SET h_index = 13, publication_count = 42, research_areas = ARRAY['Techno-Economic Analysis', 'Feasibility Study', 'Agribusiness', 'Rural Development']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_012');

UPDATE assessor_profiles SET h_index = 12, publication_count = 45, research_areas = ARRAY['Food Processing', 'Food Technology', 'Post-Harvest Technology', 'Food Safety']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_013');

UPDATE assessor_profiles SET h_index = 18, publication_count = 65, research_areas = ARRAY['Agroindustry Management', 'Supply Chain Management', 'Production Planning', 'Quality Management']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_014');

UPDATE assessor_profiles SET h_index = 5, publication_count = 15, research_areas = ARRAY['Agricultural Engineering', 'Food Science', 'Industrial Technology']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_015');

UPDATE assessor_profiles SET h_index = 16, publication_count = 55, research_areas = ARRAY['Packaging Technology', 'Biopolymer', 'Biodegradable Materials', 'Nanotechnology']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_016');

UPDATE assessor_profiles SET h_index = 16, publication_count = 55, research_areas = ARRAY['Packaging Technology', 'Biopolymer', 'Biodegradable Materials', 'Nanotechnology']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_017');

UPDATE assessor_profiles SET h_index = 9, publication_count = 28, research_areas = ARRAY['Ergonomics', 'Occupational Safety', 'Human Factors', 'Work System Design']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_018');

UPDATE assessor_profiles SET h_index = 11, publication_count = 38, research_areas = ARRAY['Process Engineering', 'Plant Design', 'Unit Operations', 'Process Optimization']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_019');

UPDATE assessor_profiles SET h_index = 12, publication_count = 40, research_areas = ARRAY['Lipid Technology', 'Oleochemistry', 'Biodiesel', 'Surfactant']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_020');

UPDATE assessor_profiles SET h_index = 8, publication_count = 32, research_areas = ARRAY['Essential Oils', 'Natural Products', 'Phytochemistry', 'Extraction Technology']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_021');

UPDATE assessor_profiles SET h_index = 12, publication_count = 45, research_areas = ARRAY['Food Processing', 'Food Technology', 'Post-Harvest Technology', 'Food Safety']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_022');

UPDATE assessor_profiles SET h_index = 15, publication_count = 52, research_areas = ARRAY['Bioprocess Engineering', 'Bioenergy', 'Fermentation Technology', 'Enzyme Technology']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_023');

UPDATE assessor_profiles SET h_index = 9, publication_count = 28, research_areas = ARRAY['Ergonomics', 'Occupational Safety', 'Human Factors', 'Work System Design']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_024');

UPDATE assessor_profiles SET h_index = 20, publication_count = 78, research_areas = ARRAY['Decision Support System', 'Artificial Intelligence', 'Fuzzy Logic', 'Expert System']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_025');

UPDATE assessor_profiles SET h_index = 12, publication_count = 40, research_areas = ARRAY['Lipid Technology', 'Oleochemistry', 'Biodiesel', 'Surfactant']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_026');

UPDATE assessor_profiles SET h_index = 11, publication_count = 38, research_areas = ARRAY['Process Engineering', 'Plant Design', 'Unit Operations', 'Process Optimization']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_027');

UPDATE assessor_profiles SET h_index = 7, publication_count = 22, research_areas = ARRAY['Plantation Technology', 'Rubber Processing', 'Palm Oil Technology', 'Coconut Processing']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_028');

UPDATE assessor_profiles SET h_index = 15, publication_count = 52, research_areas = ARRAY['Bioprocess Engineering', 'Bioenergy', 'Fermentation Technology', 'Enzyme Technology']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_029');

UPDATE assessor_profiles SET h_index = 9, publication_count = 30, research_areas = ARRAY['Starch Technology', 'Carbohydrate Chemistry', 'Food Hydrocolloids', 'Modified Starch']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_030');

UPDATE assessor_profiles SET h_index = 6, publication_count = 18, research_areas = ARRAY['Industrial Automation', 'Process Control', 'IoT', 'Smart Manufacturing']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_031');

UPDATE assessor_profiles SET h_index = 6, publication_count = 18, research_areas = ARRAY['Industrial Automation', 'Process Control', 'IoT', 'Smart Manufacturing']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_032');

UPDATE assessor_profiles SET h_index = 8, publication_count = 32, research_areas = ARRAY['Essential Oils', 'Natural Products', 'Phytochemistry', 'Extraction Technology']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_033');

UPDATE assessor_profiles SET h_index = 7, publication_count = 22, research_areas = ARRAY['Plantation Technology', 'Rubber Processing', 'Palm Oil Technology', 'Coconut Processing']
WHERE user_id = (SELECT id FROM users WHERE username = 'asesor_034');
