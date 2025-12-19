const fs = require('fs');

// Read extracted lecturers
const lecturers = JSON.parse(fs.readFileSync('./profiling/lecturers.json', 'utf8'));

// Password hash for 'password123'
const passwordHash = '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm';

// Generate SQL for users table
let sql = `-- 5. Asesor users from TIN Faculty (Real data from profiling)
INSERT INTO users (username, password_hash, role, name, institution, program_studi, phone, msp_org, is_active)
VALUES 
`;

const userValues = lecturers.map((l, i) => {
  const username = `asesor_${String(i + 1).padStart(3, '0')}`;
  const phone = `0812345678${String(i + 1).padStart(2, '0')}`;
  // Escape single quotes in name
  const name = l.name.replace(/'/g, "''");
  const expertise = l.expertise.replace(/'/g, "''");
  
  return `    (
        '${username}',
        '${passwordHash}',
        'asesor',
        '${name}',
        'Institut Pertanian Bogor',
        '${expertise}',
        '${phone}',
        'AsesorMSP',
        TRUE
    )`;
}).join(',\n');

sql += userValues;
sql += `
ON CONFLICT (username) DO UPDATE SET
    name = EXCLUDED.name,
    program_studi = EXCLUDED.program_studi,
    msp_org = EXCLUDED.msp_org;

-- 6. Assessor Profiles (Scholar/Scopus links)
CREATE TABLE IF NOT EXISTS assessor_profiles (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    google_scholar_url TEXT,
    scopus_url TEXT,
    department VARCHAR(50),
    research_areas TEXT[],
    h_index INTEGER,
    publication_count INTEGER DEFAULT 0,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assessor_profiles_user_id ON assessor_profiles(user_id);

-- Insert assessor profiles with Scholar/Scopus links
`;

// Generate profile inserts
const profileInserts = lecturers.map((l, i) => {
  const username = `asesor_${String(i + 1).padStart(3, '0')}`;
  const scholar = l.scholar ? `'${l.scholar}'` : 'NULL';
  const scopus = l.scopus ? `'${l.scopus}'` : 'NULL';
  
  return `INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, ${scholar}, ${scopus}, '${l.department}'
FROM users WHERE username = '${username}'
ON CONFLICT DO NOTHING;`;
}).join('\n');

sql += profileInserts;

console.log(sql);

// Save to file
fs.writeFileSync('./profiling/assessors-sql.sql', sql);
console.log('\n\n=== Saved to profiling/assessors-sql.sql ===');
