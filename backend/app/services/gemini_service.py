import google.generativeai as genai
from typing import Dict, Any, List
from app.config import settings
import json

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
            elif filename.lower().endswith(('.xlsx', '.xls')):
                print(f"[Gemini] Extracting text from Excel...")
                text_content = await self.extract_text_from_excel(file_content)
                print(f"[Gemini] Excel text extracted: {len(text_content)} chars")
            
            # Simple keyword-based validation as fallback
            text_lower = text_content.lower()
            
            if expected_type == "LED":
                # Check for LED keywords
                led_keywords = ["laporan evaluasi diri", "led", "evaluasi diri"]
                found = any(keyword in text_lower for keyword in led_keywords)
                
                if found:
                    return {
                        "isValid": True,
                        "confidence": 0.95,
                        "detectedType": "LED",
                        "reason": "Dokumen mengandung teks 'Laporan Evaluasi Diri'"
                    }
                else:
                    return {
                        "isValid": False,
                        "confidence": 0.3,
                        "detectedType": "OTHER",
                        "reason": "Dokumen tidak mengandung teks LED atau Laporan Evaluasi Diri"
                    }
            
            elif expected_type == "LKPS":
                # Check for LKPS keywords
                lkps_keywords = ["laporan kinerja program studi", "lkps", "kinerja program"]
                found = any(keyword in text_lower for keyword in lkps_keywords)
                
                if found:
                    return {
                        "isValid": True,
                        "confidence": 0.95,
                        "detectedType": "LKPS",
                        "reason": "Dokumen mengandung teks 'Laporan Kinerja Program Studi'"
                    }
                else:
                    return {
                        "isValid": False,
                        "confidence": 0.3,
                        "detectedType": "OTHER",
                        "reason": "Dokumen tidak mengandung teks LKPS atau Laporan Kinerja Program Studi"
                    }
            
            # If we can't determine, use AI
            prompt = f"""
Anda adalah validator dokumen akreditasi. Verifikasi apakah dokumen ini adalah {expected_type}.

Nama File: {filename}
Expected Type: {expected_type}

Cuplikan Isi Dokumen:
{text_content[:3000]}

Kriteria Sederhana:
- LED: Jika ada teks "Laporan Evaluasi Diri" atau "LED" di dokumen, maka VALID
- LKPS: Jika ada teks "Laporan Kinerja Program Studi" atau "LKPS" di dokumen, maka VALID

Tugas:
Cek apakah dokumen mengandung teks sesuai dengan tipe yang diharapkan ({expected_type}).
Jika ada, set isValid=true dan confidence=0.9 atau lebih.
Jika tidak ada, set isValid=false.

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
                    led_content = content[:8000]  # First 8000 chars
                    print(f"[Gemini] LED content loaded: {len(led_content)} chars")
                elif "LKPS" in doc_type:
                    lkps_content = content[:8000]
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

PENTING: Ini adalah penilaian KELENGKAPAN dokumen, bukan penilaian MUTU konten. Jika dokumen LED/LKPS ada dan berformat benar, berikan nilai tinggi.

Program Studi: {program_studi}
Institusi: {institusi}

📊 INFORMASI UKURAN FILE (PENTING UNTUK SCORING):
- LED File: {led_size_mb} MB ({led_metadata.get('filename', 'N/A')})
- LKPS File: {lkps_size_mb} MB ({lkps_metadata.get('filename', 'N/A')})

Dokumen yang diupload:
{json.dumps(documents, indent=2)}

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
   - Pengelolaan keuangan
   - Sarana pembelajaran dan penelitian
   
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

{"LED Content Preview: " + led_content[:2000] if led_content else "LED content not provided"}

{"LKPS Content Preview: " + lkps_content[:2000] if lkps_content else "LKPS content not provided"}

TUGAS ANALISIS:
1. Verifikasi keberadaan LED dan LKPS (WAJIB)
2. Berikan skor kelengkapan dalam skala 0-4 (Standar BAN-PT):

PEDOMAN SCORING YANG ADIL (BERDASARKAN UKURAN FILE):

⭐ SKOR 4 (UNGGUL) - Berikan jika:
   - LED dan LKPS keduanya ada dan terverifikasi
   - LED ≥ 2 MB (menunjukkan dokumen lengkap 100+ halaman)
   - LKPS ≥ 0.5 MB (menunjukkan data lengkap banyak sheet)
   - Preview konten menunjukkan struktur dokumen akademik formal
   - Tidak perlu semua 9 kriteria disebutkan eksplisit di preview
   ➡️ Untuk file di atas: LED {led_size_mb}MB + LKPS {lkps_size_mb}MB → Jika LED ≥2MB DAN LKPS ≥0.5MB = SKOR 4!

⭐ SKOR 3 (TERAKREDITASI A) - Berikan jika:
   - LED dan LKPS ada dan terverifikasi
   - LED 0.5-2 MB atau LKPS 0.2-0.5 MB
   - Preview menunjukkan dokumen akademik formal
   ➡️ Untuk file di atas: Salah satu file agak kecil tapi masih cukup lengkap

⭐ SKOR 2 (TERAKREDITASI B) - Berikan jika:
   - LED dan LKPS ada tapi keduanya kecil
   - LED < 0.5 MB dan LKPS < 0.2 MB
   - Preview konten menunjukkan dokumen kurang lengkap

⭐ SKOR 1 (TERAKREDITASI C) - Berikan jika:
   - Hanya salah satu dokumen yang ada (LED saja atau LKPS saja)
   - Atau kedua dokumen sangat minim (< 100 KB)

⭐ SKOR 0 (TIDAK TERAKREDITASI) - Berikan jika:
   - Tidak ada LED dan LKPS sama sekali
   - File tidak valid atau rusak

CATATAN PENTING:
- LIHAT UKURAN FILE DI ATAS! Ini indikator paling akurat kelengkapan
- Preview hanya menampilkan 5 halaman pertama dari ratusan halaman
- Ukuran file LED >2MB biasanya = 100+ halaman = LENGKAP
- Ukuran file LKPS >0.5MB biasanya = 20+ sheet = LENGKAP
- Jika LED ≥2MB DAN LKPS ≥0.5MB → OTOMATIS SKOR 4 (kecuali preview menunjukkan file rusak)
- Fokus pada KELENGKAPAN DOKUMEN, bukan analisis mendalam konten

TUGAS ANALISIS (WAJIB LENGKAPI SEMUA):
1. Verifikasi keberadaan LED dan LKPS (WAJIB)
2. Berikan skor kelengkapan 0-4 berdasarkan ukuran file
3. Identifikasi kriteria yang terlihat dari preview
4. **WAJIB: Berikan minimal 2-3 flags** (temuan/catatan penting)
5. **WAJIB: Berikan minimal 3-5 recommendations** (saran perbaikan konstruktif)

Format Output JSON (WAJIB LENGKAP):
{{
  "scoreCompleteness": 4,
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
    "Dokumen LED berukuran {led_size_mb}MB menunjukkan kelengkapan tinggi",
    "Dokumen LKPS berukuran {lkps_size_mb}MB menunjukkan data komprehensif",
    "Preview menampilkan struktur dokumen akademik yang formal"
  ],
  "recommendations": [
    "Pastikan konsistensi data antara LED dan LKPS",
    "Verifikasi kelengkapan 9 kriteria akreditasi di LED",
    "Periksa keakuratan data kuantitatif di LKPS",
    "Lengkapi dokumentasi pendukung jika ada yang kurang",
    "Siapkan bukti dukung untuk setiap klaim di LED"
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
            if "scoreCompleteness" not in result:
                result["scoreCompleteness"] = 2
            else:
                # Ensure score is between 0-4
                score = result["scoreCompleteness"]
                if isinstance(score, float) and score <= 1.0:
                    # Convert old percentage format (0.0-1.0) to new scale (0-4)
                    result["scoreCompleteness"] = int(score * 4)
                result["scoreCompleteness"] = max(0, min(4, int(result["scoreCompleteness"])))
            
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
            
            # Return default cautious response with scoring matrix structure
            return {
                "scoreCompleteness": 0.5,
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
    
    async def extract_text_from_pdf(self, pdf_content: bytes) -> str:
        """Extract text from PDF for deeper analysis"""
        try:
            print(f"[Gemini] extract_text_from_pdf: Starting PDF extraction ({len(pdf_content)} bytes)")
            import asyncio
            from PyPDF2 import PdfReader
            import io
            
            def _extract():
                print(f"[Gemini] extract_text_from_pdf: Reading PDF...")
                pdf_file = io.BytesIO(pdf_content)
                reader = PdfReader(pdf_file)
                print(f"[Gemini] extract_text_from_pdf: PDF has {len(reader.pages)} pages")
                
                text = ""
                for i, page in enumerate(reader.pages[:5]):  # Only first 5 pages for performance
                    print(f"[Gemini] extract_text_from_pdf: Extracting page {i+1}...")
                    text += page.extract_text() + "\n"
                
                print(f"[Gemini] extract_text_from_pdf: Extraction complete, {len(text)} chars")
                return text[:5000]  # Limit to 5000 chars
            
            # Run blocking I/O in thread pool
            print(f"[Gemini] extract_text_from_pdf: Running in thread pool...")
            result = await asyncio.to_thread(_extract)
            print(f"[Gemini] extract_text_from_pdf: ✓ Done")
            return result
        except Exception as e:
            print(f"[Gemini] extract_text_from_pdf: Error - {e}")
            import traceback
            traceback.print_exc()
            return ""
    
    async def extract_text_from_excel(self, excel_content: bytes) -> str:
        """Extract text from Excel for deeper analysis"""
        try:
            print(f"[Gemini] extract_text_from_excel: Starting Excel extraction ({len(excel_content)} bytes)")
            import asyncio
            from openpyxl import load_workbook
            import io
            
            def _extract():
                print(f"[Gemini] extract_text_from_excel: Loading workbook...")
                excel_file = io.BytesIO(excel_content)
                workbook = load_workbook(excel_file)
                print(f"[Gemini] extract_text_from_excel: Workbook has {len(workbook.sheetnames)} sheets")
                
                text = ""
                for sheet_name in workbook.sheetnames[:3]:  # First 3 sheets
                    sheet = workbook[sheet_name]
                    print(f"[Gemini] extract_text_from_excel: Processing sheet '{sheet_name}'...")
                    for row in list(sheet.iter_rows(values_only=True))[:50]:  # First 50 rows
                        text += " ".join([str(cell) for cell in row if cell]) + "\n"
                
                print(f"[Gemini] extract_text_from_excel: Extraction complete, {len(text)} chars")
                return text[:5000]  # Limit to 5000 chars
            
            # Run blocking I/O in thread pool
            print(f"[Gemini] extract_text_from_excel: Running in thread pool...")
            result = await asyncio.to_thread(_extract)
            print(f"[Gemini] extract_text_from_excel: ✓ Done")
            return result
        except Exception as e:
            print(f"[Gemini] extract_text_from_excel: Error - {e}")
            import traceback
            traceback.print_exc()
            return ""

gemini_service = GeminiService()
