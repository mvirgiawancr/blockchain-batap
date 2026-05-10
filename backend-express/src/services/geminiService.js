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

    // Global rate limiting for Free Tier (2 RPM = 1 request per 30 seconds)
    this.lastRequestTime = 0;
    this.minRequestIntervalMs = 35000; // 35 seconds between requests (safe margin for 2 RPM)

    // LAM-TEK 2025: 7 Kriteria Configuration with 53 Butir (Instrumen 2025)
    // Bobot per program type: S=Sarjana, M=Magister, D=Doktor
    this.criteriaConfig = {
      1: {
        name: 'Diferensiasi Misi',
        // Sum of butir 1-3 for program S: 1.14+0.69+0.22 = 2.05
        bobot: { S: 2.05, M: 1.82, D: 1.82, STr: 1.98, MTr: 1.79, DTr: 1.79, PPI: 2.07 },
        butir: [
          { code: '1.1', name: 'Kekhasan VMTS', bobot: { S: 1.14, M: 0.97, D: 0.97, STr: 1.05, MTr: 0.94, DTr: 0.94, PPI: 1.12 } },
          { code: '1.2', name: 'Mekanisme Penyusunan VMTS', bobot: { S: 0.69, M: 0.63, D: 0.63, STr: 0.64, MTr: 0.63, DTr: 0.63, PPI: 0.67 } },
          { code: '1.3', name: 'Tingkat Pemahaman dan Pencapaian VMTS', bobot: { S: 0.22, M: 0.22, D: 0.22, STr: 0.27, MTr: 0.22, DTr: 0.22, PPI: 0.28 } }
        ],
        ledKeys: ['vmts_unik_spesifik', 'vmts_dukungan_renstra_kurikulum', 'vmts_stakeholder', 'vmts_pemahaman', 'vmts_pencapaian'],
        lkpsKeys: []
      },
      2: {
        name: 'Akuntabilitas',
        // Sum of butir 4-11 for program S
        bobot: { S: 7.06, M: 7.06, D: 7.06, STr: 6.68, MTr: 6.47, DTr: 6.47, PPI: 7.72 },
        butir: [
          { code: '2.1', name: 'Sistem Tata Pamong - Struktur Organisasi', bobot: { S: 1.18, M: 1.01, D: 1.01, STr: 1.10, MTr: 0.98, DTr: 0.98, PPI: 1.17 } },
          { code: '2.2', name: 'Sistem Tata Pamong - Good Governance', bobot: { S: 0.58, M: 0.53, D: 0.53, STr: 0.54, MTr: 0.54, DTr: 0.54, PPI: 0.57 } },
          { code: '2.3', name: 'Komitmen Pimpinan', bobot: { S: 0.32, M: 0.29, D: 0.29, STr: 0.30, MTr: 0.30, DTr: 0.30, PPI: 0.38 } },
          { code: '2.4', name: 'Kemampuan Manajerial', bobot: { S: 0.62, M: 0.61, D: 0.61, STr: 0.57, MTr: 0.56, DTr: 0.56, PPI: 0.77 } },
          { code: '2.5', name: 'Relevansi Kerja Sama', bobot: { S: 0.52, M: 0.78, D: 0.78, STr: 0.46, MTr: 0.47, DTr: 0.47, PPI: 0.64 } },
          { code: '2.6', name: 'Kerja Sama Aktif (3D)', bobot: { S: 1.01, M: 1.57, D: 1.57, STr: 0.93, MTr: 1.07, DTr: 1.07, PPI: 1.30 } },
          { code: '2.7', name: 'Pelaksanaan Kerja Sama', bobot: { S: 1.01, M: 1.39, D: 1.39, STr: 1.02, MTr: 1.07, DTr: 1.07, PPI: 0.82 } },
          { code: '2.8', name: 'Pengelolaan Keuangan', bobot: { S: 0.68, M: 0.48, D: 0.48, STr: 0.65, MTr: 0.48, DTr: 0.48, PPI: 0.86 } },
          { code: '2.9', name: 'BOP - Biaya Operasional Pendidikan', bobot: { S: 0.54, M: 0.48, D: 0.48, STr: 0.50, MTr: 0.48, DTr: 0.48, PPI: 0.58 } },
          { code: '2.10', name: 'DPD - Dana Penelitian DTPS', bobot: { S: 0.36, M: 0.24, D: 0.24, STr: 0.33, MTr: 0.24, DTr: 0.24, PPI: 0.37 } },
          { code: '2.11', name: 'DPkMD - Dana PkM DTPS', bobot: { S: 0.24, M: 0.24, D: 0.24, STr: 0.28, MTr: 0.28, DTr: 0.28, PPI: 0.26 } }
        ],
        ledKeys: ['tata_pamong_kelengkapan', 'tata_pamong_governance', 'komitmen_pimpinan', 'kemampuan_manajerial', 'relevansi_kerjasama', 'pengelolaan_keuangan'],
        lkpsKeys: ['bop_value', 'dpd_total', 'dpkm_total', 'jumlah_dtps', 'kerjasama_internasional', 'kerjasama_nasional', 'kerjasama_wilayah']
      },
      3: {
        name: 'Relevansi Pendidikan, Penelitian, dan PkM',
        // Sum of butir 12-24 for program S
        bobot: { S: 22.45, M: 22.45, D: 22.45, STr: 21.96, MTr: 21.56, DTr: 21.56, PPI: 22.69 },
        butir: [
          { code: '3.1', name: 'Pemutakhiran Kurikulum', bobot: { S: 1.07, M: 0.93, D: 0.93, STr: 0.99, MTr: 0.89, DTr: 0.89, PPI: 1.02 } },
          { code: '3.2', name: 'Profil Lulusan dan CPL', bobot: { S: 2.14, M: 1.86, D: 1.86, STr: 1.99, MTr: 1.79, DTr: 1.79, PPI: 2.04 } },
          { code: '3.3', name: 'Kesesuaian dan Tinjauan CPL', bobot: { S: 0.91, M: 0.89, D: 0.89, STr: 0.82, MTr: 0.86, DTr: 0.86, PPI: 1.02 } },
          { code: '3.4', name: 'Kualitas Input Mahasiswa', bobot: { S: 0.68, M: 0.52, D: 0.52, STr: 0.76, MTr: 0.84, DTr: 0.84, PPI: 0.79 } },
          { code: '3.5', name: 'RPS - Kelengkapan', bobot: { S: 1.54, M: 1.52, D: 1.52, STr: 1.48, MTr: 1.40, DTr: 1.40, PPI: 1.57 } },
          { code: '3.6', name: 'RPS - Tinjauan Rutin', bobot: { S: 1.05, M: 0.95, D: 0.95, STr: 1.02, MTr: 0.93, DTr: 0.93, PPI: 0.95 } },
          { code: '3.7', name: 'Proses Pembelajaran', bobot: { S: 1.05, M: 0.95, D: 0.95, STr: 1.02, MTr: 0.93, DTr: 0.93, PPI: 1.02 } },
          { code: '3.8', name: 'Integrasi Penelitian dan PkM dalam Pembelajaran', bobot: { S: 2.43, M: 2.20, D: 2.16, STr: 2.37, MTr: 2.16, DTr: 2.16, PPI: 2.30 } },
          { code: '3.9', name: 'Suasana Akademik', bobot: { S: 1.46, M: 1.33, D: 1.33, STr: 1.36, MTr: 1.36, DTr: 1.36, PPI: 1.42 } },
          { code: '3.10', name: 'Penelitian - Kesesuaian dengan VMTS', bobot: { S: 2.18, M: 2.16, D: 2.16, STr: 2.01, MTr: 2.10, DTr: 2.10, PPI: 2.29 } },
          { code: '3.11', name: 'Penelitian DTPS dengan Mahasiswa', bobot: { S: 1.74, M: 1.86, D: 1.86, STr: 1.61, MTr: 1.79, DTr: 1.79, PPI: 1.83 } },
          { code: '3.12', name: 'PkM - Kesesuaian dengan VMTS', bobot: { S: 2.18, M: 2.16, D: 2.16, STr: 2.01, MTr: 2.10, DTr: 2.10, PPI: 2.29 } },
          { code: '3.13', name: 'PkM DTPS dengan Mahasiswa', bobot: { S: 1.74, M: 1.86, D: 1.86, STr: 1.61, MTr: 1.79, DTr: 1.79, PPI: 1.83 } }
        ],
        ledKeys: ['pemutakhiran_kurikulum', 'profil_lulusan', 'kesesuaian_cpl', 'rps_kelengkapan', 'proses_pembelajaran', 'suasana_akademik', 'penelitian', 'pkm'],
        lkpsKeys: ['pjp', 'ppdmhs', 'pkdmhs', 'basic_sciences_sks']
      },
      4: {
        name: 'Sumber Daya Manusia',
        // Sum of butir 25-35 for program S
        bobot: { S: 13.44, M: 13.44, D: 13.44, STr: 12.42, MTr: 12.97, DTr: 12.97, PPI: 13.95 },
        butir: [
          { code: '4.1', name: 'Kecukupan Jumlah DTPS', bobot: { S: 2.07, M: 2.07, D: 2.07, STr: 1.92, MTr: 1.99, DTr: 1.99, PPI: 2.11 } },
          { code: '4.2', name: 'Jabatan Akademik DTPS', bobot: { S: 1.89, M: 1.76, D: 1.76, STr: 1.76, MTr: 1.69, DTr: 1.69, PPI: 1.89 } },
          { code: '4.3', name: 'Tenaga Kependidikan', bobot: { S: 1.21, M: 1.20, D: 1.20, STr: 1.19, MTr: 1.22, DTr: 1.22, PPI: 1.22 } },
          { code: '4.4', name: 'RBK - Rerata Beban Kerja DTPS', bobot: { S: 1.21, M: 0.38, D: 0.38, STr: 0.35, MTr: 0.38, DTr: 0.38, PPI: 0.40 } },
          { code: '4.5', name: 'Kinerja Penelitian DTPS', bobot: { S: 0.39, M: 0.22, D: 0.22, STr: 0.36, MTr: 0.28, DTr: 0.28, PPI: 0.38 } },
          { code: '4.6', name: 'Kinerja PkM DTPS', bobot: { S: 0.39, M: 0.22, D: 0.22, STr: 0.36, MTr: 0.28, DTr: 0.28, PPI: 0.38 } },
          { code: '4.7', name: 'Publikasi Ilmiah DTPS (3D)', bobot: { S: 2.06, M: 5.97, D: 5.97, STr: 1.91, MTr: 3.70, DTr: 3.70, PPI: 2.11 } },
          { code: '4.8', name: 'Luaran Penelitian dan PkM DTPS', bobot: { S: 2.06, M: 5.97, D: 5.97, STr: 1.91, MTr: 3.70, DTr: 3.70, PPI: 2.11 } },
          { code: '4.9', name: 'PKIB - Karya Ilmiah Bereputasi', bobot: { S: 1.09, M: 2.28, D: 2.28, STr: 1.00, MTr: 2.18, DTr: 2.18, PPI: 1.14 } },
          { code: '4.10', name: 'DTPS Penulis Korespondensi', bobot: { S: 1.09, M: 2.28, D: 2.28, STr: 1.00, MTr: 2.18, DTr: 2.18, PPI: 1.14 } }
        ],
        ledKeys: [],
        lkpsKeys: ['ndtps', 'pdtt', 'pds3', 'pgblkl', 'rbk_dtps', 'publikasi_ilmiah_dtps_ri', 'publikasi_ilmiah_dtps_rn', 'kinerja_penelitian_dtps', 'kinerja_pkm_dtps', 'rlp_dtps', 'pkib_dtps']
      },
      5: {
        name: 'Sarana, Prasarana, dan K3L',
        // Sum of butir 36-37 for program S
        bobot: { S: 7.51, M: 7.51, D: 7.51, STr: 6.94, MTr: 7.26, DTr: 7.26, PPI: 7.66 },
        butir: [
          { code: '5.1', name: 'Sarana dan Prasarana Akademik', bobot: { S: 2.93, M: 2.00, D: 2.00, STr: 2.72, MTr: 2.93, DTr: 2.93, PPI: 2.93 } },
          { code: '5.2', name: 'Sarana dan Prasarana Non-Akademik', bobot: { S: 2.93, M: 2.00, D: 2.00, STr: 2.72, MTr: 2.93, DTr: 2.93, PPI: 2.93 } },
          { code: '5.3', name: 'K3L - Keselamatan Kesehatan Kerja dan Lingkungan', bobot: { S: 1.65, M: 3.51, D: 3.51, STr: 1.50, MTr: 1.40, DTr: 1.40, PPI: 1.80 } }
        ],
        ledKeys: ['sarana_prasarana_akademik', 'sarana_prasarana_non_akademik', 'k3l'],
        lkpsKeys: []
      },
      6: {
        name: 'Mahasiswa dan Luaran Mahasiswa',
        // Sum of butir 38-45 for program S
        bobot: { S: 26.87, M: 26.87, D: 26.87, STr: 28.85, MTr: 29.58, DTr: 29.58, PPI: 25.66 },
        butir: [
          { code: '6.1', name: 'Persentase Mahasiswa Asing', bobot: { S: 0.83, M: 0.83, D: 0.83, STr: 0.77, MTr: 0.80, DTr: 0.80, PPI: 0.87 } },
          { code: '6.2', name: 'IPK Lulusan', bobot: { S: 1.21, M: 1.21, D: 1.21, STr: 1.12, MTr: 1.17, DTr: 1.17, PPI: 1.27 } },
          { code: '6.3', name: 'Prestasi Akademik Mahasiswa (3D)', bobot: { S: 1.83, M: 1.83, D: 1.83, STr: 1.70, MTr: 1.76, DTr: 1.76, PPI: 1.91 } },
          { code: '6.4', name: 'Masa Studi', bobot: { S: 4.36, M: 4.36, D: 4.36, STr: 4.05, MTr: 4.20, DTr: 4.20, PPI: 4.57 } },
          { code: '6.5', name: 'PTW - Persentase Kelulusan Tepat Waktu', bobot: { S: 4.36, M: 4.36, D: 4.36, STr: 4.05, MTr: 4.20, DTr: 4.20, PPI: 4.57 } },
          { code: '6.6', name: 'Publikasi Ilmiah Mahasiswa (3D)', bobot: { S: 5.26, M: 5.26, D: 5.26, STr: 6.77, MTr: 7.05, DTr: 7.05, PPI: 4.45 } },
          { code: '6.7', name: 'Luaran Penelitian dan PkM Mahasiswa', bobot: { S: 1.33, M: 0.37, D: 0.37, STr: 1.23, MTr: 0.36, DTr: 0.36, PPI: 1.39 } },
          { code: '6.8', name: 'Tracer Study', bobot: { S: 3.29, M: 3.29, D: 3.29, STr: 3.94, MTr: 4.48, DTr: 4.48, PPI: 2.06 } },
          { code: '6.9', name: 'Waktu Tunggu Lulusan', bobot: { S: 2.20, M: 2.20, D: 2.20, STr: 2.61, MTr: 2.78, DTr: 2.78, PPI: 1.78 } },
          { code: '6.10', name: 'KBK - Kesesuaian Bidang Kerja', bobot: { S: 2.20, M: 3.16, D: 3.16, STr: 2.61, MTr: 2.78, DTr: 2.78, PPI: 2.79 } }
        ],
        ledKeys: [],
        lkpsKeys: ['rmd', 'pma', 'ripk', 'prestasi_akademik_ri', 'prestasi_akademik_rn', 'ptw', 'masa_studi', 'publikasi_mahasiswa_ri', 'publikasi_mahasiswa_rn', 'wt', 'kbk', 'tracer_study']
      },
      7: {
        name: 'Sistem Penjaminan Mutu',
        // Sum of butir 46-53 for program S
        bobot: { S: 15.35, M: 15.35, D: 15.35, STr: 14.85, MTr: 14.80, DTr: 14.80, PPI: 15.02 },
        butir: [
          { code: '7.1', name: 'Keberadaan Unit Penjaminan Mutu', bobot: { S: 2.07, M: 2.07, D: 2.07, STr: 1.92, MTr: 1.99, DTr: 1.99, PPI: 2.17 } },
          { code: '7.2', name: 'Ketersediaan Perangkat SPMI', bobot: { S: 2.07, M: 2.07, D: 2.07, STr: 1.92, MTr: 1.99, DTr: 1.99, PPI: 2.17 } },
          { code: '7.3', name: 'IKT - Indikator Kinerja Tambahan', bobot: { S: 2.67, M: 2.67, D: 2.67, STr: 2.47, MTr: 2.57, DTr: 2.57, PPI: 2.79 } },
          { code: '7.4', name: 'Keterlaksanaan SPMI dan AMI', bobot: { S: 4.00, M: 4.00, D: 4.00, STr: 3.71, MTr: 3.85, DTr: 3.85, PPI: 4.19 } },
          { code: '7.5', name: 'Evaluasi Capaian Kinerja', bobot: { S: 2.65, M: 2.65, D: 2.65, STr: 2.46, MTr: 2.55, DTr: 2.55, PPI: 2.77 } },
          { code: '7.6', name: 'Kepuasan Pemangku Kepentingan', bobot: { S: 1.89, M: 1.89, D: 1.89, STr: 2.37, MTr: 1.85, DTr: 1.85, PPI: 0.93 } }
        ],
        ledKeys: ['keberadaan_unit_spmi', 'ketersediaan_perangkat_spmi', 'ikt', 'keterlaksanaan_spmi', 'evaluasi_capaian_kinerja', 'kepuasan_pemangku_kepentingan'],
        lkpsKeys: []
      },
      // Kriteria 8: Program Pengembangan (tidak dinilai, analisis saja)
      8: {
        name: 'Program Pengembangan Berkelanjutan',
        bobot: { S: 0, M: 0, D: 0, STr: 0, MTr: 0, DTr: 0, PPI: 0 },
        butir: [
          { code: '8.1', name: 'Analisis Lingkungan dan SWOT', bobot: { S: 0, M: 0, D: 0, STr: 0, MTr: 0, DTr: 0, PPI: 0 } },
          { code: '8.2', name: 'Tujuan Strategis Pengembangan', bobot: { S: 0, M: 0, D: 0, STr: 0, MTr: 0, DTr: 0, PPI: 0 } },
          { code: '8.3', name: 'Program Pengembangan Berkelanjutan', bobot: { S: 0, M: 0, D: 0, STr: 0, MTr: 0, DTr: 0, PPI: 0 } }
        ],
        ledKeys: ['analisis_swot', 'tujuan_strategis', 'program_pengembangan'],
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
        // Normalize sheet name: strip decoration characters like ✓ and trim whitespace
        // so prompt patterns like "Sheet 3b" match LAM-TEK 2025 sheets named "3b✓" or "3b ✓".
        const normalizedName = String(worksheet.name).replace(/[✓✔✅☑]/g, '').trim();
        text += `\n--- Sheet: ${normalizedName} ---\n`;

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
          bop_value: '(number) BOP = Biaya Operasional Pendidikan per Mahasiswa. SEARCH (LAM-TEK 2025): (1) Sheet "2b" / Tabel 2.b "Penggunaan Dana", row "Biaya Operasional Pendidikan" (sub a-e) total Program Studi rata-rata, divide by jumlah mahasiswa OR find precomputed "BOP =" line. LEGACY (pre-2025): Sheet "4a" / Tabel 4.a, "BOP =" row. FORMAT: Remove dots/commas/spaces. Expected 15M-50M Rupiah',
          dpd_total: '(number) DPD/DP = Dana Penelitian DTPS (total over 3 tahun). SEARCH (LAM-TEK 2025): Sheet "2b" / Tabel 2.b, row "Biaya Penelitian", take Program Studi total or Rata-rata × 3. LEGACY: Sheet "4a", "DP =" row. FORMAT: plain integer. Expected 1B-50B Rupiah',
          dpkm_total: '(number) DPkM = Dana PkM DTPS (total over 3 tahun). SEARCH (LAM-TEK 2025): Sheet "2b" / Tabel 2.b, row "Biaya PkM" or "Biaya Pengabdian", take Program Studi total or Rata-rata × 3. Expected 100M-5B Rupiah. If row missing, leave 0 only if row is genuinely absent',
          jumlah_dtps: '(number) NDTPS = Jumlah Dosen Tetap. SEARCH PRIORITY: (1) Info block at top of LKPS with "NDTPS" label, (2) LAM-TEK 2025: Sheet "4a" / Tabel 4.a Profil Dosen — count data rows. LEGACY: Sheet "3a1" / Tabel 3.a.1. Expected 12-35',
          kerjasama_pendidikan: '(number) Count KERJASAMA type PENDIDIKAN. SEARCH (LAM-TEK 2025): Sheet "2a1" / Tabel 2 Bagian-1 "Kerjasama Pendidikan" — count data rows (skip header). LEGACY: Sheet "6", row Jenis = Pendidikan. Expected 5-30',
          kerjasama_penelitian: '(number) Count KERJASAMA type PENELITIAN. SEARCH (LAM-TEK 2025): Sheet "2a2" / Tabel 2 Bagian-2 "Kerjasama Penelitian" — count data rows. LEGACY: Sheet "6", Jenis = Penelitian. Expected 5-30',
          kerjasama_pkm: '(number) Count KERJASAMA type PkM/Pengabdian. SEARCH (LAM-TEK 2025): Sheet "2a3" / Tabel 2 Bagian-3 "Kerjasama PkM" — count data rows. LEGACY: Sheet "6", Jenis = PkM. Expected 3-25',
          kerjasama_internasional: '(number) TOTAL kerjasama level INTERNASIONAL across 2a1+2a2+2a3 (LAM-TEK 2025) — column "Tingkat: Internasional" marked V or value. LEGACY: Sheet 6 Tingkat = Internasional. Expected 1-15',
          kerjasama_nasional: '(number) TOTAL kerjasama level NASIONAL across 2a1+2a2+2a3 (LAM-TEK 2025) — column "Tingkat: Nasional" marked V. LEGACY: Sheet 6 Tingkat = Nasional. Expected 5-40',
          kerjasama_wilayah: '(number) TOTAL kerjasama level LOKAL/WILAYAH across 2a1+2a2+2a3 (LAM-TEK 2025) — column "Lokal/Wilayah" marked V. LEGACY: Sheet 6 Tingkat = Wilayah. Expected 0-25'
        },
        example: { bop_value: 25925746.63, dpd_total: 11397400360, dpkm_total: 800000000, jumlah_dtps: 26, kerjasama_pendidikan: 12, kerjasama_penelitian: 15, kerjasama_pkm: 8, kerjasama_internasional: 6, kerjasama_nasional: 10, kerjasama_wilayah: 5 },
        hint: `EXTRACTION STRATEGY — KRITERIA 2 (LAM-TEK 2025)

KEY SHEETS:
  --- Sheet: 2a1 ---  Tabel 2 Bagian-1 Kerjasama Pendidikan (one row per kerjasama, kolom Tingkat: Internasional/Nasional/Lokal-Wilayah marked with V)
  --- Sheet: 2a2 ---  Tabel 2 Bagian-2 Kerjasama Penelitian
  --- Sheet: 2a3 ---  Tabel 2 Bagian-3 Kerjasama PkM
  --- Sheet: 2b ---   Tabel 2.b Penggunaan Dana (BOP, Biaya Penelitian, Biaya PkM, all Rupiah)
  --- Sheet: 4a ---   Tabel 4.a Profil Dosen (count for NDTPS)

LEGACY (older S1 LKPS): Sheet 4a for keuangan, Sheet 6 for kerjasama. Try LAM-TEK 2025 first.

KERJASAMA EXTRACTION:
- Each row in 2a1/2a2/2a3 has columns "Internasional | Nasional | Lokal/Wilayah". The non-empty column (V/✓/X) marks the tingkat.
- kerjasama_pendidikan = data row count in 2a1
- kerjasama_penelitian = data row count in 2a2
- kerjasama_pkm = data row count in 2a3
- kerjasama_internasional = total rows across 2a1+2a2+2a3 with Internasional marked
- kerjasama_nasional = total rows with Nasional marked
- kerjasama_wilayah = total rows with Lokal/Wilayah marked
- pendidikan+penelitian+pkm should ≈ internasional+nasional+wilayah (total kerjasama).

DANA EXTRACTION (Sheet 2b):
- Table has columns "TS-2 | TS-1 | TS | Rata-rata" for both UPPS and Program Studi blocks.
- bop_value: row "Biaya Operasional Pendidikan" (sub-totals a–e), use Program Studi Rata-rata divided by jumlah mahasiswa aktif (or use precomputed BOP if listed).
- dpd_total: row "Biaya Penelitian", Program Studi total or Rata-rata × 3 (3 tahun).
- dpkm_total: row "Biaya PkM" / "Biaya Pengabdian", same approach.
- Numbers may have separator dots ("11.397.400.360"); strip them.

QUALITY CHECK:
- BOP: 15M-50M Rupiah
- DPD: 100M-50B Rupiah
- DPkM: 50M-5B Rupiah
- NDTPS: 12-35
- Kerjasama: pendidikan+penelitian+pkm ≈ internasional+nasional+wilayah`
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
          ndtps: '(number) NDTPS = Jumlah Dosen Tetap. PRIORITY: (1) Info block "NDTPS" value, (2) LAM-TEK 2025 Sheet "4a" / Tabel 4.a "Profil Dosen" — count data rows. LEGACY: Sheet "3a1". Expected 12-35',
          pdtt: '(number) Persentase dosen tidak tetap (0-100). SEARCH (LAM-TEK 2025): Sheet "4a" — count where Status ≠ "Dosen Tetap". LEGACY: Sheet "3a2". FALLBACK 5-10% for accredited programs',
          pds3: '(number) Persentase dosen S3/Doktor (0-100). SEARCH (LAM-TEK 2025): Sheet "4a" / Tabel 4.a — find column "Pendidikan" / "Gelar Akademik", COUNT rows with "S3" or "Doktor" or "Dr." or "Ph.D", FORMULA (Count S3 / NDTPS) × 100. LEGACY: Sheet 3a1. Expected 70-100% for Magister/Doktor',
          pgblkl: '(number) Persentase Guru Besar + Lektor Kepala (0-100). SEARCH (LAM-TEK 2025): Sheet "4a" / Tabel 4.a — column "Jabatan Akademik", COUNT "Guru Besar/Profesor" + "Lektor Kepala", FORMULA ((GB + LK) / NDTPS) × 100. LEGACY: Sheet 3a1. Expected 50-90%',
          rbk_dtps: '(number) Rata-rata beban kerja DTPS (SKS). SEARCH (LAM-TEK 2025): Sheet "4c" / Tabel 4.c "Beban Kerja Dosen" — average "Jumlah SKS" column. LEGACY: Sheet 3a3. Expected 10-16 SKS',
          kinerja_penelitian_dtps: '(number) TOTAL penelitian DTPS across 3 tahun & all sumber. SEARCH (LAM-TEK 2025): Sheet "3b" / Tabel 3.b "Penelitian DTPS" — take "Jumlah" total cell (sum of all sumber × all years), often labeled NPD. LEGACY: Sheet 3b1. Expected 50-400. NEVER 0 if table has any rows.',
          kinerja_pkm_dtps: '(number) TOTAL PkM DTPS across 3 tahun & all sumber. SEARCH (LAM-TEK 2025): Sheet "3c" / Tabel 3.c "Pengabdian kepada Masyarakat DTPS" — total "Jumlah" cell (NPKD). LEGACY: Sheet 3b3. Expected 30-300. NEVER 0 if table has any rows.',
          publikasi_ilmiah_dtps_ri: '(number) Publikasi Internasional bereputasi (raw COUNT). SEARCH (LAM-TEK 2025): Sheet "4d" / Tabel 4.d "Publikasi Ilmiah DTPS" — row "Jurnal internasional bereputasi" (NA4), Jumlah column. LEGACY: Sheet 3b4 row "internasional bereputasi". Expected 30-300. Use raw count, NOT the precomputed RI ratio',
          publikasi_ilmiah_dtps_rn: '(number) Publikasi Nasional terakreditasi (raw COUNT). SEARCH (LAM-TEK 2025): Sheet "4d" — row "Jurnal nasional terakreditasi" (NA2), Jumlah column. Expected 30-300. Raw count, not ratio',
          rlp_dtps: '(number) Luaran Penelitian DTPS per dosen (rasio HKI/Paten + Buku ber-ISBN dll). SEARCH (LAM-TEK 2025): Sheets "4f-1", "4f-2", "4f-3", "4f-4" / Tabel 4.f bagian 1-4 — count valid Paten/HKI/Buku rows, divide by NDTPS. Also check Tabel 4.h ("Kinerja DTPS"). LEGACY: was simple ratio of publikasi/NDTPS. Expected 0.3-3.0',
          pkib_dtps: '(number) PKIB = Persentase Karya Ilmiah DTPS yang Disitasi (0-100, value in percent). SEARCH (LAM-TEK 2025): Sheet "4i" / Tabel 4.i "Karya Ilmiah DTPS yang Disitasi" — find precomputed percentage label (e.g. "5.17%") OR FORMULA (count cited rows / total publikasi) × 100. Expected 1-30%. The formula in scoring expects a NUMBER 0-100 (will be normalized)'
        },
        example: { ndtps: 26, pdtt: 7.5, pds3: 100.0, pgblkl: 76.9, rbk_dtps: 13.2, kinerja_penelitian_dtps: 311, kinerja_pkm_dtps: 300, publikasi_ilmiah_dtps_ri: 137, publikasi_ilmiah_dtps_rn: 87, rlp_dtps: 0.7, pkib_dtps: 5.17 },
        hint: `EXTRACTION STRATEGY — KRITERIA 4 SDM (LAM-TEK 2025)

KEY SHEETS:
  --- Sheet: 4a ---   Tabel 4.a Profil Dosen (NDTPS, Jabatan, Pendidikan, Status Dosen)
  --- Sheet: 4c ---   Tabel 4.c Beban Kerja Dosen (SKS per dosen)
  --- Sheet: 3b ---   Tabel 3.b Penelitian DTPS (Jumlah Judul per Sumber × TS-2/TS-1/TS, sometimes summary cells like NPD/NN/NI/NL)
  --- Sheet: 3c ---   Tabel 3.c Pengabdian kepada Masyarakat DTPS (NPKD/NN/NI/NL)
  --- Sheet: 4d ---   Tabel 4.d Publikasi Ilmiah DTPS (NA1=jurnal nas. tidak terakreditasi, NA2=nas. terakreditasi, NA3=internasional, NA4=internasional bereputasi, NB1-NB3=prosiding)
  --- Sheet: 4f-1 ---, 4f-2, 4f-3, 4f-4   Tabel 4.f Luaran Penelitian/PkM (Paten, HKI, Buku ber-ISBN, Karya seni, dll)
  --- Sheet: 4i ---   Tabel 4.i Karya Ilmiah DTPS yang Disitasi (column Jumlah Sitasi; some sheets contain a precomputed % seperti "5.17%")

LEGACY (older S1 LKPS): Sheets 3a1, 3a3, 3b1, 3b4. Try LAM-TEK 2025 first.

CALCULATIONS:
- ndtps = COUNT data rows in Sheet 4a (skip header rows). Or use NDTPS info block.
- pds3 = (count rows in 4a where Pendidikan = S3/Doktor/Dr./Ph.D) / ndtps × 100. RETURN PERCENT.
- pgblkl = (count "Guru Besar"/"Profesor" + "Lektor Kepala") / ndtps × 100. RETURN PERCENT.
- pdtt = (count rows where Status ≠ "Dosen Tetap") / ndtps × 100. Default 5-10%.
- rbk_dtps = average SKS in Sheet 4c "Jumlah SKS" column. Expected 10-16.
- kinerja_penelitian_dtps = TOTAL all penelitian DTPS over 3 tahun & all sumber (use the "Jumlah" total cell or NPD summary). Take TOTAL of Tabel 3.b — for example if columns sum to 311, return 311. NOT split by RI/RN.
- kinerja_pkm_dtps = TOTAL all PkM DTPS (NPKD or "Jumlah" total in Tabel 3.c). NOT split.
- publikasi_ilmiah_dtps_ri = NA4 row total (jurnal internasional bereputasi). Raw count.
- publikasi_ilmiah_dtps_rn = NA2 row total (jurnal nasional terakreditasi). Raw count.
- rlp_dtps = total Paten/HKI/Buku/Karya across 4f-1..4f-4 rows, divide by NDTPS. Or read "Rasio Luaran" if present. Expected 0.3-3.0.
- pkib_dtps = % karya disitasi in Tabel 4.i. If sheet has a precomputed percentage like "5.17%", return 5.17. Otherwise (cited rows / total publikasi) × 100.

QUALITY CHECK:
- ndtps 12-35, pdtt 5-15, pds3 70-100, pgblkl 50-90, rbk_dtps 10-16
- kinerja_penelitian_dtps 50-400, kinerja_pkm_dtps 30-300
- publikasi_ilmiah_dtps_ri/rn 30-300 each (raw count, not ratio)
- pkib_dtps 1-30 (percent)`
      },
      6: {
        fields: {
          rmd: '(number) RMD = Rasio Mahasiswa/DTPS. SEARCH (LAM-TEK 2025): Sheet "6a" / Tabel 6.a "Jumlah Mahasiswa (Reguler dan Asing)" — sum "Jumlah Mahasiswa Aktif" for the prodi being accredited, divide by NDTPS. LEGACY: Sheet 5a. Expected 5-30',
          pma: '(number) PMA = % Mahasiswa Asing (0-100). SEARCH (LAM-TEK 2025): Sheet "6a" / Tabel 6.a — for the accredited prodi find "Mahasiswa Asing Penuh Waktu" + "Paruh Waktu" across TS-2/TS-1/TS, FORMULA (Total Asing / Total Mahasiswa Aktif) × 100. LEGACY: Sheet 2b. Expected 0-5% (often 0 for domestic)',
          masa_studi: '(number) Masa Studi rata-rata lulusan (tahun). SEARCH (LAM-TEK 2025): Sheet "6d" / Tabel 6.d "Masa Studi Lulusan" — extract "Rata-rata Masa Studi". For S3 expect 3-5 tahun, S2 1.5-2.5, S1 3.5-5. NEVER 0 if table has rows',
          ripk: '(number) RIPK = Rata-rata IPK Lulusan (0-4 scale). SEARCH (LAM-TEK 2025): Sheet "6b" / Tabel 6.b "IPK Lulusan" — column "Rata-rata" OR average across years. LEGACY: Sheet 5b1. Expected 3.0-3.9',
          prestasi_akademik_ri: '(number) Total prestasi AKADEMIK Internasional (3 tahun). SEARCH (LAM-TEK 2025): Sheet "6c1" / Tabel 6.c.1 "Prestasi Akademik Mahasiswa" — column Tingkat = Internasional, sum across 3 years. LEGACY: Sheet 5b2. Expected 0-15',
          prestasi_akademik_rn: '(number) Total prestasi AKADEMIK Nasional (3 tahun). SEARCH (LAM-TEK 2025): Sheet "6c1" — Tingkat = Nasional. Expected 0-30',
          prestasi_non_akademik_ri: '(number) Total prestasi NON-AKADEMIK Internasional. SEARCH (LAM-TEK 2025): Sheet "6c2" / Tabel 6.c.2 — Tingkat = Internasional. Expected 0-10',
          prestasi_non_akademik_rn: '(number) Total prestasi NON-AKADEMIK Nasional. SEARCH (LAM-TEK 2025): Sheet "6c2" — Tingkat = Nasional. Expected 0-20',
          ptw: '(number) PTW = % Lulusan Tepat Waktu (0-100). SEARCH (LAM-TEK 2025): Sheet "6d" / Tabel 6.d — find "Lulusan Tepat Waktu" count and "Total Lulusan", FORMULA (Tepat Waktu / Total) × 100. LEGACY: Sheet 5c. Expected 50-95%',
          publikasi_mahasiswa_ri: '(number) Publikasi mahasiswa internasional bereputasi (3 tahun, raw COUNT). SEARCH (LAM-TEK 2025): Sheet "6e1" / Tabel 6.e.1 "Publikasi Ilmiah Mahasiswa" — row "Jurnal internasional bereputasi" (NA4), Jumlah. LEGACY: Sheet 5b3. Expected 0-100',
          publikasi_mahasiswa_rn: '(number) Publikasi mahasiswa nasional terakreditasi. SEARCH (LAM-TEK 2025): Sheet "6e1" — row "Jurnal nasional terakreditasi" (NA2), Jumlah. Expected 0-50',
          wt: '(number) WT = Waktu Tunggu Lulusan (bulan). SEARCH (LAM-TEK 2025): Sheet "6f1" / Tabel 6.f.1 "Waktu Tunggu Lulusan" — average column "Waktu Tunggu". LEGACY: Sheet 5d. Expected 3-12 bulan. NEVER 0 if rows exist',
          kbk: '(number) KBK = % Kesesuaian Bidang Kerja (0-100). SEARCH (LAM-TEK 2025): Sheet "6f2" / Tabel 6.f.2 "Kesesuaian Bidang Kerja" — count "Sesuai" / count Total × 100, OR take precomputed percentage. LEGACY: Sheet 5d. Expected 50-95%',
          tracer_study: '(number) Persentase respondent tracer study (0-100). SEARCH (LAM-TEK 2025): Sheet "6g2" / Tabel 6.g.2 "Kepuasan Pengguna Lulusan" — overall response/coverage rate; if blank, return 0 only if truly blank. Expected 30-90%',
          tingkat_tempat_kerja_ri: '(number) Lulusan kerja tingkat Internasional/Multinasional. SEARCH (LAM-TEK 2025): Sheet "6g1" / Tabel 6.g.1 "Tempat Kerja Lulusan" — Tingkat Multinasional/Internasional count. Expected 0-10',
          tingkat_tempat_kerja_rn: '(number) Lulusan kerja tingkat Nasional. SEARCH (LAM-TEK 2025): Sheet "6g1" — Tingkat Nasional count. Expected 5-50'
        },
        example: { rmd: 20.5, pma: 3.0, masa_studi: 4.2, ripk: 3.51, prestasi_akademik_ri: 5, prestasi_akademik_rn: 12, prestasi_non_akademik_ri: 2, prestasi_non_akademik_rn: 8, ptw: 75.5, publikasi_mahasiswa_ri: 62, publikasi_mahasiswa_rn: 33, wt: 4.2, kbk: 78.5, tracer_study: 65, tingkat_tempat_kerja_ri: 2, tingkat_tempat_kerja_rn: 18 },
        hint: `EXTRACTION STRATEGY — KRITERIA 6 MAHASISWA & LUARAN (LAM-TEK 2025)

KEY SHEETS:
  --- Sheet: 6a ---   Tabel 6.a Jumlah Mahasiswa Reguler & Asing (per prodi, kolom Asing Penuh Waktu / Paruh Waktu × TS-2/TS-1/TS)
  --- Sheet: 6b ---   Tabel 6.b IPK Lulusan
  --- Sheet: 6c1 ---  Tabel 6.c.1 Prestasi Akademik Mahasiswa (Tingkat: Internasional/Nasional/Lokal)
  --- Sheet: 6c2 ---  Tabel 6.c.2 Prestasi Non-Akademik Mahasiswa
  --- Sheet: 6d ---   Tabel 6.d Masa Studi Lulusan (Rata-rata Masa Studi, Lulusan Tepat Waktu)
  --- Sheet: 6e1 ---  Tabel 6.e.1 Publikasi Ilmiah Mahasiswa (rows NA1..NA4 jurnal, NB1..NB3 prosiding)
  --- Sheet: 6f1 ---  Tabel 6.f.1 Waktu Tunggu Lulusan
  --- Sheet: 6f2 ---  Tabel 6.f.2 Kesesuaian Bidang Kerja
  --- Sheet: 6g1 ---  Tabel 6.g.1 Tempat Kerja Lulusan (Tingkat: Internasional/Multinasional/Nasional)
  --- Sheet: 6g2 ---  Tabel 6.g.2 Kepuasan Pengguna Lulusan / Tracer Study response data

LEGACY (older S1 LKPS): Sheets 2b, 5a, 5b1, 5b2, 5b3, 5c, 5d, 8e1. Try LAM-TEK 2025 first.

CALCULATIONS:
- For the prodi being accredited (the one marked "V" in column "Prodi yang Diakreditasi" of Tabel 6.a):
  - rmd = (mahasiswa aktif TS) / NDTPS
  - pma = (asing penuh+paruh / total mahasiswa aktif) × 100. May be 0 for domestic programs.
- ripk = "Rata-rata IPK" in Tabel 6.b (decimal 0-4).
- masa_studi = "Rata-rata Masa Studi" in Tabel 6.d (tahun).
- ptw = (lulusan tepat waktu / total lulusan) × 100 from Tabel 6.d.
- prestasi_akademik_ri/_rn = sum across 3 years for Tingkat Internasional/Nasional in Tabel 6.c.1.
- prestasi_non_akademik_ri/_rn = same for Tabel 6.c.2.
- publikasi_mahasiswa_ri = NA4 row Jumlah (jurnal internasional bereputasi) in Tabel 6.e.1. Raw count.
- publikasi_mahasiswa_rn = NA2 row Jumlah (jurnal nasional terakreditasi). Raw count.
- wt = average "Waktu Tunggu" (bulan) in Tabel 6.f.1.
- kbk = % "Sesuai" in Tabel 6.f.2 (or precomputed percentage).
- tracer_study = % responden tracer study (Tabel 6.g.2 coverage). If table is genuinely empty, return 0.
- tingkat_tempat_kerja_ri = count Multinasional/Internasional in Tabel 6.g.1.
- tingkat_tempat_kerja_rn = count Nasional in Tabel 6.g.1.

QUALITY CHECK:
- rmd 5-30, pma 0-10 (often 0 for S3), ripk 3.0-3.9, masa_studi 1.5-7
- ptw 30-95, kbk 50-95, wt 1-12 bulan
- prestasi/publikasi mhs: small integers, can be 0 for new prodi`
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
1. The document is delimited by "--- Sheet: <name> ---" markers. The sheet naming convention is **LAM-TEK 2025**:
   - Tabel 2.a (parts 1/2/3) → sheets "2a1", "2a2", "2a3" (Kerjasama Pendidikan/Penelitian/PkM)
   - Tabel 2.b → sheet "2b" (Penggunaan Dana — BOP, Penelitian, PkM)
   - Tabel 3.b → sheet "3b" (Penelitian DTPS), Tabel 3.c → sheet "3c" (PkM DTPS)
   - Tabel 4.a → sheet "4a" (Profil Dosen / NDTPS / Jabatan), Tabel 4.c → sheet "4c" (Beban Kerja)
   - Tabel 4.d → sheet "4d" (Publikasi Ilmiah DTPS), Tabel 4.f bagian 1-4 → sheets "4f-1", "4f-2", "4f-3", "4f-4" (Luaran), Tabel 4.i → "4i" (Karya Disitasi)
   - Tabel 6.a → sheet "6a" (Mahasiswa Reguler & Asing), Tabel 6.b → "6b" (IPK), Tabel 6.c.1/6.c.2 → "6c1"/"6c2" (Prestasi)
   - Tabel 6.d → "6d" (Masa Studi), Tabel 6.e.1 → "6e1" (Publikasi Mahasiswa)
   - Tabel 6.f.1 → "6f1" (Waktu Tunggu), Tabel 6.f.2 → "6f2" (KBK), Tabel 6.g.2 → "6g2" (Kepuasan/Tracer)
   Some files may use legacy naming (3a1, 3b1, 3b4, 5a, 5b1, 5b3, 5c, 5d, 6); each field description lists both. Pick whichever exists in this document.
2. If a TOTAL column or row exists, PREFER that total instead of summing.
3. If TOTAL not present, SUM values across columns TS, TS-1, TS-2 explicitly.
4. For percentage calculations (e.g. PMA, PTW, KBK, PDS3, PGBLKL), PERFORM the calculation and return percentage (0-100), NOT raw counts.
5. Accept number formats with separators (e.g. "1.139.740.360" or "1139740360") and return clean numeric value.
6. **Returning 0 is reserved for cases where the table exists but is genuinely empty (no data rows).** If the field exists somewhere but is hard to locate, return your best estimate based on adjacent context — NEVER return 0 just because the search was inconclusive. The downstream scoring will not treat 0 as "missing"; it will treat 0 as "explicitly zero performance".
7. For NDTPS: prefer explicit value from info block; otherwise COUNT data rows in Tabel 4.a (or legacy 3.a.1).
8. Return ONLY numbers (integers or decimals).

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
        // Global rate limiting - wait if last request was too recent
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (this.lastRequestTime > 0 && timeSinceLastRequest < this.minRequestIntervalMs) {
          const waitTime = this.minRequestIntervalMs - timeSinceLastRequest;
          console.log(`[Gemini] ⏳ Rate limit: waiting ${Math.ceil(waitTime/1000)}s before next request...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        this.lastRequestTime = Date.now();
        
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
        
        // Calculate exponential backoff delay - longer for rate limit (Free Tier = 2 RPM)
        const baseDelay = errorMsg.includes('429') || errorMsg.includes('quota') ? 35000 : 5000;
        const delayMs = Math.min(baseDelay * Math.pow(1.5, attempt - 1), 60000); // Max 60 seconds
        
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

  /**
   * Match assessor expertise with program study using AI
   * Returns ranked list of assessors based on similarity
   * @param {string} programStudi - The program study from UPPS submission
   * @param {Array} assessors - List of assessors with their expertise
   * @returns {Array} Ranked assessors with similarity scores
   */
  async matchAssessorExpertise(programStudi, assessors) {
    if (!this.genAI) {
      console.warn('[Gemini] AI not available, returning assessors without ranking');
      return assessors.map((a, i) => ({
        ...a,
        similarityScore: 50,
        aiRecommendation: 'AI tidak tersedia',
        rank: i + 1
      }));
    }

    try {
      // Wait for rate limit if needed
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestIntervalMs) {
        const waitTime = this.minRequestIntervalMs - timeSinceLastRequest;
        console.log(`[Gemini] Rate limiting: waiting ${waitTime}ms before assessor matching`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      this.lastRequestTime = Date.now();

      // Build assessor list with research profile data
      const assessorList = assessors.map(a => {
        const researchAreas = a.researchAreas?.length > 0 
          ? a.researchAreas.join(', ')
          : a.expertise || a.programStudi || 'Tidak diketahui';
        
        const hIndex = a.hIndex ? `H-Index: ${a.hIndex}` : '';
        const pubCount = a.publicationCount ? `Publikasi: ${a.publicationCount}` : '';
        const recentPubs = a.recentPublications?.slice(0, 3)
          .map(p => p.title).join('; ') || '';
        
        return `- ${a.name || a.username}:
    • Bidang Riset: ${researchAreas}
    ${hIndex ? `• ${hIndex}` : ''}
    ${pubCount ? `• ${pubCount}` : ''}
    ${recentPubs ? `• Publikasi Terbaru: ${recentPubs}` : ''}`;
      }).join('\n\n');

      const prompt = `
Kamu adalah sistem AI untuk membantu penugasan asesor akreditasi program studi.

Program Studi yang akan diakreditasi: "${programStudi}"

Daftar Asesor yang tersedia:
${assessorList}

Tugas: Berikan skor kesesuaian (0-100) untuk setiap asesor berdasarkan:
1. Kedekatan bidang riset dengan program studi
2. H-Index (semakin tinggi semakin bagus)
3. Jumlah publikasi
4. Relevansi publikasi terbaru dengan bidang yang diakreditasi

Kriteria penilaian:
- 90-100: Bidang riset sama persis, H-Index tinggi, banyak publikasi relevan
- 70-89: Bidang riset serumpun/terkait erat, H-Index cukup baik
- 50-69: Bidang dalam rumpun sama, masih bisa menilai aspek tertentu
- 30-49: Bidang berbeda tapi ada overlap minor
- 0-29: Bidang sangat berbeda

PENTING: Berikan "reason" yang SPESIFIK untuk setiap asesor, sebutkan:
- Bidang riset spesifik yang relevan
- Kelebihan/kekurangan mereka untuk menilai program studi ini
- Jangan generik seperti "keahlian sesuai" - jelaskan kenapa!

Format output (JSON saja, tanpa markdown):
[
  {"name": "nama asesor", "score": 85, "reason": "Ahli di bidang [X] yang sangat relevan dengan [Y], memiliki H-Index [Z] dan publikasi tentang [topik terkait]"}
]

PENTING: Output hanya JSON array, tanpa penjelasan lain.
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Clean the response and parse JSON
      let cleanedResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      let rankings = [];
      try {
        rankings = JSON.parse(cleanedResponse);
      } catch (e) {
        console.warn('[Gemini] Failed to parse AI response, using default ranking');
        return assessors.map((a, i) => ({
          ...a,
          similarityScore: 50,
          aiRecommendation: 'Gagal parsing respons AI',
          rank: i + 1
        }));
      }

      // Map rankings back to assessors and sort by score
      const rankedAssessors = assessors.map(assessor => {
        const ranking = rankings.find(r => 
          r.name.toLowerCase().includes(assessor.name?.toLowerCase() || '') ||
          assessor.name?.toLowerCase().includes(r.name.toLowerCase())
        );
        
        return {
          ...assessor,
          similarityScore: ranking?.score || 50,
          aiRecommendation: ranking?.reason || 'Tidak ada rekomendasi',
          rank: 0  // Will be set after sorting
        };
      });

      // Sort by similarity score (descending) and assign ranks
      rankedAssessors.sort((a, b) => b.similarityScore - a.similarityScore);
      rankedAssessors.forEach((a, i) => { a.rank = i + 1; });

      console.log(`[Gemini] ✅ Assessor matching complete for "${programStudi}"`);
      return rankedAssessors;

    } catch (error) {
      console.error('[Gemini] Assessor matching error:', error.message);
      return assessors.map((a, i) => ({
        ...a,
        similarityScore: 50,
        aiRecommendation: `Error: ${error.message}`,
        rank: i + 1
      }));
    }
  }
}

module.exports = new GeminiService();

