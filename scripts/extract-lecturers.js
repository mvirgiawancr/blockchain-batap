const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('./profiling/Profile_Riset_Publikasi_ST_2025.xls');
const lecturers = [];

// TIN with scholar links
const tinWs = wb.Sheets['TIN Scopus__Scholar'];
const tinData = XLSX.utils.sheet_to_json(tinWs, {header: 1});
tinData.slice(3).forEach(row => {
  if (row[1] && typeof row[1] === 'string' && row[1].includes('.')) {
    lecturers.push({
      name: row[1].trim().replace(/\s+/g, ' '),
      department: 'TIN',
      expertise: 'Teknologi Industri Pertanian',
      scholar: row[2] || null,
      scopus: row[3] || null
    });
  }
});

// Check Dosen Fateta Per Divisi for other depts
const dosenWs = wb.Sheets['Dosen Fateta Per Divisi'];
const dosenData = XLSX.utils.sheet_to_json(dosenWs, {header: 1});

let currentDept = '';
const expertiseMap = {
  'TIN': 'Teknologi Industri Pertanian',
  'ITP': 'Ilmu dan Teknologi Pangan',
  'SIL': 'Teknik Sipil dan Lingkungan',
  'TMB': 'Teknik Mesin dan Biosistem'
};

dosenData.forEach(row => {
  const cell = String(row[0] || '');
  
  // Detect department sections
  if (cell.includes('ITP') || cell.includes('Ilmu dan Teknologi Pangan')) currentDept = 'ITP';
  else if (cell.includes('SIL') || cell.includes('Silvikultur')) currentDept = 'SIL';
  else if (cell.includes('TMB') || cell.includes('Teknik Mesin')) currentDept = 'TMB';
  
  // Check for lecturer names
  if ((cell.includes('Prof') || cell.includes('Dr')) && cell.includes('.')) {
    if (currentDept && !cell.includes('FORMASI') && !cell.includes('NAMA') && !cell.includes('Lampiran')) {
      const name = cell.trim().replace(/\s+/g, ' ');
      if (!lecturers.find(l => l.name === name)) {
        lecturers.push({
          name: name,
          department: currentDept,
          expertise: expertiseMap[currentDept] || currentDept,
          scholar: null,
          scopus: null
        });
      }
    }
  }
});

// Remove duplicates by name
const unique = [...new Map(lecturers.map(l => [l.name, l])).values()];

console.log('Total unique lecturers:', unique.length);
console.log('By department:');
['TIN', 'ITP', 'SIL', 'TMB'].forEach(d => {
  console.log(d + ':', unique.filter(l => l.department === d).length);
});

// Save to JSON for next step
fs.writeFileSync('./profiling/lecturers.json', JSON.stringify(unique, null, 2));
console.log('\nSaved to profiling/lecturers.json');
console.log('\nSample entries:');
console.log(JSON.stringify(unique.slice(0, 5), null, 2));
