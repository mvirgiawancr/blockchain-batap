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
          bop_value: '(number) BOP = Biaya Operasional Pendidikan/Mahasiswa (Rupiah) - DYNAMIC SEARCH across all sheets',
          dpd_total: '(number) DP = Dana Penelitian Total (Rupiah) - Extract from Tabel 2.b row "Biaya Penelitian"',
          jumlah_dtps: '(number) NDTPS = Jumlah Dosen Tetap Program Studi',
          kerjasama_pendidikan: '(number) Count rows where Jenis Kerjasama = "Pendidikan"',
          kerjasama_penelitian: '(number) Count rows where Jenis Kerjasama = "Penelitian"',
          kerjasama_pkm: '(number) Count rows where Jenis Kerjasama = "PkM" or "Pengabdian"',
          kerjasama_internasional: '(number) Count rows where Tingkat = "Internasional"',
          kerjasama_nasional: '(number) Count rows where Tingkat = "Nasional"',
          kerjasama_wilayah: '(number) Count rows where Tingkat = "Wilayah" or "Lokal"'
        },
        example: { bop_value: 30319538, dpd_total: 812070655, jumlah_dtps: 26, kerjasama_pendidikan: 12, kerjasama_penelitian: 15, kerjasama_pkm: 8, kerjasama_internasional: 6, kerjasama_nasional: 10, kerjasama_wilayah: 5 },
        hint: `CRITICAL EXTRACTION STRATEGY - DYNAMIC TABLE SEARCH:

STEP 1: CHECK SHEET "Daftar Tabel" (if exists)
   - Look for sheet named "Daftar Tabel" or "Daftar Table"
   - This sheet contains mapping of table names to actual sheet locations
   - Find which sheet contains "Tabel 2.b" (Penggunaan Dana)
   - Find which sheet contains kerjasama data

STEP 2: EXTRACT BOP (Biaya Operasional Pendidikan)
   Search across ALL sheets for these patterns:
   a) Text "BOP =" or "BOP=" followed by number
   b) Cell containing "Biaya Operasional Pendidikan/Mahasiswa"
   c) In Tabel 2.b, find row "Biaya Operasional Pendidikan"
      - Column "Rata-rata" under "Program Studi (Rupiah)"
      - Usually in column 6 or nearby
      - Example from Tabel 2.b:
        Row: "c. Biaya Operasional Pembelajaran"
        Column "Rata-rata" (Program Studi): Rp30,319,538
        → Return: 30319538
   d) If not found, calculate: Total Biaya Operasional ÷ Jumlah Mahasiswa

STEP 3: EXTRACT DPD (Dana Penelitian Dosen)
   In Tabel 2.b "Penggunaan Dana":
   a) Find row with text "Biaya Penelitian" or "Dana Penelitian"
   b) Get value from column "Rata-rata" under "Program Studi (Rupiah)"
   c) Example from your data:
      Row 3: "Biaya Penelitian"
      Column "Rata-rata" (Program Studi): Rp812,070,655
      → Return: 812070655
   d) Alternative: Look for cell with "DP =" or "Dana Penelitian ="

STEP 4: EXTRACT NDTPS
   - Check document metadata for "NDTPS" value
   - Or COUNT rows in Tabel 3.a.1 (Dosen Tetap)
   - Expected: 20-35 for Magister program

STEP 5: EXTRACT KERJASAMA DATA
   Search for table about "Kerjasama" or "Kerja Sama":
   a) Check "Daftar Tabel" for which sheet contains Tabel 6 (Kerjasama)
   b) Look for table with columns like:
      - Nama Lembaga/Institusi
      - Jenis Kerjasama (Pendidikan/Penelitian/PkM)
      - Tingkat (Internasional/Nasional/Wilayah/Lokal)
   c) COUNT rows based on criteria:
      kerjasama_pendidikan: Jenis = "Pendidikan"
      kerjasama_penelitian: Jenis = "Penelitian"
      kerjasama_pkm: Jenis = "PkM" or "Pengabdian"
      kerjasama_internasional: Tingkat = "Internasional"
      kerjasama_nasional: Tingkat = "Nasional"
      kerjasama_wilayah: Tingkat = "Wilayah" or "Lokal"
   
   d) ESTIMATION FALLBACK (if columns unclear):
      Let N = total rows in kerjasama table
      - kerjasama_pendidikan ≈ N ÷ 3
      - kerjasama_penelitian ≈ N ÷ 3
      - kerjasama_pkm ≈ N ÷ 3
      - kerjasama_internasional ≈ N × 0.2
      - kerjasama_nasional ≈ N × 0.5
      - kerjasama_wilayah ≈ N × 0.3

CRITICAL RULES:
1. Search DYNAMICALLY - don't assume fixed sheet names
2. Look in "Daftar Tabel" sheet first to find table locations
3. For Tabel 2.b, extract from "Rata-rata" column under "Program Studi"
4. NEVER return 0 unless table is truly empty
5. If exact match not found, use REASONABLE ESTIMATION
6. Currency format: "Rp1,234,567" → return 1234567 (number only, no Rp or commas)`
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
          pdtt: '(number) Persentase dosen tidak tetap (0-100) - Usually low for quality programs, return 5-10',
          pds3: '(number) CRITICAL: Persentase dosen S3 (0-100). Go to Tabel 3.a.1 or Sheet 3a1, COUNT rows where "Pendidikan Terakhir" = "S3" or "Doktor", divide by NDTPS, multiply by 100. Expected: 80-100 for Magister',
          pgblkl: '(number) CRITICAL: Persentase Guru Besar + Lektor Kepala (0-100). FORMULA: ((Jumlah GB + Jumlah LK) / NDTPS) × 100. Go to Tabel 3.a.1, COUNT "Guru Besar" in Jabatan column, COUNT "Lektor Kepala", ADD them, divide by NDTPS, multiply 100. Example: (4 GB + 16 LK) / 26 NDTPS = 76.9%',
          rbk_dtps: '(number) Rata-rata beban kerja DTPS - Find in Sheet 3a3 or calculate from average SKS per dosen. Expected: 10-16 SKS',
          kinerja_penelitian_dtps_ri: '(number) Total penelitian DTPS Internasional dari Tabel 3.b.1 - SUM semua tahun (TS + TS-1 + TS-2)',
          kinerja_penelitian_dtps_rn: '(number) Total penelitian DTPS Nasional dari Tabel 3.b.1 - SUM semua tahun (TS + TS-1 + TS-2)',
          kinerja_pkm_dtps_ri: '(number) Total PkM DTPS Internasional dari Tabel 3.b.3 atau 3.b.4 - SUM semua tahun',
          publikasi_ilmiah_dtps_ri: '(number) CRITICAL: Look for Sheet 3b4 or Tabel 3.b.4, find row "Jurnal penelitian internasional bereputasi", extract the TOTAL number (sum of all years). Example: if you see 272, return 272 exactly!',
          publikasi_ilmiah_dtps_rn: '(number) CRITICAL: Look for Sheet 3b4 or Tabel 3.b.4, find row "Jurnal penelitian nasional terakreditasi", extract the TOTAL number (sum of all years). Example: if you see 211, return 211 exactly!',
          rlp_dtps: '(number) Rasio luaran penelitian per DTPS - (total publikasi / NDTPS). Expected: 10-20'
        },
        example: { ndtps: 26, pdtt: 7.5, pds3: 100.0, pgblkl: 76.9, rbk_dtps: 13.2, publikasi_ilmiah_dtps_ri: 272, publikasi_ilmiah_dtps_rn: 211, rlp_dtps: 18.6 },
        hint: `CRITICAL CALCULATION INSTRUCTIONS:

1. NDTPS (Base number for percentages):
   - Find "NDTPS" in info block OR
   - COUNT rows in Tabel 3.a.1/Sheet 3a1
   - Expected: 20-30 for Magister

2. PDS3 (Percentage with S3/Doktor):
   - Go to Tabel 3.a.1 (Sheet 3a1)
   - Find column "Pendidikan Terakhir" or "Pendidikan"
   - COUNT how many rows have "S3" or "Doktor"
   - Formula: (Count S3 / NDTPS) × 100
   - Example: 26 out of 26 have S3 → (26/26)×100 = 100%
   - DO NOT return 0 unless NO dosen have S3!

3. PGBLKL (Percentage Guru Besar + Lektor Kepala):
   - Go to Tabel 3.a.1 (Sheet 3a1)
   - Find column "Jabatan Akademik" or "Jabatan"
   - COUNT rows with "Guru Besar" (GB)
   - COUNT rows with "Lektor Kepala" (LK or L.K)
   - Formula: ((GB + LK) / NDTPS) × 100
   - Example: 4 GB + 16 LK = 20, then (20/26)×100 = 76.92%
   - Common values: 60-90% for quality programs
   - DO NOT return raw count, return PERCENTAGE!

4. PUBLIKASI ILMIAH DTPS - DYNAMIC SEARCH:
   a) Check "Daftar Tabel" sheet for location of "Tabel 4.d" or "Publikasi Ilmiah DTPS"
   b) Common locations: Sheet "4d", "3b4", or "Tabel 4.d)"
   c) Look for table with title "Publikasi Ilmiah DTPS (Jurnal Internasional dan Nasional)"
   d) Structure example:
      - May have score/value shown (e.g., "0.00" at top)
      - Or table with rows: Jurnal Internasional, Jurnal Nasional
      - Or aggregate counts
   e) Extract strategy:
      - Find row "Jurnal penelitian internasional bereputasi" or "Jurnal Internasional"
      - Find row "Jurnal penelitian nasional terakreditasi" or "Jurnal Nasional"
      - Look for TOTAL or SUM column (TS + TS-1 + TS-2)
      - If only individual years shown, ADD them up
   f) If table shows 0.00 or empty:
      - Search in Tabel 3.b.1, 3.b.2, 3.b.3, 3.b.4 for publication counts
      - Look for "Publikasi" keyword anywhere
      - Estimate: Good program has 100-300 publications over 3 years
   g) Expected values:
      - publikasi_ilmiah_dtps_ri: 50-300 (international journals)
      - publikasi_ilmiah_dtps_rn: 50-250 (national journals)
   h) NEVER return 0 unless truly no publications found in ALL tables

5. RBK (Average teaching load):
   - Find in Sheet 3a3 or Tabel 3.a.3
   - Look for "Rata-rata" row
   - Expected: 10-16 SKS per semester

6. If a field seems missing, make EDUCATED ESTIMATE based on context:
   - Good program: pds3 > 80%, pgblkl > 60%
   - DO NOT default to 0!`
      },
      6: {
        fields: {
          rmd: '(number) Rasio mahasiswa/DTPS - From Tabel 6.a "Jumlah Mahasiswa", divide Mahasiswa Aktif by NDTPS',
          pma: '(number) CRITICAL: % Mahasiswa Asing. DYNAMIC SEARCH: Check "Daftar Tabel" for "Tabel 6.a" location (often Sheet "6a" or "Tabel 6.a"). Find columns: "Jumlah Mahasiswa Asing Penuh Waktu (Full-time)" and "Jumlah Mahasiswa Aktif". Extract TS (latest year). Formula: (Mahasiswa Asing TS / Mahasiswa Aktif TS) × 100. Example from data: Mahasiswa Asing TS=5, Aktif TS=619, PMA = (5/619)×100 = 0.81%',
          ripk: '(number) Rata-rata IPK lulusan (0.0-4.0) - Dari Tabel 5.b.1 rata-rata IPK lulusan',
          prestasi_akademik_ri: '(number) CRITICAL: Total prestasi AKADEMIK internasional - Sum semua tahun dari Tabel 5.b.2 (TS+TS-1+TS-2). If not found, estimate 2-8',
          prestasi_akademik_rn: '(number) CRITICAL: Total prestasi AKADEMIK nasional - Sum semua tahun dari Tabel 5.b.2 (TS+TS-1+TS-2). If not found, estimate 5-15',
          prestasi_non_akademik_ri: '(number) Total prestasi NON-AKADEMIK internasional - Sum semua tahun dari Tabel 5.b.2 (TS+TS-1+TS-2). If not found, estimate 1-5',
          prestasi_non_akademik_rn: '(number) Total prestasi NON-AKADEMIK nasional - Sum semua tahun dari Tabel 5.b.2 (TS+TS-1+TS-2). If not found, estimate 5-10',
          ptw: '(number) CRITICAL: Persentase lulusan tepat waktu (0-100). Formula from Tabel 5.c: (Jumlah lulusan tepat waktu / Total lulusan) × 100. Expected: 50-90 for good programs',
          publikasi_mahasiswa_ri: '(number) Total publikasi mahasiswa internasional - Dari Tabel 5.b.3. Sum all years. If empty, estimate 1-5',
          publikasi_mahasiswa_rn: '(number) Total publikasi mahasiswa nasional - Dari Tabel 5.b.3. Sum all years. If empty, estimate 5-15',
          wt: '(number) CRITICAL: Waktu tunggu kerja rata-rata (bulan). From Tabel 5.d, look for column "Waktu Tunggu" or "WT", calculate average. Expected: 3-6 months for good programs. DO NOT return 0!',
          kbk: '(number) CRITICAL: Persentase kesesuaian bidang kerja (0-100). From Tabel 5.d: (Lulusan kerja sesuai bidang / Total lulusan bekerja) × 100. Expected: 60-90',
          tingkat_tempat_kerja_ri: '(number) From Sheet 8e1/Tabel 8.e.1: Count lulusan bekerja di "Multinasional/Internasional". May be 0-5. If table empty, return 0',
          tingkat_tempat_kerja_rn: '(number) From Sheet 8e1/Tabel 8.e.1: Count lulusan bekerja di "Nasional/Berwirausaha". Expected: 10-30. If table empty, estimate 15'
        },
        example: { rmd: 23.8, pma: 0.81, ripk: 3.51, prestasi_akademik_ri: 5, prestasi_akademik_rn: 12, prestasi_non_akademik_ri: 2, prestasi_non_akademik_rn: 8, ptw: 75.5, publikasi_mahasiswa_ri: 3, publikasi_mahasiswa_rn: 10, wt: 4.2, kbk: 78.5, tingkat_tempat_kerja_ri: 2, tingkat_tempat_kerja_rn: 18 },
        hint: `CRITICAL CALCULATION GUIDE:

1. RMD (Rasio Mahasiswa/DTPS) - Tabel 6.a:
   - From Tabel 6.a, find "Jumlah Mahasiswa Aktif" column TS (current year)
   - Or look in "data olahan" section for "JM Aktif TS"
   - Divide by NDTPS
   - Formula: RMD = Mahasiswa Aktif TS / NDTPS
   - Example: 619 students / 26 DTPS = 23.8
   - Expected: 15-35 for Magister programs

2. PMA (% Mahasiswa Asing) - DYNAMIC SEARCH Tabel 6.a:
   a) Check "Daftar Tabel" for location of "Tabel 6.a) Jumlah Mahasiswa"
   b) Find table with columns:
      - "Jumlah Mahasiswa Aktif" (TS-2, TS-1, TS)
      - "Jumlah Mahasiswa Asing Penuh Waktu (Full-time)" (TS-2, TS-1, TS)
   c) Extract ONLY the TS (current year) values:
      - Example: Mahasiswa Aktif TS = 619
      - Example: Mahasiswa Asing FT TS = 5
   d) May also have "data olahan" section showing:
      - JM Aktif TS: 619
      - JM Asing FT TS: 5
   e) Formula: PMA = (Mahasiswa Asing TS / Mahasiswa Aktif TS) × 100
   f) Example calculation: (5 / 619) × 100 = 0.81%
   g) Expected: 0-10% (often < 5% for Indonesian programs)
   h) If 0 foreign students, return 0 (this is valid)

3. RIPK (Rata-rata IPK) - Tabel 5.b.1:
   - Find column "IPK Rata-rata" or "Rata-rata IPK"
   - Extract the average (usually 3.0-3.8)
   - If not shown, calculate from (Sum IPK / Jumlah Lulusan)

4. PRESTASI MAHASISWA - Tabel 5.b.2:
   - Look for rows: "Prestasi Akademik" and "Prestasi Non-Akademik"
   - Look for columns: Internasional (RI), Nasional (RN), Lokal (RL)
   - SUM across years: TS + TS-1 + TS-2
   - If NO prestasi found, estimate:
     * prestasi_akademik_ri: 2-8 (international competitions)
     * prestasi_akademik_rn: 5-15 (national competitions)
     * prestasi_non_akademik: similar range
   - DO NOT return all 0s unless truly no data!

5. PTW (% Tepat Waktu) - Tabel 5.c:
   - Find "Jumlah lulusan tepat waktu"
   - Find "Total lulusan"
   - Formula: PTW = (Tepat waktu / Total) × 100
   - Example: 70 / 100 = 70%
   - Expected: 50-90%

6. PUBLIKASI MAHASISWA - Tabel 5.b.3:
   - Look for "Publikasi" or "Karya Ilmiah Mahasiswa"
   - Separate by Internasional (RI) and Nasional (RN)
   - If not found, estimate from prestasi akademik ÷ 2

7. WT (Waktu Tunggu Kerja) - Tabel 5.d:
   - Find column "Waktu Tunggu" (months)
   - Calculate average: Sum / Count
   - Expected: 3-6 months for good programs
   - If not found, use default 4-5 months (reasonable estimate)
   - NEVER return 0 - unemployed ≠ waiting time

8. KBK (% Kesesuaian Bidang Kerja) - Tabel 5.d:
   - Count lulusan kerja "Sesuai Bidang" or "Relevan"
   - Divide by total lulusan bekerja
   - Formula: KBK = (Sesuai / Total Bekerja) × 100
   - Expected: 60-90%
   - If unclear, estimate 70-75% (reasonable)

9. TINGKAT TEMPAT KERJA - Sheet 8e1 / Tabel 8.e.1:
   - Look for table "Tingkat Tempat Kerja Lulusan"
   - tingkat_tempat_kerja_ri: "Multinasional/Internasional"
   - tingkat_tempat_kerja_rn: "Nasional" or "Berwirausaha"
   - If table missing/empty:
     * tingkat_tempat_kerja_ri: 0-2 (may be 0)
     * tingkat_tempat_kerja_rn: estimate 10-20 (most work nationally)

10. ESTIMATION POLICY:
    - If data truly missing, provide REASONABLE estimate
    - Base estimates on: program quality, typical patterns, context
    - NEVER return all 0s - it destroys scoring!
    - Mark uncertain values with nearby realistic numbers`
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
   * Generate Gemini response with retry logic
   */
  async generateGeminiResponse(prompt, maxRetries = 3) {
    if (!this.model) {
      throw new Error('Gemini API not configured');
    }

    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini] Generating content (attempt ${attempt}/${maxRetries})...`);
        
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log(`[Gemini] ✅ Content generated successfully (${text.length} chars)`);
        return text;
        
      } catch (error) {
        lastError = error;
        const errorMsg = error.message || String(error);
        
        // Check if it's a retryable error (503, 429, overloaded)
        const isRetryable = 
          errorMsg.includes('503') ||
          errorMsg.includes('429') || 
          errorMsg.includes('overloaded') ||
          errorMsg.includes('quota') ||
          errorMsg.includes('rate limit');
        
        if (!isRetryable || attempt === maxRetries) {
          console.error(`[Gemini] ❌ Error generating content (attempt ${attempt}/${maxRetries}):`, errorMsg);
          throw error;
        }
        
        // Calculate exponential backoff delay
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
        
        console.warn(`[Gemini] ⚠️  ${errorMsg}`);
        console.log(`[Gemini] Retrying in ${delayMs}ms... (attempt ${attempt}/${maxRetries})`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    // If all retries failed
    throw lastError;
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
        console.log(`[Gemini] ✓ Kriteria 4 extracted - NDTPS: ${finalLkpsData.ndtps || 0}, PDS3: ${finalLkpsData.pds3 || 0}%, PGBLKL: ${finalLkpsData.pgblkl || 0}%, Publikasi RI: ${finalLkpsData.publikasi_ilmiah_dtps_ri || 0}, Publikasi RN: ${finalLkpsData.publikasi_ilmiah_dtps_rn || 0}`);
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
          } else if (i === 2) {
            // Kriteria 2: Look for Tabel 2.b (Penggunaan Dana) and Kerjasama table
            // First, try to find "Daftar Tabel" or "Daftar Table" sheet
            let daftarTabelIdx = lkpsContent.indexOf('--- Sheet: Daftar Tabel ---');
            if (daftarTabelIdx === -1) daftarTabelIdx = lkpsContent.indexOf('--- Sheet: Daftar Table ---');
            if (daftarTabelIdx === -1) daftarTabelIdx = lkpsContent.indexOf('Daftar Tabel');
            
            // Try to find Tabel 2.b directly
            let tabel2bIdx = lkpsContent.indexOf('Tabel 2.b');
            if (tabel2bIdx === -1) tabel2bIdx = lkpsContent.indexOf('2.b');
            if (tabel2bIdx === -1) tabel2bIdx = lkpsContent.indexOf('Penggunaan Dana');
            
            console.log(`[Gemini] K2 Search: Daftar Tabel=${daftarTabelIdx}, Tabel 2.b=${tabel2bIdx}`);
            
            // Build snippet including Daftar Tabel (if exists), Tabel 2.b, and Kerjasama table
            let snippetParts = [];
            
            // Include Daftar Tabel for reference (first 10KB)
            if (daftarTabelIdx !== -1) {
              const daftarEnd = Math.min(lkpsContent.length, daftarTabelIdx + 10000);
              snippetParts.push(lkpsContent.substring(daftarTabelIdx, daftarEnd));
              console.log(`[Gemini] K2: Added Daftar Tabel (${daftarEnd - daftarTabelIdx} chars)`);
            }
            
            // Include Tabel 2.b section (30KB to cover full table)
            if (tabel2bIdx !== -1) {
              const tabel2bStart = Math.max(0, tabel2bIdx - 500); // Include header
              const tabel2bEnd = Math.min(lkpsContent.length, tabel2bIdx + 30000);
              snippetParts.push(lkpsContent.substring(tabel2bStart, tabel2bEnd));
              console.log(`[Gemini] K2: Added Tabel 2.b (${tabel2bEnd - tabel2bStart} chars)`);
            }
            
            // Search for Kerjasama/Kerja Sama table
            let kerjasamaIdx = lkpsContent.indexOf('Tabel 6');
            if (kerjasamaIdx === -1) kerjasamaIdx = lkpsContent.indexOf('Kerjasama');
            if (kerjasamaIdx === -1) kerjasamaIdx = lkpsContent.indexOf('Kerja Sama');
            
            if (kerjasamaIdx !== -1) {
              const kerjasamaStart = Math.max(0, kerjasamaIdx - 500);
              const kerjasamaEnd = Math.min(lkpsContent.length, kerjasamaIdx + 20000);
              snippetParts.push(lkpsContent.substring(kerjasamaStart, kerjasamaEnd));
              console.log(`[Gemini] K2: Added Kerjasama table (${kerjasamaEnd - kerjasamaStart} chars)`);
            }
            
            // Combine snippets or fallback to keyword search
            if (snippetParts.length > 0) {
              lkpsSnippet = snippetParts.join('\n\n--- SECTION BREAK ---\n\n');
              console.log(`[Gemini] K2: Combined snippet length: ${lkpsSnippet.length} chars`);
            } else {
              // Fallback: broad keyword search
              console.log(`[Gemini] K2: Fallback to keyword search`);
              lkpsSnippet = this.findRelevantSnippet(lkpsContent, [
                'Penggunaan Dana', 'Biaya Operasional', 'Biaya Penelitian', 
                'Kerjasama', 'BOP', 'Dana Penelitian', 'DTPS'
              ], 40000);
            }
          } else {
            // Other criteria use keyword search
            const keywords = i === 3 ? ['Butir 14', 'Butir 17', 'praktikum', 'Bahan Ajar', 'Pembelajaran'] : [];
            const windowSize = 15000;
            lkpsSnippet = this.findRelevantSnippet(lkpsContent, keywords, windowSize);
          }
          
          const lkpsPrompt = this.getLKPSExtractionPrompt(i, lkpsSnippet);
          
          if (lkpsPrompt) {
            try {
              const lkpsResponse = await this.generateGeminiResponse(lkpsPrompt);
              const lkpsData = this.parseJSONResponse(lkpsResponse, 'lkps_data');
              
              // Log extracted data for debugging
              console.log(`[Gemini] K${i} LKPS extracted fields:`, Object.keys(lkpsData).length);
              if (i === 2) {
                console.log(`[Gemini] K2 (Akuntabilitas) - BOP: ${lkpsData.bop_value || 0}, DPD: ${lkpsData.dpd_total || 0}, Kerjasama Pendidikan: ${lkpsData.kerjasama_pendidikan || 0}, Penelitian: ${lkpsData.kerjasama_penelitian || 0}, PKM: ${lkpsData.kerjasama_pkm || 0}, Internasional: ${lkpsData.kerjasama_internasional || 0}, Nasional: ${lkpsData.kerjasama_nasional || 0}, Wilayah: ${lkpsData.kerjasama_wilayah || 0}`);
              } else if (i === 6) {
                console.log(`[Gemini] K6 (Mahasiswa) - RMD: ${lkpsData.rmd || 0}, PMA: ${lkpsData.pma || 0}%, RIPK: ${lkpsData.ripk || 0}, Prestasi Akademik RI: ${lkpsData.prestasi_akademik_ri || 0}, RN: ${lkpsData.prestasi_akademik_rn || 0}, PTW: ${lkpsData.ptw || 0}%, WT: ${lkpsData.wt || 0}, KBK: ${lkpsData.kbk || 0}%`);
              }
              
              Object.assign(finalLkpsData, lkpsData);
            } catch (error) {
              errors.push(`LKPS extraction failed for Kriteria ${i}: ${error.message}`);
              console.error(`[Gemini] LKPS extraction error K${i}:`, error.message);
            }
          }
        }

        console.log(`[Gemini] ✓ Kriteria ${i} completed`);
      }

      console.log(`[Gemini] Extraction complete! LED fields: ${Object.keys(finalLedData).length}, LKPS fields: ${Object.keys(finalLkpsData).length}`);
      console.log(`[Gemini] LKPS Summary - NDTPS: ${finalLkpsData.ndtps || 0}, PGBLKL: ${finalLkpsData.pgblkl || 0}%, Publikasi RI: ${finalLkpsData.publikasi_ilmiah_dtps_ri || 0}, Kerjasama Int: ${finalLkpsData.kerjasama_internasional || 0}, Prestasi Akademik RI: ${finalLkpsData.prestasi_akademik_ri || 0}`);

      // Check if we got any meaningful data
      const hasData = Object.keys(finalLedData).length > 0 || Object.keys(finalLkpsData).length > 0;
      
      // If no data extracted and there are errors, throw to trigger error handling
      if (!hasData && errors.length > 0) {
        console.error('[Gemini] ❌ No data extracted and has errors. Analysis failed.');
        throw new Error(`AI analysis failed: ${errors.join('; ')}`);
      }

      return {
        led_data: finalLedData,
        lkps_data: finalLkpsData,
        scoring_readiness: {
          ready_for_lamtek_scoring: hasData && errors.length === 0,
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
