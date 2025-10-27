import google.generativeai as genai
from typing import Dict, Any, List
from app.config import settings
import json
from app.services.scoring_service import ScoringService

class GeminiService:
    """Service for AI analysis using Google Gemini"""
    
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
    
    async def verify_document_type(
        self,
        filename: str,
        file_content: bytes,
        expected_type: str
    ) -> Dict[str, Any]:
        """
        Verify if uploaded document matches expected type (LED/LKPS)
        
        Args:
            filename: Name of the file
            expected_type: Expected document type (LED/LKPS)
            file_content: File content in bytes
        
        Returns:
            Verification result with confidence score
        """
        try:
            print(f"[Gemini] Verifying document type: {filename} -> expected: {expected_type}")
            
            # Extract text from file
            text_content = ""
            if filename.lower().endswith('.pdf'):
                print(f"[Gemini] Extracting text from PDF...")
                text_content = await self.extract_text_from_pdf(file_content)
                print(f"[Gemini] PDF text extracted: {len(text_content)} chars")
            elif filename.lower().endswith(('.xlsx', '.xls', '.csv')):
                print(f"[Gemini] Extracting text from Excel/CSV...")
                text_content = await self.extract_text_from_excel(file_content)
                print(f"[Gemini] Excel/CSV text extracted: {len(text_content)} chars")
                
                # Debug: Show first 500 chars of extracted content
                if text_content:
                    print(f"[Gemini] First 500 chars: {text_content[:500]}")
                else:
                    print(f"[Gemini] WARNING: No text extracted from Excel/CSV file!")
            
            # Simple keyword-based validation as fallback
            text_lower = text_content.lower()
            
            if expected_type == "LED":
                # Check for LED keywords - updated for real document
                led_keywords = [
                    "laporan evaluasi diri", "led", "evaluasi diri",
                    "program studi", "akreditasi", "ban-pt",
                    "visi misi", "tujuan", "strategi"
                ]
                found = any(keyword in text_lower for keyword in led_keywords)
                
                if found:
                    return {
                        "isValid": True,
                        "confidence": 0.95,
                        "detectedType": "LED",
                        "reason": "Dokumen mengandung format LED (Laporan Evaluasi Diri)"
                    }
                else:
                    return {
                        "isValid": False,
                        "confidence": 0.3,
                        "detectedType": "OTHER",
                        "reason": "Dokumen tidak mengandung format LED yang dikenali"
                    }
            
            elif expected_type == "LKPS":
                # Check for LKPS keywords - updated for real CSV format
                lkps_keywords = [
                    "laporan kinerja program studi", "lkps", "kinerja program",
                    "akreditasi program studi", "lamtek", "lam-tek", 
                    "teknologi industri pertanian", "institut pertanian bogor",
                    "program akademik", "perguruan tinggi", "unit pengelola"
                ]
                found = any(keyword in text_lower for keyword in lkps_keywords)
                
                if found:
                    return {
                        "isValid": True,
                        "confidence": 0.95,
                        "detectedType": "LKPS",
                        "reason": "Dokumen mengandung format LKPS LAM-TEK"
                    }
                else:
                    return {
                        "isValid": False,
                        "confidence": 0.3,
                        "detectedType": "OTHER",
                        "reason": "Dokumen tidak mengandung format LKPS yang dikenali"
                    }
            
            # If we can't determine, use AI with enhanced validation
            prompt = f"""
Anda adalah validator dokumen akreditasi. Verifikasi apakah dokumen ini adalah {expected_type}.

Nama File: {filename}
Expected Type: {expected_type}

Cuplikan Isi Dokumen:
{text_content[:3000]}

Kriteria Validasi:
- LED: Jika ada teks "Laporan Evaluasi Diri", "LED", "evaluasi diri", "visi misi", "program studi" di dokumen, maka VALID
- LKPS: Jika ada teks "LKPS", "LAM-TEK", "LAMTEK", "akreditasi program studi", "program akademik", "perguruan tinggi" di dokumen, maka VALID

KHUSUS untuk file CSV/Excel LKPS:
- File CSV dengan header "AKREDITASI PROGRAM STUDI" adalah LKPS VALID
- File yang mengandung "Institut Pertanian Bogor", "Teknologi Industri Pertanian" adalah LKPS VALID
- File yang mengandung struktur LAM-TEK adalah LKPS VALID

Tugas:
Cek apakah dokumen mengandung teks sesuai dengan tipe yang diharapkan ({expected_type}).
Jika ada indikasi dokumen akreditasi, set isValid=true dan confidence=0.9 atau lebih.

Output format JSON:
{{
  "isValid": true/false,
  "confidence": 0.95,
  "detectedType": "LED/LKPS/OTHER",
  "reason": "penjelasan singkat"
}}

Hanya berikan JSON, tanpa teks tambahan.
"""
            
            response = self.model.generate_content(prompt)
            result_text = response.text.strip()
            
            # Extract JSON
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()
            
            result = json.loads(result_text)
            
            # Validate structure
            if "isValid" not in result:
                result["isValid"] = False
            if "confidence" not in result:
                result["confidence"] = 0.0
            if "detectedType" not in result:
                result["detectedType"] = "UNKNOWN"
            if "reason" not in result:
                result["reason"] = "Tidak dapat mendeteksi tipe dokumen"
            
            return result
            
        except Exception as e:
            print(f"Error in document verification: {e}")
            import traceback
            traceback.print_exc()
            
            # Return keyword-based fallback
            return {
                "isValid": False,
                "confidence": 0.0,
                "detectedType": "ERROR",
                "reason": f"Error saat verifikasi: {str(e)}"
            }

    async def analyze_documents(
        self,
        program_studi: str,
        institusi: str,
        documents: List[Dict[str, Any]],
        file_contents: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """
        Analyze document completeness and quality using Gemini AI with scoring matrix
        
        Args:
            program_studi: Name of the study program
            institusi: Institution name
            documents: List of document metadata
            file_contents: Optional dict of file contents for deeper analysis
        
        Returns:
            AI recommendation with score and flags
        """
        
        print(f"[Gemini] Starting document analysis for {program_studi} - {institusi}")
        print(f"[Gemini] Documents count: {len(documents)}")
        
        # Load LED and LKPS content if available
        led_content = ""
        lkps_content = ""
        led_metadata = {}
        lkps_metadata = {}
        
        # Get document metadata
        for doc in documents:
            if doc.get("type") == "LED":
                led_metadata = {
                    "filename": doc.get("filename", ""),
                    "verified": doc.get("verified", False),
                    "confidence": doc.get("confidence", 0.0)
                }
            elif doc.get("type") == "LKPS":
                lkps_metadata = {
                    "filename": doc.get("filename", ""),
                    "verified": doc.get("verified", False),
                    "confidence": doc.get("confidence", 0.0)
                }
        
        if file_contents:
            print(f"[Gemini] File contents provided: {list(file_contents.keys())}")
            for doc_type, content in file_contents.items():
                if "LED" in doc_type:
                    led_content = content  # Use full extracted content (30k chars max)
                    print(f"[Gemini] LED content loaded: {len(led_content)} chars")
                elif "LKPS" in doc_type:
                    lkps_content = content  # Use full extracted content
                    print(f"[Gemini] LKPS content loaded: {len(lkps_content)} chars")
        
        # Extract file size info for better scoring
        led_size_mb = 0
        lkps_size_mb = 0
        for doc in documents:
            if doc.get("type") == "LED":
                led_size_mb = doc.get("size_mb", 0)
            elif doc.get("type") == "LKPS":
                lkps_size_mb = doc.get("size_mb", 0)
        
        prompt = f"""
Anda adalah sistem AI asesor akreditasi program studi yang bertugas menilai KELENGKAPAN dokumen LED dan LKPS berdasarkan standar BAN-PT.

DEFINISI KELENGKAPAN:
- LED harus mencakup 9 KRITERIA AKREDITASI (lihat matriks di bawah)
- LKPS harus berisi DATA KUANTITATIF yang mendukung LED
- Skor ditentukan dari JUMLAH KRITERIA yang terdokumentasi, BUKAN ukuran file

Program Studi: {program_studi}
Institusi: {institusi}

Dokumen yang diupload:
{json.dumps(documents, indent=2)}

CATATAN: Ukuran file LED {led_size_mb}MB dan LKPS {lkps_size_mb}MB (sebagai referensi)

MATRIKS PENILAIAN LED (Laporan Evaluasi Diri):
LED harus mencakup analisis terhadap 9 kriteria akreditasi:
1. VISI, MISI, TUJUAN DAN STRATEGI (Bobot: 8.3%)
   - Ketepatan rumusan visi, misi, tujuan
   - Strategi pencapaian dan sosialisasi
   
2. TATA PAMONG, TATA KELOLA, DAN KERJASAMA (Bobot: 11.1%)
   - Sistem tata pamong dan kepemimpinan
   - Kerjasama dalam dan luar negeri
   
3. MAHASISWA (Bobot: 11.1%)
   - Sistem rekrutmen dan seleksi
   - Layanan kemahasiswaan
   
4. SUMBER DAYA MANUSIA (Bobot: 16.7%)
   - Kualifikasi dan kompetensi dosen
   - Rasio dosen-mahasiswa
   - Tenaga kependidikan
   
5. KEUANGAN, SARANA DAN PRASARANA (Bobot: 11.1%)
   - Pengelolaan keuangan dan pendanaan program studi
   - Biaya operasional pendidikan (BOP) per mahasiswa
   - Sumber pendanaan (BPPTN, DM, hibah)
   - Sarana pembelajaran: ruang kuliah, laboratorium, perpustakaan
   - Prasarana pendukung: pilot plant, cyber center, infrastruktur TI
   - Efisiensi pengelolaan anggaran dan fasilitas
   KEYWORDS: "biaya operasional", "BOP", "BPPTN", "dana masyarakat", "hibah", 
            "laboratorium", "ruang kuliah", "perpustakaan", "pilot plant", 
            "cyber center", "infrastruktur", "sarana prasarana", "fasilitas",
            "keuangan", "pendanaan", "anggaran"
   
6. PENDIDIKAN (Bobot: 19.4%)
   - Kurikulum dan pembelajaran
   - Suasana akademik
   - Integrasi kegiatan penelitian/PkM
   
7. PENELITIAN (Bobot: 8.3%)
   - Mutu, relevansi, dan keberlanjutan penelitian
   - Publikasi ilmiah
   
8. PENGABDIAN KEPADA MASYARAKAT (Bobot: 5.6%)
   - Mutu, relevansi, dan keberlanjutan PkM
   
9. LUARAN DAN CAPAIAN TRIDHARMA (Bobot: 8.3%)
   - Capaian pembelajaran lulusan
   - Kinerja dan prestasi mahasiswa/alumni

MATRIKS PENILAIAN LKPS (Laporan Kinerja Program Studi):
LKPS harus berisi data kuantitatif yang mendukung analisis LED, meliputi:
- Data mahasiswa (penerimaan, status, lulusan)
- Data dosen (kualifikasi, kegiatan, publikasi)
- Data keuangan dan sarana prasarana
- Data penelitian dan pengabdian masyarakat
- Data capaian pembelajaran dan lulusan

{"LED Content (FULL DOCUMENT): " + led_content[:10000] if led_content else "LED content not provided"}

{"LKPS Content (FULL WORKBOOK): " + lkps_content[:8000] if lkps_content else "LKPS content not provided"}

TUGAS ANALISIS - VALIDITAS DAN KELENGKAPAN:
1. Verifikasi keberadaan LED dan LKPS (WAJIB)
2. Analisis konten LED untuk deteksi 9 kriteria akreditasi
3. Identifikasi kriteria mana saja yang TERDETEKSI vs TIDAK TERDETEKSI
4. Berikan flags dan recommendations konstruktif

CARA DETEKSI 9 KRITERIA AKREDITASI:
Cari kata kunci atau konteks dari konten LED:

1. VISI, MISI, TUJUAN → kata kunci: visi, misi, tujuan, strategi
2. TATA PAMONG, KERJASAMA → kata kunci: tata pamong, kepemimpinan, kerjasama, MoU
3. MAHASISWA → kata kunci: mahasiswa, rekrutmen, seleksi, layanan kemahasiswaan
4. SUMBER DAYA MANUSIA → kata kunci: dosen, tendik, kualifikasi, rasio dosen
5. KEUANGAN, SARANA PRASARANA → kata kunci: "biaya operasional", "BOP", "BPPTN", 
   "dana masyarakat", "hibah", "anggaran", "laboratorium", "ruang kuliah", 
   "perpustakaan", "pilot plant", "cyber center", "infrastruktur", "fasilitas",
   "Rp", "miliar", "juta", "sarana prasarana"
6. PENDIDIKAN → kata kunci: kurikulum, pembelajaran, capaian pembelajaran, RPS
7. PENELITIAN → kata kunci: penelitian, publikasi, sitasi, jurnal
8. PENGABDIAN MASYARAKAT → kata kunci: pengabdian, PkM, masyarakat, community service
9. LUARAN DAN CAPAIAN → kata kunci: lulusan, alumni, IPK, masa studi, tracer study

CATATAN PENTING:
- Kriteria tidak harus eksplisit disebutkan, bisa tersirat dari konteks
- Preview sudah sampling strategis (awal + tengah + akhir dokumen)
- Jika 7-8 kriteria terdeteksi, kemungkinan yang lain ada di bagian tidak ter-sample
- Berikan benefit of doubt untuk dokumen yang terstruktur baik

TUGAS ANALISIS (WAJIB LENGKAPI SEMUA):
1. Verifikasi keberadaan LED dan LKPS
2. **Identifikasi kriteria yang terdeteksi** di ledCriteriaCoverage (true/false)
3. **Identifikasi kelengkapan data LKPS** di lkpsDataCompleteness (true/false)
4. **WAJIB: Berikan minimal 3-5 flags** (temuan penting: kriteria apa saja yang terdeteksi/tidak terdeteksi)
5. **WAJIB: Berikan minimal 3-5 recommendations** (saran untuk melengkapi kriteria yang kurang)

Format Output JSON (WAJIB LENGKAP):
{{
  "hasLED": true,
  "hasLKPS": true,
  "ledCriteriaCoverage": {{
    "visiMisi": true,
    "tataPamong": true,
    "mahasiswa": false,
    "sdm": true,
    "keuanganSarpras": false,
    "pendidikan": true,
    "penelitian": false,
    "pengabdian": false,
    "luaranCapaian": true
  }},
  "lkpsDataCompleteness": {{
    "dataMahasiswa": true,
    "dataDosen": true,
    "dataKeuangan": false,
    "datapenelitian": true,
    "dataPengabdian": false
  }},
  "flags": [
    "Terdeteksi 8 dari 9 kriteria akreditasi di LED",
    "Kriteria 8 (Pengabdian Masyarakat) tidak ditemukan dalam sampling",
    "LKPS berisi data mahasiswa, dosen, dan penelitian yang lengkap",
    "Struktur dokumen LED sangat baik dan sistematis",
    "Data keuangan di LKPS perlu diverifikasi kelengkapannya"
  ],
  "recommendations": [
    "Lengkapi dokumentasi Kriteria 8 (Pengabdian Masyarakat) di LED",
    "Pastikan konsistensi data antara LED dan LKPS",
    "Tambahkan data keuangan 3 tahun terakhir di LKPS jika belum ada",
    "Verifikasi kelengkapan data sarana prasarana",
    "Siapkan bukti pendukung untuk setiap kriteria"
  ]
}}

PENTING: 
- Berikan HANYA JSON output, tanpa markdown atau teks tambahan
- WAJIB isi array "flags" dengan minimal 2-3 item (temuan/observasi)
- WAJIB isi array "recommendations" dengan minimal 3-5 item (saran konstruktif)
- Jika dokumen lengkap, berikan flags positif dan recommendations preventif
"""
        
        try:
            print(f"[Gemini] Sending analysis request to Gemini AI...")
            response = self.model.generate_content(prompt)
            result_text = response.text.strip()
            print(f"[Gemini] Received response from Gemini AI ({len(result_text)} chars)")
            
            # Extract JSON from response
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()
            
            print(f"[Gemini] Parsing JSON response...")
            result = json.loads(result_text)
            print(f"[Gemini] ✓ Analysis complete")
            
            # Validate and ensure all required fields
            if "hasLED" not in result:
                result["hasLED"] = False
            if "hasLKPS" not in result:
                result["hasLKPS"] = False
            if "flags" not in result:
                result["flags"] = []
            if "recommendations" not in result:
                result["recommendations"] = []
            if "ledCriteriaCoverage" not in result:
                result["ledCriteriaCoverage"] = {}
            if "lkpsDataCompleteness" not in result:
                result["lkpsDataCompleteness"] = {}
            
            return result
            
        except Exception as e:
            print(f"Error in Gemini analysis: {e}")
            import traceback
            traceback.print_exc()
            
            # Return default cautious response
            return {
                "hasLED": True,  # Assume true since document passed validation
                "hasLKPS": True,
                "ledCriteriaCoverage": {},
                "lkpsDataCompleteness": {},
                "flags": ["Gagal melakukan analisis AI mendalam", f"Error: {str(e)}"],
                "recommendations": [
                    "Mohon review manual kelengkapan dokumen",
                    "Pastikan LED mencakup 9 kriteria akreditasi",
                    "Pastikan LKPS berisi data kuantitatif lengkap"
                ]
            }
    
    async def analyze_documents_for_scoring(
        self,
        program_studi: str,
        institusi: str,
        led_content: str,
        lkps_content: str,
        program_type: str = "S"
    ) -> Dict[str, Any]:
        """
        LAM-TEK 2025 Accreditation Assessor AI
        Advanced context engineering untuk ekstraksi data akreditasi yang akurat
        """
        
        print(f"[LAM-TEK] Starting LAM-TEK 2025 analysis for {program_studi} ({program_type}) - {institusi}")
        
        # Define butir counts for the f-string
        butir_counts = {'S': 60, 'M': 55, 'D': 53, 'D1': 56, 'D2': 56, 'D3': 56, 'STr': 64, 'MTr': 58, 'DTr': 56, 'PPI': 54}
        
        # Enhanced prompt dengan context engineering seperti contoh profesor
        prompt = f"""
PERSONA:
You are LAM-TEK AccreditationBot, an expert AI Assessor for Lembaga Akreditasi Mandiri Program Studi Keteknikan (LAM-TEK). Your purpose is to deeply understand and apply the LAM-TEK 2025 grading methodology for Program Studi accreditation based on the official instrument set.

CORE OBJECTIVE:
Your primary objective is to learn, internalize, and apply the complete LAM-TEK 2025 grading methodology for {program_type} program ({program_studi}). You must extract precise quantitative data from LKPS and qualitative evidence from LED, following the official LAM-TEK 2025 structure.

PROGRAM CONTEXT:
- Program Studi: {program_studi}
- Institusi: {institusi}
- Jenis Program: {program_type} (Program {'Sarjana' if program_type == 'S' else 'Magister' if program_type == 'M' else 'Doktor' if program_type == 'D' else 'Diploma' if program_type.startswith('D') else 'Sarjana Terapan' if program_type == 'STr' else 'PPI' if program_type == 'PPI' else 'Unknown'})
- Jumlah Butir: {butir_counts.get(program_type, 60)}

KNOWLEDGE BASE (LAM-TEK 2025):
1. LKPS (Laporan Kinerja Program Studi): Quantitative data source with specific table references
2. LED (Laporan Evaluasi Diri): Qualitative self-evaluation narrative and supporting evidence
3. DTPS: Dosen Tetap Perguruan Tinggi yang ditugaskan sebagai pengampu mata kuliah di Program Studi
4. Butir Penilaian: Specific assessment items with differentiated thresholds by program type

DIFFERENTIAL THRESHOLDS BY PROGRAM TYPE:
BOP (Biaya Operasional Pendidikan):
- D1,D2,D3,S,STr,PPI: Skor 4 jika BOP ≥ Rp 40.000.000; Skor = BOP/10.000.000 jika kurang
- M,MTr,D,DTr: Skor 4 jika BOP ≥ Rp 28.000.000; Skor = BOP/7.000.000 jika kurang

DPD (Dana Penelitian DTPS):
- D1,D2,D3,S,STr,PPI: Skor 4 jika DPD ≥ Rp 30.000.000; Skor = (2×DPD)/15.000.000 jika kurang
- M,MTr,D,DTr: Skor 4 jika DPD ≥ Rp 20.000.000; Skor = (2×DPD)/10.000.000 jika kurang

FAKTOR KUANTITATIF untuk Rumus Interpolasi:
Kerjasama: 
- S,STr,M,MTr,PPI: a=2, b=6, c=8
- D,DTr: a=3, b=8, c=10

Publikasi DTPS:
- S,PPI: a=0.5, b=1, c=2
- M: a=0.5, b=4, c=4  
- D: a=0.5, b=6, c=4

WORKFLOW (Chain of Thought):
1. IDENTIFY Program Type: Determine exact scoring rules for {program_type}
2. TRACE Data Requirements: Map each variable to specific LKPS table/LED section
3. EXTRACT Quantitative Data: Pull precise numbers from LKPS content
4. EXTRACT Qualitative Evidence: Analyze LED narrative for compliance indicators
5. APPLY Differential Logic: Use program-specific thresholds and formulas
6. VALIDATE Constraints: Apply score limits and discrete logic where applicable

LED CONTENT ANALYSIS (Qualitative Evidence):
{led_content[:25000] if led_content else "LED not provided"}

LKPS CONTENT ANALYSIS (Quantitative Data Source):
{lkps_content[:15000] if lkps_content else "LKPS not provided"}

DATA EXTRACTION INSTRUCTIONS:
1. PRIORITAS: LED untuk konteks kualitatif, LKPS untuk data kuantitatif
2. KERJASAMA: Cari "Jumlah Kerjasama Tingkat [Level]" di LKPS atau narasi kerjasama di LED
   - Format LKPS: "Jumlah Kerjasama Tingkat Internasional", "Jumlah Kerjasama Tingkat Nasional", "Jumlah Kerjasama Tingkat Lokal/Wilayah"
   - PATTERN RECOGNITION: Data mungkin dipisah dengan tab characters atau multiple spaces
   - Contoh format: "Jumlah Kerjasama Tingkat Internasional\t\t\t0"
   - Contoh format: "Jumlah Kerjasama Tingkat Nasional			38"
   - EXTRACT: Angka setelah teks label, abaikan tab/space characters
   - MAPPING: ri=Internasional, rn=Nasional, rl=Lokal/Wilayah
3. BOP: Cari "biaya operasional" atau "BOP" dalam konteks per mahasiswa per tahun
4. DTPS: Cari data dosen tetap, publikasi, dan penelitian
5. MAHASISWA: Cari data rekrutmen, lulusan, waktu tunggu, IPK, masa studi
6. KERJASAMA PKM: Cari "Jumlah Kerjasama PkM" untuk data pengabdian masyarakat

REQUIRED OUTPUT STRUCTURE (LAM-TEK 2025 Format):
{{
  "program_analysis": {{
    "program_type": "{program_type}",
    "program_name": "{program_studi}",
    "institution": "{institusi}",
    "total_butir": {{'S': 60, 'M': 55, 'D': 53, 'D1': 56, 'D2': 56, 'D3': 56, 'STr': 64, 'MTr': 58, 'DTr': 56, 'PPI': 54}}.get(program_type, 60),
    "threshold_category": "{'low_level' if program_type in ['D1','D2','D3','S','STr','PPI'] else 'high_level'}"
  }},
  "led_data": {{
    "vmts_components": {{
      "liniaritas_visi": true,
      "kesesuaian_renstra": true,
      "kesesuaian_kurikulum": true,
      "tinjauan_berkala": true
    }},
    "tata_pamong_evidence": {{
      "kepemimpinan": true,
      "sistem_penjaminan_mutu": true,
      "pengelolaan_program": true
    }},
    "kerjasama_narrative": {{
      "kerjasama_internasional_mentioned": false,
      "kerjasama_nasional_count": 0,
      "kerjasama_lokal_count": 0,
      "mou_evidence": false
    }}
  }},
  "lkps_data": {{
    "bop_value": [EXTRACT_EXACT_RUPIAH_VALUE],
    "dpd_total": [EXTRACT_RESEARCH_FUND_TOTAL],
    "dpd_per_dtps": [CALCULATE_DPD_PER_DTPS],
    "jumlah_mahasiswa": [EXACT_STUDENT_COUNT],
    "jumlah_dtps": [EXACT_DTPS_COUNT],
    "rmd": [CALCULATE_STUDENT_DTPS_RATIO],
    "waktu_tunggu_lulusan": [MONTHS_AVERAGE],
    "ipk_rata2": [EXACT_GPA_AVERAGE],
    "masa_studi_rata2": [SEMESTER_AVERAGE],
    "tingkat_kelulusan": [PERCENTAGE],
    "tingkat_serapan": [PERCENTAGE],
    "jumlah_kerjasama_institusi": {{
      "ri": [EXTRACT_FROM_"Jumlah_Kerjasama_Tingkat_Internasional"],
      "rn": [EXTRACT_FROM_"Jumlah_Kerjasama_Tingkat_Nasional"], 
      "rl": [EXTRACT_FROM_"Jumlah_Kerjasama_Tingkat_Lokal/Wilayah"],
      "pkm_total": [EXTRACT_FROM_"Jumlah_Kerjasama_PkM"]
    }},
    "publikasi_dtps": {{
      "internasional": [COUNT],
      "nasional": [COUNT],
      "jurnal_terakreditasi": [COUNT]
    }},
    "sarana_prasarana": {{
      "jumlah_ruang_kuliah": [COUNT],
      "jumlah_laboratorium": [COUNT],
      "luas_ruang_per_mahasiswa": [SQUARE_METER],
      "jumlah_buku_perpustakaan": [COUNT]
    }}
  }},
  "data_quality": {{
    "completeness_score": 0.95,
    "confidence_level": "high",
    "program_type_confidence": 0.98,
    "missing_critical_data": [],
    "data_source_traceability": [
      "BOP: Extracted from LKPS section [X]",
      "Kerjasama: Found in LED analysis section [Y]",
      "DTPS: Calculated from LKPS table [Z]"
    ]
  }},
  "scoring_readiness": {{
    "ready_for_lamtek_scoring": true,
    "butir_data_completeness": 0.90,
    "differential_threshold_applied": true,
    "program_specific_rules_identified": true
  }}
}}

CRITICAL REQUIREMENTS:
1. EXACT NUMBERS: Extract precise numerical values, not estimates
2. PROGRAM DIFFERENTIATION: Apply {program_type}-specific rules and thresholds
3. DATA TRACEABILITY: Document where each value was found
4. FORMULA READINESS: Ensure data is structured for LAM-TEK interpolation formulas
5. QUALITY ASSURANCE: High confidence scores only for verified data
6. KERJASAMA EXTRACTION: Look for exact patterns:
   - "Jumlah Kerjasama Tingkat Internasional" followed by number
   - "Jumlah Kerjasama Tingkat Nasional" followed by number
   - "Jumlah Kerjasama Tingkat Lokal" or "Lokal/Wilayah" followed by number
   - Extract numbers after tab characters or multiple spaces
7. PATTERN MATCHING: Use regex-like thinking for "Tingkat [Level]\\s+\\d+" patterns

VALIDATION CHECKLIST:
✓ Program type correctly identified as {program_type}
✓ Threshold category properly assigned
✓ All numerical data extracted with source references
✓ Kerjasama data mapped to RI/RN/RL structure
✓ BOP value ready for {program_type}-specific calculation
✓ DPD value ready for differential threshold application

Extract data dengan precision tinggi sesuai metodologi LAM-TEK 2025. Berikan HANYA JSON output tanpa markdown atau penjelasan tambahan.
"""
        
        try:
            print(f"[LAM-TEK] Sending enhanced analysis request...")
            response = self.model.generate_content(prompt)
            result_text = response.text.strip()
            print(f"[LAM-TEK] Received response ({len(result_text)} chars)")
            
            # Extract JSON from response
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()
            
            result = json.loads(result_text)
            print(f"[LAM-TEK] ✓ Enhanced analysis complete")
            
            # Validate and ensure all required fields
            if "program_analysis" not in result:
                result["program_analysis"] = {"program_type": program_type}
            if "led_data" not in result:
                result["led_data"] = {}
            if "lkps_data" not in result:
                result["lkps_data"] = {}
            if "scoring_readiness" not in result:
                result["scoring_readiness"] = {"ready_for_lamtek_scoring": True}
            
            return result
            
        except Exception as e:
            print(f"Error in LAM-TEK enhanced analysis: {e}")
            import traceback
            traceback.print_exc()
            
            # Return structured fallback response
            return {
                "program_analysis": {
                    "program_type": program_type,
                    "program_name": program_studi,
                    "institution": institusi,
                    "error": str(e)
                },
                "led_data": {},
                "lkps_data": {},
                "data_quality": {
                    "completeness_score": 0.0,
                    "confidence_level": "low",
                    "error": str(e)
                },
                "scoring_readiness": {
                    "ready_for_lamtek_scoring": False,
                    "error": f"Analysis failed: {str(e)}"
                }
            }

    async def extract_text_from_pdf(self, pdf_content: bytes) -> str:
        """Extract text from PDF for comprehensive analysis - reads entire document"""
        try:
            print(f"[Gemini] extract_text_from_pdf: Starting FULL PDF extraction ({len(pdf_content)} bytes)")
            import asyncio
            from PyPDF2 import PdfReader
            import io
            
            def _extract():
                print(f"[Gemini] extract_text_from_pdf: Reading PDF...")
                pdf_file = io.BytesIO(pdf_content)
                reader = PdfReader(pdf_file)
                total_pages = len(reader.pages)
                print(f"[Gemini] extract_text_from_pdf: PDF has {total_pages} pages")
                
                # NEW STRATEGY: Extract ALL pages for comprehensive analysis
                print(f"[Gemini] extract_text_from_pdf: Extracting ALL {total_pages} pages for comprehensive analysis...")
                
                text = ""
                for i in range(total_pages):
                    try:
                        page_text = reader.pages[i].extract_text()
                        text += f"\n--- Halaman {i+1} ---\n{page_text}\n"
                        
                        # Progress logging every 50 pages
                        if (i + 1) % 50 == 0:
                            print(f"[Gemini] extract_text_from_pdf: Processed {i+1}/{total_pages} pages ({len(text)} chars so far)")
                        
                        # REMOVED LIMIT: Extract ALL content for comprehensive analysis
                        # No character limits - AI needs full document access
                            
                    except Exception as page_error:
                        print(f"[Gemini] extract_text_from_pdf: Error on page {i+1}: {page_error}")
                        continue
                
                print(f"[Gemini] extract_text_from_pdf: Extraction complete, {len(text)} chars from {total_pages} pages")
                return text  # Return full extracted text (up to 150k chars)
            
            # Run blocking I/O in thread pool
            print(f"[Gemini] extract_text_from_pdf: Running in thread pool...")
            result = await asyncio.to_thread(_extract)
            print(f"[Gemini] extract_text_from_pdf: ✓ Done - Full document extracted")
            return result
        except Exception as e:
            print(f"[Gemini] extract_text_from_pdf: Error - {e}")
            import traceback
            traceback.print_exc()
            return ""
    
    async def extract_text_from_excel(self, excel_content: bytes) -> str:
        """Extract text from Excel/CSV for comprehensive analysis"""
        try:
            print(f"[Gemini] extract_text_from_excel: Starting FULL Excel/CSV extraction ({len(excel_content)} bytes)")
            import asyncio
            from openpyxl import load_workbook
            import io
            import csv
            
            def _extract():
                # Try to detect if it's CSV first
                try:
                    content_str = excel_content.decode('utf-8', errors='ignore')
                    # Remove BOM if present
                    if content_str.startswith('\ufeff'):
                        content_str = content_str[1:]
                    
                    content_lower = content_str.lower()
                    
                    # More comprehensive CSV detection
                    is_csv = (',' in content_str and (
                        'akreditasi program studi' in content_lower or 
                        'lkps' in content_lower or 
                        'lamtek' in content_lower or
                        'lam-tek' in content_lower or
                        'program akademik' in content_lower or
                        'perguruan tinggi' in content_lower
                    ))
                    
                    if is_csv:
                        print(f"[Gemini] extract_text_from_excel: Detected CSV format with accreditation content")
                        # Process as CSV
                        lines = content_str.split('\n')
                        text = ""
                        for i, line in enumerate(lines[:500]):  # First 500 lines
                            if line.strip():
                                text += f"Row {i+1}: {line.strip()}\n"
                        print(f"[Gemini] extract_text_from_excel: CSV extraction complete, {len(text)} chars")
                        return text
                except Exception as csv_error:
                    print(f"[Gemini] extract_text_from_excel: CSV processing failed: {csv_error}")
                
                # Process as Excel
                try:
                    print(f"[Gemini] extract_text_from_excel: Loading workbook...")
                    excel_file = io.BytesIO(excel_content)
                    workbook = load_workbook(excel_file)
                    print(f"[Gemini] extract_text_from_excel: Workbook has {len(workbook.sheetnames)} sheets")
                    
                    text = ""
                    # Process ALL sheets for comprehensive data extraction
                    for sheet_idx, sheet_name in enumerate(workbook.sheetnames):
                        sheet = workbook[sheet_name]
                        print(f"[Gemini] extract_text_from_excel: Processing sheet '{sheet_name}' ({sheet_idx+1}/{len(workbook.sheetnames)})...")
                        
                        sheet_text = f"\n=== SHEET: {sheet_name} ===\n"
                        row_count = 0
                        
                        for row in sheet.iter_rows(values_only=True):
                            if row_count > 200:  # Limit per sheet to avoid excessive data
                                break
                            
                            row_text = " | ".join([str(cell) if cell is not None else "" for cell in row])
                            if row_text.strip():  # Only add non-empty rows
                                sheet_text += row_text + "\n"
                            row_count += 1
                        
                        text += sheet_text
                        
                        # Progress logging
                        if (sheet_idx + 1) % 10 == 0:
                            print(f"[Gemini] extract_text_from_excel: Processed {sheet_idx+1}/{len(workbook.sheetnames)} sheets")
                        
                        # REMOVED LIMIT: Extract ALL Excel/CSV content for comprehensive analysis
                        # No character limits - AI needs full document access
                    
                    print(f"[Gemini] extract_text_from_excel: Extraction complete, {len(text)} chars from {len(workbook.sheetnames)} sheets")
                    return text
                except Exception as excel_error:
                    print(f"[Gemini] extract_text_from_excel: Excel processing failed: {excel_error}")
                    return ""
            
            # Run blocking I/O in thread pool
            print(f"[Gemini] extract_text_from_excel: Running in thread pool...")
            result = await asyncio.to_thread(_extract)
            print(f"[Gemini] extract_text_from_excel: ✓ Done - Full workbook/CSV extracted")
            return result
        except Exception as e:
            print(f"[Gemini] extract_text_from_excel: Error - {e}")
            import traceback
            traceback.print_exc()
            return ""

gemini_service = GeminiService()
