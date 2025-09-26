const express = require('express');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Enhanced Excel parsing function
function parseIdentitasProgram(workbook) {
  const sheetNames = workbook.SheetNames;
  console.log('Available sheets:', sheetNames);
  
  let namaUniversitas = null;
  let namaProgram = null;
  let jenjangnProgram = null;
  let fakultas = null;
  
  // Try multiple extraction strategies
  const extractionStrategies = [
    tryExtractFromIdentitasSheet,
    tryExtractFromNumberedSheet,
    tryExtractBasicInfo
  ];
  
  for (const strategy of extractionStrategies) {
    const result = strategy(workbook, sheetNames);
    if (result.namaUniversitas) namaUniversitas = result.namaUniversitas;
    if (result.namaProgram) namaProgram = result.namaProgram;
    if (result.jenjangnProgram) jenjangnProgram = result.jenjangnProgram;
    if (result.fakultas) fakultas = result.fakultas;
    
    // Stop if we found all key info
    if (namaUniversitas && namaProgram) break;
  }
  
  console.log('Extracted data:', { namaUniversitas, namaProgram, jenjangnProgram, fakultas });
  
  return {
    namaUniversitas,
    namaProgram,
    jenjangnProgram,
    fakultas
  };
}

function tryExtractFromIdentitasSheet(workbook, sheetNames) {
  const identitasSheets = sheetNames.filter(name => 
    name.toLowerCase().includes('identitas') || 
    name.toLowerCase().includes('cover') ||
    name.toLowerCase().includes('sampul')
  );
  
  for (const sheetName of identitasSheets) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    const result = extractFromRows(data);
    if (result.namaUniversitas || result.namaProgram) {
      console.log(`Found data in identitas sheet: ${sheetName}`);
      return result;
    }
  }
  
  return {};
}

function tryExtractFromNumberedSheet(workbook, sheetNames) {
  const numberedSheets = sheetNames.filter(name => 
    /^(PS|Program|1-1|2a1|A1|A\.1|I\.1)/i.test(name)
  );
  
  for (const sheetName of numberedSheets) {
    console.log(`Trying numbered sheet: ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    const result = extractFromRows(data);
    if (result.namaUniversitas || result.namaProgram) {
      console.log(`Found data in numbered sheet: ${sheetName}`);
      return result;
    }
  }
  
  return {};
}

function tryExtractBasicInfo(workbook, sheetNames) {
  // Try all sheets as last resort
  for (const sheetName of sheetNames) {
    console.log(`Trying sheet: ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    const result = extractFromRows(data);
    if (result.namaUniversitas || result.namaProgram) {
      console.log(`Found data in sheet: ${sheetName}`);
      return result;
    }
  }
  
  return {};
}

function extractFromRows(data) {
  let namaUniversitas = null;
  let namaProgram = null;
  let jenjangnProgram = null;
  let fakultas = null;
  
  // Search through all rows and columns
  for (let rowIndex = 0; rowIndex < Math.min(data.length, 50); rowIndex++) {
    const row = data[rowIndex];
    if (!Array.isArray(row)) continue;
    
    for (let colIndex = 0; colIndex < Math.min(row.length, 10); colIndex++) {
      const cell = String(row[colIndex] || '').trim();
      
      if (!cell) continue;
      
      // Check for university name
      if (!namaUniversitas && isUniversityName(cell)) {
        namaUniversitas = cell;
        console.log(`Found university in row ${rowIndex}, col ${colIndex}: ${cell}`);
      }
      
      // Check for program name
      if (!namaProgram && isProgramName(cell)) {
        namaProgram = cell;
        console.log(`Found program in row ${rowIndex}, col ${colIndex}: ${cell}`);
      }
      
      // Check for jenjang
      if (!jenjangnProgram && isJenjangName(cell)) {
        jenjangnProgram = cell;
        console.log(`Found jenjang in row ${rowIndex}, col ${colIndex}: ${cell}`);
      }
      
      // Check for fakultas
      if (!fakultas && isFakultasName(cell)) {
        fakultas = cell;
        console.log(`Found fakultas in row ${rowIndex}, col ${colIndex}: ${cell}`);
      }
    }
    
    // Also check adjacent cells for context
    for (let colIndex = 0; colIndex < Math.min(row.length - 1, 9); colIndex++) {
      const currentCell = String(row[colIndex] || '').trim().toLowerCase();
      const nextCell = String(row[colIndex + 1] || '').trim();
      
      if (!nextCell) continue;
      
      // Context-based extraction
      if (currentCell.includes('universitas') || currentCell.includes('institut') || currentCell.includes('politeknik')) {
        if (!namaUniversitas && nextCell.length > 5) {
          namaUniversitas = nextCell;
          console.log(`Found university by context: ${nextCell}`);
        }
      }
      
      if ((currentCell.includes('program') && currentCell.includes('studi')) || 
          currentCell.includes('nama program')) {
        if (!namaProgram && nextCell.length > 3) {
          namaProgram = nextCell;
          console.log(`Found program by context: ${nextCell}`);
        }
      }
    }
  }
  
  return { namaUniversitas, namaProgram, jenjangnProgram, fakultas };
}

function isUniversityName(text) {
  const patterns = [
    /^(Universitas|Institut|Politeknik|Sekolah Tinggi|Akademi|STMIK|STIMIK|STIKOM|STIKES)\s+.{3,}/i,
    /^(UI|ITB|UGM|UNAIR|ITS|UNDIP|UNHAS|USU|UNPAD|UNS|UNSRI|UNAND|UNMUL|UNM|UNUD|UNRAM|UNTIRTA|UIN|IAIN|STATERA|STIE)\s*/i
  ];
  
  return patterns.some(pattern => pattern.test(text)) && text.length > 5 && text.length < 100;
}

function isProgramName(text) {
  const patterns = [
    /^(Teknik|Sistem|Manajemen|Akuntansi|Ekonomi|Hukum|Kedokteran|Psikologi|Farmasi|Arsitektur)\s+.{2,}/i,
    /(Informatika|Komputer|Informasi|Industri|Elektro|Mesin|Sipil|Kimia|Biologi|Fisika|Matematika)/i,
    /^(D3|D4|S1|S2|S3)\s+/i
  ];
  
  return patterns.some(pattern => pattern.test(text)) && 
         text.length > 3 && 
         text.length < 80 &&
         !isUniversityName(text);
}

function isJenjangName(text) {
  const patterns = [
    /^(D1|D2|D3|D4|S1|S2|S3|Diploma|Sarjana|Magister|Doktor)/i
  ];
  
  return patterns.some(pattern => pattern.test(text)) && text.length < 30;
}

function isFakultasName(text) {
  const patterns = [
    /^(Fakultas|FMIPA|FT|FE|FH|FK|FKM|FISIP|FIB|FPOK|FPsi)/i,
    /(Teknik|Ekonomi|Hukum|Kedokteran|MIPA|Ilmu Komputer|Vokasi|Pascasarjana)/i
  ];
  
  return patterns.some(pattern => pattern.test(text)) && 
         text.length > 4 && 
         text.length < 60 &&
         !isUniversityName(text) && 
         !isProgramName(text);
}

// File upload endpoint
router.post('/', (req, res) => {
  const upload = req.upload.single('file');
  
  upload(req, res, function(err) {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        success: false,
        message: 'Error uploading file',
        error: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    try {
      console.log('Processing file:', req.file.filename);
      
      // Parse Excel file
      const workbook = XLSX.readFile(req.file.path);
      const sheetNames = workbook.SheetNames;
      
      console.log('Total sheets found:', sheetNames.length);
      console.log('Sheet names:', sheetNames);
      
      // Parse identity information
      const identitasProgram = parseIdentitasProgram(workbook);
      
      // Process all sheets for basic info
      const sheets = sheetNames.map(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        return {
          name: sheetName,
          rowCount: data.length,
          columnCount: data.length > 0 ? Math.max(...data.map(row => (Array.isArray(row) ? row.length : 0))) : 0,
          hasData: data.length > 1 // More than just header
        };
      });
      
      // Create response
      const result = {
        success: true,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        sheets: sheets,
        lkpsData: identitasProgram,
        errors: [],
        warnings: [],
        timestamp: new Date().toISOString()
      };
      
      // Add warnings if key data is missing
      if (!identitasProgram.namaUniversitas) {
        result.warnings.push('Nama universitas tidak ditemukan dalam file');
      }
      
      if (!identitasProgram.namaProgram) {
        result.warnings.push('Nama program studi tidak ditemukan dalam file');
      }
      
      if (sheets.length === 0) {
        result.errors.push('File tidak mengandung sheet yang valid');
      }
      
      console.log('Processing completed successfully');
      console.log('Final result:', {
        fileName: result.fileName,
        sheetsCount: result.sheets.length,
        identitas: result.lkpsData,
        errorsCount: result.errors.length,
        warningsCount: result.warnings.length
      });
      
      res.json(result);
      
    } catch (error) {
      console.error('Processing error:', error);
      
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({
        success: false,
        message: 'Error processing Excel file',
        error: error.message
      });
    }
  });
});

module.exports = router;