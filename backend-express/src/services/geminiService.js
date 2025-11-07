/**
 * Google Gemini AI Service for LAM-TEK 2025 (7 Criteria)
 * Document analysis and data extraction service
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const pdfParse = require('pdf-parse');
const ExcelJS = require('exceljs');

class GeminiService {
  constructor() {
    if (!config.gemini.apiKey) {
      console.warn('[Gemini] Warning: GEMINI_API_KEY not set. AI features will be disabled.');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: config.gemini.model });
    }

    // LAM-TEK 2025: 7 Kriteria Configuration
    this.criteriaConfig = {
      1: {
        name: 'Diferensiasi Misi',
        ledKeys: ['vmts_unik_spesifik', 'vmts_dukungan_renstra_kurikulum', 'vmts_linearitas_pt', 
                  'vmts_stakeholder_internal', 'vmts_stakeholder_eksternal', 'vmts_sosialisasi', 
                  'vmts_pemahaman', 'vmts_pencapaian_konkret'],
        lkpsKeys: []
      },
      2: {
        name: 'Akuntabilitas',
        ledKeys: ['tata_pamong_kelengkapan', 'tata_pamong_governance', 'komitmen_pimpinan', 
                  'kemampuan_manajerial', 'pengelolaan_keuangan'],
        lkpsKeys: ['bop_value', 'dpd_total', 'jumlah_dtps', 'kerjasama_pendidikan', 
                   'kerjasama_penelitian', 'kerjasama_pkm', 'kerjasama_internasional', 
                   'kerjasama_nasional', 'kerjasama_wilayah']
      },
      3: {
        name: 'Relevansi Pendidikan, Penelitian, dan PkM',
        ledKeys: ['pemutakhiran_kurikulum', 'profil_lulusan', 'kesesuaian_profil_cpl', 
                  'rps_kelengkapan', 'proses_pembelajaran_efektivitas', 'suasana_akademik_pengelolaan', 
                  'kesesuaian_penelitian', 'kesesuaian_pkm'],
        lkpsKeys: ['persentase_bahan_ajar_penelitian_pkm', 'pjp', 'basic_sciences_sks', 'ppdmhs', 'pkdmhs']
      },
      4: {
        name: 'Sumber Daya Manusia',
        ledKeys: [],
        lkpsKeys: ['ndtps', 'pdtt', 'pds3', 'pgblkl', 'rbk_dtps', 'kinerja_penelitian_dtps_ri', 
                   'kinerja_penelitian_dtps_rn', 'kinerja_pkm_dtps_ri', 'publikasi_ilmiah_dtps_ri', 
                   'publikasi_ilmiah_dtps_rn', 'rlp_dtps', 'kinerja_pkm_dtps_rn']
      },
      5: {
        name: 'Sarana, Prasarana, dan K3L',
        ledKeys: ['sarana_prasarana_akademik', 'sarana_prasarana_non_akademik', 'k3l'],
        lkpsKeys: []
      },
      6: {
        name: 'Mahasiswa dan Luaran Mahasiswa',
        ledKeys: [],
        lkpsKeys: ['rmd', 'pma', 'ripk', 'prestasi_akademik_ri', 'prestasi_akademik_rn', 
                   'prestasi_non_akademik_ri', 'prestasi_non_akademik_rn', 'ptw', 'publikasi_mahasiswa_ri', 
                   'publikasi_mahasiswa_rn', 'wt', 'kbk', 'tingkat_tempat_kerja_ri', 'tingkat_tempat_kerja_rn']
      },
      7: {
        name: 'Sistem Penjaminan Mutu',
        ledKeys: ['keberadaan_unit_spmi', 'ketersediaan_perangkat_spmi', 'keterlaksanaan_spmi', 
                  'evaluasi_capaian_kinerja', 'kepuasan_pemangku_kepentingan'],
        lkpsKeys: []
      }
    };
  }

  /**
   * Extract text from PDF buffer
   */
  async extractTextFromPDF(pdfBuffer) {
    try {
      const data = await pdfParse(pdfBuffer);
      return data.text;
    } catch (error) {
      console.error('[Gemini] Error extracting PDF:', error.message);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract text from Excel buffer (LKPS)
   */
  async extractTextFromExcel(excelBuffer) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(excelBuffer);
      
      let text = '';

      workbook.eachSheet((worksheet, sheetId) => {
        text += `\n--- Sheet: ${worksheet.name} ---\n`;
        
        worksheet.eachRow((row, rowNumber) => {
          const rowData = [];
          row.eachCell((cell, colNumber) => {
            rowData.push(cell.value || '');
          });
          text += rowData.join(',') + '\n';
        });
      });

      return text;
    } catch (error) {
      console.error('[Gemini] Error extracting Excel:', error.message);
      throw new Error('Failed to extract text from Excel');
    }
  }

  /**
   * Verify document type (LED or LKPS)
   */
  async verifyDocumentType(textContent, expectedType) {
    const textLower = textContent.toLowerCase();

    if (expectedType === 'LED') {
      const ledKeywords = ['laporan evaluasi diri', 'led', 'evaluasi diri', 'program studi', 'visi misi'];
      const hasKeywords = ledKeywords.some(keyword => textLower.includes(keyword));
      
      return {
        isValid: hasKeywords,
        confidence: hasKeywords ? 0.95 : 0.4,
        detectedType: hasKeywords ? 'LED' : 'OTHER',
        reason: hasKeywords ? 'Dokumen mengandung format LED.' : 'Tidak mengandung kata kunci LED.'
      };
    } else if (expectedType === 'LKPS') {
      const lkpsKeywords = ['laporan kinerja program studi', 'lkps', 'lam-tek', 'data dosen', 'tabel'];
      const hasKeywords = lkpsKeywords.some(keyword => textLower.includes(keyword));
      
      return {
        isValid: hasKeywords,
        confidence: hasKeywords ? 0.95 : 0.4,
        detectedType: hasKeywords ? 'LKPS' : 'OTHER',
        reason: hasKeywords ? 'Dokumen mengandung format LKPS.' : 'Tidak mengandung kata kunci LKPS.'
      };
    }

    return { isValid: false, confidence: 0.0, detectedType: 'UNKNOWN', reason: 'Unknown document type' };
  }

  /**
   * Get LED extraction prompt for specific criterion
   */
  getLEDExtractionPrompt(criterionNum, ledContentSnippet) {
    const criterion = this.criteriaConfig[criterionNum];
    if (!criterion || criterion.ledKeys.length === 0) {
      return null;
    }

    const fieldDescriptions = this.getLEDFieldDescriptions(criterionNum);

    return `# OBJECTIVE
Extract qualitative information from the LED document for Criterion ${criterionNum}: ${criterion.name}.

# LED DOCUMENT SNIPPET
\`\`\`
${ledContentSnippet}
\`\`\`

# FIELDS TO EXTRACT
${fieldDescriptions}

# OUTPUT FORMAT
Return **ONLY a single JSON object** with the key \`led_data\` containing the extracted fields.

Example:
\`\`\`json
{
  "led_data": {
    "vmts_unik_spesifik": "Visi PS adalah menjadi program studi unggul...",
    "vmts_sosialisasi": "Sosialisasi dilakukan melalui workshop..."
  }
}
\`\`\`

Return ONLY the JSON, no markdown, no explanation.`;
  }

  /**
   * Get LED field descriptions for each criterion
   */
  getLEDFieldDescriptions(criterionNum) {
    const descriptions = {
      1: `KRITERIA 1: DIFERENSIASI MISI
- vmts_unik_spesifik: Jelaskan keunikan/kekhasan VMTS
- vmts_dukungan_renstra_kurikulum: Bagaimana VMTS didukung renstra dan kurikulum
- vmts_linearitas_pt: Linearitas VMTS dengan Visi PT
- vmts_stakeholder_internal: Bukti keterlibatan stakeholder internal
- vmts_stakeholder_eksternal: Bukti keterlibatan stakeholder eksternal
- vmts_sosialisasi: Metode sosialisasi VMTS
- vmts_pemahaman: Bukti pemahaman VMTS oleh sivitas akademika
- vmts_pencapaian_konkret: Contoh pencapaian konkret VMTS`,

      2: `KRITERIA 2: AKUNTABILITAS
- tata_pamong_kelengkapan: Kelengkapan struktur organisasi dan tata pamong
- tata_pamong_governance: Penerapan Good University Governance
- komitmen_pimpinan: Bukti komitmen pimpinan UPPS
- kemampuan_manajerial: Bukti kemampuan manajerial pimpinan
- pengelolaan_keuangan: Sistem pengelolaan keuangan transparan`,

      3: `KRITERIA 3: RELEVANSI PENDIDIKAN, PENELITIAN, DAN PKM
- pemutakhiran_kurikulum: Proses pemutakhiran kurikulum
- profil_lulusan: Profil lulusan program studi
- kesesuaian_profil_cpl: Kesesuaian profil lulusan dengan CPL
- rps_kelengkapan: Kelengkapan komponen RPS
- proses_pembelajaran_efektivitas: Metode pembelajaran SCL
- suasana_akademik_pengelolaan: Pengelolaan suasana akademik
- kesesuaian_penelitian: Kesesuaian penelitian dengan roadmap
- kesesuaian_pkm: Kesesuaian PkM dengan roadmap`,

      5: `KRITERIA 5: SARANA, PRASARANA, DAN K3L
- sarana_prasarana_akademik: Deskripsi sarana prasarana akademik (lab, perpustakaan)
- sarana_prasarana_non_akademik: Sarana non-akademik (kesehatan, konseling)
- k3l: Bukti implementasi sistem K3L`,

      7: `KRITERIA 7: SISTEM PENJAMINAN MUTU
- keberadaan_unit_spmi: Nama unit penjaminan mutu
- ketersediaan_perangkat_spmi: Dokumen SPMI yang tersedia
- keterlaksanaan_spmi: Bukti keterlaksanaan siklus SPMI (PPEPP)
- evaluasi_capaian_kinerja: Mekanisme evaluasi kinerja
- kepuasan_pemangku_kepentingan: Metode pengukuran kepuasan`
    };

    return descriptions[criterionNum] || 'No LED fields for this criterion';
  }

  /**
   * Get LKPS extraction prompt for specific criterion
   */
  getLKPSExtractionPrompt(criterionNum, lkpsContentSnippet) {
    const prompts = {
      2: {
        fields: {
          bop_value: '(number) BOP = Biaya Operasional Pendidikan/Mahasiswa - Look for cell with text "BOP =" or "Biaya Operasional Pendidikan/Mahasiswa" in Sheet 4a or Tabel 4.a, extract the number value (in Rupiah)',
          dpd_total: '(number) DP = Dana Penelitian yang diperoleh dosen - Look for cell with text "DP =" or "Dana Penelitian" in Sheet 4a or Tabel 4.a, extract the total number (in Rupiah)',
          jumlah_dtps: '(number) NDTPS = Jumlah Dosen Tetap Program Studi - Look for "NDTPS" in info block or Sheet 3b1 or Tabel 3.b.1, extract the number',
          kerjasama_pendidikan: '(number) Jumlah kerjasama PENDIDIKAN',
          kerjasama_penelitian: '(number) Jumlah kerjasama PENELITIAN',
          kerjasama_pkm: '(number) Jumlah kerjasama PKM',
          kerjasama_internasional: '(number) Jumlah kerjasama INTERNASIONAL',
          kerjasama_nasional: '(number) Jumlah kerjasama NASIONAL',
          kerjasama_wilayah: '(number) Jumlah kerjasama LOKAL/WILAYAH'
        },
        example: { bop_value: 25925746.63, dpd_total: 11397400360, jumlah_dtps: 26 },
        hint: `CRITICAL: 
- For bop_value: Find text "BOP = Biaya Operasional Pendidikan/Mahasiswa" or just "BOP =" in Sheet 4a, the number is AFTER the equals sign
- For dpd_total: Find text "DP = Dana Penelitian yang diperoleh dosen" or just "DP =" in Sheet 4a, extract the large number
- For jumlah_dtps: Find "NDTPS" text in the document info section or Sheet 3b1, extract the number (usually 20-30 for Magister)
- These are exact text matches in specific sheets. DO NOT return 0 if you can't find them - look more carefully!`
      },
      3: {
        fields: {
          persentase_bahan_ajar_penelitian_pkm: '(number) Persentase bahan ajar dari penelitian (0-100)',
          pjp: '(number) Persentase pembelajaran berbasis praktik (0-100)',
          basic_sciences_sks: '(number) Jumlah SKS mata kuliah sains dasar',
          ppdmhs: '(number) Persentase praktik dalam MK sains (0-100)',
          pkdmhs: '(number) Persentase kerja praktik/magang (0-100)'
        },
        example: { persentase_bahan_ajar_penelitian_pkm: 20.0, pjp: 30 }
      },
      4: {
        fields: {
          ndtps: '(number) Jumlah DTPS - Look for "NDTPS" in info block or count rows in Tabel 3.a.1/Sheet 3b1',
          pdtt: '(number) Persentase dosen tidak tetap (0-100)',
          pds3: '(number) Persentase dosen S3 (0-100) - Hitung jumlah yang pendidikan terakhir S3/Doktor',
          pgblkl: '(number) Persentase GB + LK (0-100) - Hitung jabatan Guru Besar dan Lektor Kepala',
          rbk_dtps: '(number) IGNORE THIS - will be calculated from rata-rata SKS DTPS in Sheet 3a3 (Rata-rata jumlah SKS DTPS)',
          kinerja_penelitian_dtps_ri: '(number) Total penelitian DTPS Internasional dari Tabel 3.b.1 - SUM semua tahun (TS + TS-1 + TS-2)',
          kinerja_penelitian_dtps_rn: '(number) Total penelitian DTPS Nasional dari Tabel 3.b.1 - SUM semua tahun (TS + TS-1 + TS-2)',
          kinerja_pkm_dtps_ri: '(number) Total PkM DTPS Internasional dari Tabel 3.b.3 atau 3.b.4 - SUM semua tahun',
          publikasi_ilmiah_dtps_ri: '(number) CRITICAL: Look for Sheet 3b4 or Tabel 3.b.4, find row "Jurnal penelitian internasional bereputasi", extract the TOTAL number (sum of all years). Example: if you see 272, return 272 exactly!',
          publikasi_ilmiah_dtps_rn: '(number) CRITICAL: Look for Sheet 3b4 or Tabel 3.b.4, find row "Jurnal penelitian nasional terakreditasi", extract the TOTAL number (sum of all years). Example: if you see 211, return 211 exactly!',
          rlp_dtps: '(number) Rasio luaran penelitian per DTPS - (total publikasi / NDTPS)'
        },
        example: { ndtps: 26, pds3: 100.0, pgblkl: 82.76, rbk_dtps: 13, publikasi_ilmiah_dtps_ri: 272, publikasi_ilmiah_dtps_rn: 211 },
        hint: `CRITICAL INSTRUCTIONS:
1. NDTPS: Look for "NDTPS" text in info block (usually near top of document). If not found, COUNT rows in Tabel 3.a.1/Sheet 3b1. Expected: 20-30 for Magister.
2. PUBLIKASI (Sheet 3b4 or Tabel 3.b.4): This is THE MOST IMPORTANT!
   - Find text "Jurnal penelitian internasional bereputasi" and extract the TOTAL number next to it
   - Find text "Jurnal penelitian nasional terakreditasi" and extract the TOTAL number next to it
   - Example values: publikasi_ilmiah_dtps_ri = 272, publikasi_ilmiah_dtps_rn = 211
   - DO NOT return 0 if these numbers exist in the sheet!
3. RBK: Will be calculated separately, just return any value > 10
4. PDS3: COUNT how many dosen have "Doktor" or "S3" in Pendidikan column, then calculate percentage
5. PGBLKL: COUNT how many have "Guru Besar" or "Lektor Kepala" in Jabatan column, then calculate percentage
6. ALWAYS extract the full total if provided, don't calculate from individual years if total is given!`
      },
      6: {
        fields: {
          rmd: '(number) Rasio mahasiswa/DTPS - Dari Tabel 5.a hitung (Jumlah Mahasiswa Reguler / NDTPS)',
          pma: '(number) CRITICAL: Calculate percentage of foreign students. Look for "Mahasiswa Asing Penuh Waktu" in Sheet 2b or Tabel 2.b. Formula: (Jumlah Mahasiswa Asing / Total Mahasiswa Aktif) × 100. Example: if 3 foreign students out of 100 total, return 3.0',
          ripk: '(number) Rata-rata IPK lulusan (0.0-4.0) - Dari Tabel 5.b.1 rata-rata IPK lulusan',
          prestasi_akademik_ri: '(number) Total prestasi AKADEMIK internasional - Sum semua tahun dari Tabel 5.b.2 (TS+TS-1+TS-2)',
          prestasi_akademik_rn: '(number) Total prestasi AKADEMIK nasional - Sum semua tahun dari Tabel 5.b.2 (TS+TS-1+TS-2)',
          prestasi_non_akademik_ri: '(number) Total prestasi NON-AKADEMIK internasional - Sum semua tahun dari Tabel 5.b.2 (TS+TS-1+TS-2)',
          prestasi_non_akademik_rn: '(number) Total prestasi NON-AKADEMIK nasional - Sum semua tahun dari Tabel 5.b.2 (TS+TS-1+TS-2)',
          ptw: '(number) Persentase lulusan tepat waktu (0-100) - Dari Tabel 5.c',
          publikasi_mahasiswa_ri: '(number) Total publikasi mahasiswa internasional - Dari Tabel 5.b.3 atau publikasi di Tabel 5.b.2',
          publikasi_mahasiswa_rn: '(number) Total publikasi mahasiswa nasional - Dari Tabel 5.b.3 atau publikasi di Tabel 5.b.2',
          wt: '(number) Waktu tunggu kerja rata-rata (bulan) - Dari Tabel 5.d',
          kbk: '(number) Persentase kesesuaian bidang kerja (0-100) - Dari Tabel 5.d',
          tingkat_tempat_kerja_ri: '(number) CRITICAL: Look for Sheet 8e1 or Tabel 8.e.1, find row "Multinasional/Internasional", extract count or percentage. Expected: 0 (may be empty). DO NOT extract from wrong table!',
          tingkat_tempat_kerja_rn: '(number) CRITICAL: Look for Sheet 8e1 or Tabel 8.e.1, find row "Nasional/Berwirausaha Berizin", extract count or percentage. Expected: 0 (may be empty). DO NOT extract from wrong table!'
        },
        example: { rmd: 20, ripk: 3.51, wt: 3, kbk: 75, prestasi_akademik_ri: 5, pma: 3.0, tingkat_tempat_kerja_ri: 0, tingkat_tempat_kerja_rn: 0 },
        hint: `CRITICAL INSTRUCTIONS:
1. PMA (Sheet 2b): This is a CALCULATION!
   - Find "Mahasiswa Asing Penuh Waktu" count in Sheet 2b (example: 3 students)
   - Find "Total Mahasiswa Aktif" or "Total TS" in same sheet
   - Calculate: (Mahasiswa Asing / Total Mahasiswa) × 100
   - Example: 3 / 100 = 3.0%
   - DO NOT return raw count, return PERCENTAGE!

2. TINGKAT TEMPAT KERJA (Sheet 8e1 or Tabel 8.e.1):
   - Look SPECIFICALLY for table with header "Tingkat/Ukuran Tempat Kerja Lulusan"
   - Find row labeled "Multinasional/Internasional" → extract for tingkat_tempat_kerja_ri
   - Find row labeled "Nasional/Berwirausaha Berizin" → extract for tingkat_tempat_kerja_rn
   - If empty or 0, that's OK! Return 0.
   - DO NOT confuse with other tables like kerjasama or alumni tracking!

3. Other fields: Use standard table extraction from Tabel 5.x series`
      }
    };

    const promptData = prompts[criterionNum];
    if (!promptData) return null;

    const fieldDefinitions = Object.entries(promptData.fields)
      .map(([key, desc]) => `- \`${key}\`: ${desc}`)
      .join('\n');

    const hint = promptData.hint ? `\n# IMPORTANT HINTS\n${promptData.hint}\n` : '';

    return `# OBJECTIVE
Extract NUMERICAL data from LKPS for Criterion ${criterionNum}.

# LKPS DOCUMENT SNIPPET
\`\`\`
${lkpsContentSnippet}
\`\`\`

# FIELDS TO EXTRACT
${fieldDefinitions}
${hint}
# RULES (FOLLOW STRICTLY)
1. ALWAYS search for sheet markers like "--- Sheet: 3b4 ---", "--- Sheet: 4a ---", "--- Sheet: 8e1 ---" in the document
2. If a TOTAL column or row exists, PREFER that total instead of summing
3. If TOTAL not present, then SUM values across columns TS, TS-1, TS-2 explicitly
4. For percentage calculations (e.g. PMA), PERFORM the calculation and return percentage (0-100), NOT raw counts
5. Accept number formats with separators (e.g. "1.139.740.360" or "1139740360") and return clean numeric value
6. Only return 0 if you have exhaustively searched ALL likely locations (sheet names, table labels, header rows, column names)
7. For NDTPS: prefer explicit value; if not found, COUNT rows in table
8. Return ONLY numbers (integers or decimals)

# OUTPUT FORMAT
Return **ONLY a single JSON object** with the key \`lkps_data\`.

Example:
\`\`\`json
{
  "lkps_data": ${JSON.stringify(promptData.example)}
}
\`\`\`

Return ONLY the JSON, no markdown, no explanation.`;
  }

  /**
   * Find relevant snippet from content
   */
  findRelevantSnippet(content, keywords, windowSize = 15000) {
    const contentLower = content.toLowerCase();
    let bestIdx = -1;
    let bestKeyword = '';
    
    // Find the first matching keyword (prefer earlier occurrences)
    for (const keyword of keywords) {
      const idx = contentLower.indexOf(keyword.toLowerCase());
      if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
        bestIdx = idx;
        bestKeyword = keyword;
      }
    }

    if (bestIdx !== -1) {
      // Center the window around the keyword, but include more context after
      const beforeContext = Math.floor(windowSize * 0.2); // 20% before
      const afterContext = Math.floor(windowSize * 0.8);  // 80% after
      const start = Math.max(0, bestIdx - beforeContext);
      const end = Math.min(content.length, bestIdx + afterContext);
      
      console.log(`[Gemini] Found keyword "${bestKeyword}" at position ${bestIdx}, window: ${start}-${end}`);
      console.log(`[Gemini] Context at keyword position (±200 chars):`);
      console.log(content.substring(Math.max(0, bestIdx - 200), Math.min(content.length, bestIdx + 200)));
      console.log('---');
      
      return content.substring(start, end);
    }

    // If no keywords found, try searching in the middle section of the document
    // (skip header section which often contains repeated metadata)
    const skipHeader = Math.min(50000, Math.floor(content.length * 0.1));
    console.log(`[Gemini] No keywords found. Using middle section (skipping first ${skipHeader} chars)`);
    return content.substring(skipHeader, skipHeader + windowSize);
  }

  /**
   * Generate Gemini response
   */
  async generateGeminiResponse(prompt) {
    if (!this.model) {
      throw new Error('Gemini API not configured');
    }

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('[Gemini] Error generating content:', error.message);
      throw error;
    }
  }

  /**
   * Parse JSON response from Gemini
   */
  parseJSONResponse(responseText, dataKey) {
    try {
      const start = responseText.indexOf('{');
      const end = responseText.lastIndexOf('}');
      
      if (start === -1 || end === -1 || end < start) {
        console.error('[Gemini] Could not find valid JSON in response');
        return {};
      }

      const jsonStr = responseText.substring(start, end + 1);
      const data = JSON.parse(jsonStr);
      
      return data[dataKey] || data;
    } catch (error) {
      console.error('[Gemini] JSON parsing failed:', error.message);
      return {};
    }
  }

  /**
   * Analyze documents for LAM-TEK 2025 scoring (7 Criteria)
   */
  async analyzeDocumentsForScoring(programStudi, institusi, ledContent, lkpsContent, programType = 'S') {
    console.log(`[Gemini] Starting LAM-TEK 2025 analysis (7 Criteria) for ${programStudi} (${programType})`);

    // Check if Gemini is configured
    if (!this.genAI || !config.gemini.apiKey) {
      console.error('[Gemini] Analysis error: Gemini API not configured');
      throw new Error('Gemini API not configured. Please set GEMINI_API_KEY in .env file. Get your key from https://makersuite.google.com/app/apikey');
    }

    const finalLedData = {};
    const finalLkpsData = {};
    const errors = [];

    try {
      // Process Kriteria 4 first (SDM - to get NDTPS)
      console.log('[Gemini] [PRIORITY] Analyzing Kriteria 4: SDM for NDTPS...');
      console.log(`[Gemini] Total LKPS content length: ${lkpsContent.length} chars`);
      
      // Check if key tables exist
      const has3a1 = lkpsContent.includes('3.a.1') || lkpsContent.includes('3.a.1)') || lkpsContent.includes('Tabel 3.a.1');
      const hasDTPS = lkpsContent.toLowerCase().includes('dtps');
      const hasDosen = lkpsContent.toLowerCase().includes('dosen');
      console.log(`[Gemini] Key content check: Tabel 3.a.1=${has3a1}, DTPS=${hasDTPS}, Dosen=${hasDosen}`);
      
      // List all sheet names
      const sheetMatches = lkpsContent.match(/--- Sheet: ([^\-]+) ---/g);
      if (sheetMatches) {
        console.log(`[Gemini] Available sheets (first 20): ${sheetMatches.slice(0, 20).join(', ')}`);
      }
      
      // Find the actual data sheet (look for sheet marker "--- Sheet: 3a1 ---" or similar)
      const sheet3a1Idx = lkpsContent.indexOf('--- Sheet: 3a1 ---');
      const sheet3a1Alt = sheet3a1Idx === -1 ? lkpsContent.indexOf('Sheet: 3a1)') : sheet3a1Idx;
      const sheet3a1Final = sheet3a1Alt === -1 ? lkpsContent.indexOf('Sheet: 3.a.1') : sheet3a1Alt;
      
      console.log(`[Gemini] Searching for Sheet 3a1: idx=${sheet3a1Idx}, alt=${sheet3a1Alt}, final=${sheet3a1Final}`);
      
      // For Kriteria 4, we need multiple tables: 3a1, 3a4, 3b1, 3b2, 3b3
      // Take a large snippet that covers all these tables
      let lkpsSnippetK4;
      if (sheet3a1Final !== -1) {
        // Found the sheet, extract a LARGE section (150KB) to include 3a1, 3a4, 3b1, 3b2, 3b3
        const start = sheet3a1Final;
        const end = Math.min(lkpsContent.length, start + 150000); // Take 150KB to cover all tables
        lkpsSnippetK4 = lkpsContent.substring(start, end);
        console.log(`[Gemini] Using Sheet 3a1 and following tables from position ${start}-${end}`);
        
        // Check if we have the required tables in snippet
        const has3b1 = lkpsSnippetK4.includes('3b1') || lkpsSnippetK4.includes('3.b.1');
        const has3b2 = lkpsSnippetK4.includes('3b2') || lkpsSnippetK4.includes('3.b.2');
        const has3b3 = lkpsSnippetK4.includes('3b3') || lkpsSnippetK4.includes('3.b.3');
        console.log(`[Gemini] K4 Table check: 3b1=${has3b1}, 3b2=${has3b2}, 3b3=${has3b3}`);
      } else {
        // Fallback: search with keywords including penelitian and publikasi
        lkpsSnippetK4 = this.findRelevantSnippet(lkpsContent, [
          'NIDN/NIDK', 'Jabatan Akademik', 'Penelitian', 'Publikasi',
          'Guru Besar', 'Lektor Kepala', 'Lektor',
          'Nama Dosen Tetap', 'Pendidikan Terakhir'
        ], 100000); // Larger window
      }
      
      console.log(`[Gemini] K4 Snippet length: ${lkpsSnippetK4.length} chars`);
      console.log(`[Gemini] K4 Snippet preview: ${lkpsSnippetK4.substring(0, 500)}...`);
      
      const lkpsPromptK4 = this.getLKPSExtractionPrompt(4, lkpsSnippetK4);
      
      if (lkpsPromptK4) {
        const responseK4 = await this.generateGeminiResponse(lkpsPromptK4);
        console.log(`[Gemini] K4 Raw response: ${responseK4.substring(0, 1000)}...`);
        
        const dataK4 = this.parseJSONResponse(responseK4, 'lkps_data');
        console.log(`[Gemini] K4 Parsed data:`, JSON.stringify(dataK4, null, 2));
        
        Object.assign(finalLkpsData, dataK4);
        console.log(`[Gemini] ✓ Kriteria 4 extracted - NDTPS: ${finalLkpsData.ndtps || 0}, PDS3: ${finalLkpsData.pds3 || 0}%`);
      }

      // Process other criteria
      const criteriaToProcess = [1, 2, 3, 5, 6, 7];
      
      for (const i of criteriaToProcess) {
        const criterion = this.criteriaConfig[i];
        console.log(`[Gemini] Processing Kriteria ${i}: ${criterion.name}...`);

        await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting

        // Extract LED data if applicable
        if (criterion.ledKeys.length > 0) {
          const ledSnippet = ledContent.substring(0, 25000);
          const ledPrompt = this.getLEDExtractionPrompt(i, ledSnippet);
          
          if (ledPrompt) {
            try {
              const ledResponse = await this.generateGeminiResponse(ledPrompt);
              const ledData = this.parseJSONResponse(ledResponse, 'led_data');
              Object.assign(finalLedData, ledData);
            } catch (error) {
              errors.push(`LED extraction failed for Kriteria ${i}: ${error.message}`);
            }
          }
        }

        // Extract LKPS data if applicable
        if (criterion.lkpsKeys.length > 0) {
          let lkpsSnippet;
          
          // For Kriteria 6 (Mahasiswa), find sheets 5a, 5b, 5c, 5d
          if (i === 6) {
            // Try various sheet name patterns
            let sheet5aIdx = lkpsContent.indexOf('--- Sheet: 5a ---');
            if (sheet5aIdx === -1) sheet5aIdx = lkpsContent.indexOf('--- Sheet: 5.a ---');
            if (sheet5aIdx === -1) sheet5aIdx = lkpsContent.indexOf('Sheet: 5a');
            if (sheet5aIdx === -1) sheet5aIdx = lkpsContent.indexOf('5a.1');
            
            let sheet5bIdx = lkpsContent.indexOf('--- Sheet: 5b ---');
            if (sheet5bIdx === -1) sheet5bIdx = lkpsContent.indexOf('--- Sheet: 5.b ---');
            if (sheet5bIdx === -1) sheet5bIdx = lkpsContent.indexOf('Sheet: 5b');
            
            let sheet5cIdx = lkpsContent.indexOf('--- Sheet: 5c ---');
            if (sheet5cIdx === -1) sheet5cIdx = lkpsContent.indexOf('--- Sheet: 5.c ---');
            
            console.log(`[Gemini] K6 Sheets: 5a=${sheet5aIdx}, 5b=${sheet5bIdx}, 5c=${sheet5cIdx}`);
            
            if (sheet5aIdx !== -1) {
              // Extract from Sheet 5a to end of 5d (or 80KB)
              const start = sheet5aIdx;
              const end = Math.min(lkpsContent.length, start + 80000);
              lkpsSnippet = lkpsContent.substring(start, end);
              console.log(`[Gemini] Using Sheets 5a-5d directly from position ${start}-${end}`);
            } else {
              // Fallback
              lkpsSnippet = this.findRelevantSnippet(lkpsContent, [
                'Jumlah Mahasiswa Aktif', 'Mahasiswa Asing',
                'Rata-rata IPK', 'IPK Lulusan',
                'Prestasi', 'Tingkat', 'Lokal', 'Nasional', 'Internasional',
                'Masa Studi', 'Waktu Tunggu'
              ], 35000);
            }
          } else {
            // Other criteria use keyword search
            const keywords = i === 2 ? ['Butir 9', 'Butir 10', 'Tabel 4', 'Kerjasama', 'BOP', 'Dana Penelitian'] :
                            i === 3 ? ['Butir 14', 'Butir 17', 'praktikum', 'Bahan Ajar', 'Pembelajaran'] : [];
            const windowSize = 15000;
            lkpsSnippet = this.findRelevantSnippet(lkpsContent, keywords, windowSize);
          }
          
          const lkpsPrompt = this.getLKPSExtractionPrompt(i, lkpsSnippet);
          
          if (lkpsPrompt) {
            try {
              const lkpsResponse = await this.generateGeminiResponse(lkpsPrompt);
              const lkpsData = this.parseJSONResponse(lkpsResponse, 'lkps_data');
              Object.assign(finalLkpsData, lkpsData);
            } catch (error) {
              errors.push(`LKPS extraction failed for Kriteria ${i}: ${error.message}`);
            }
          }
        }

        console.log(`[Gemini] ✓ Kriteria ${i} completed`);
      }

      console.log(`[Gemini] Extraction complete! LED fields: ${Object.keys(finalLedData).length}, LKPS fields: ${Object.keys(finalLkpsData).length}`);

      return {
        led_data: finalLedData,
        lkps_data: finalLkpsData,
        scoring_readiness: {
          ready_for_lamtek_scoring: errors.length === 0,
          error: errors.length > 0 ? errors.join('; ') : null
        }
      };

    } catch (error) {
      console.error('[Gemini] Analysis error:', error.message);
      return {
        led_data: finalLedData,
        lkps_data: finalLkpsData,
        scoring_readiness: {
          ready_for_lamtek_scoring: false,
          error: error.message
        }
      };
    }
  }
}

module.exports = new GeminiService();
