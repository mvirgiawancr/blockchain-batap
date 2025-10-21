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

{"LED Content Preview (Strategic Sampling): " + led_content[:3000] if led_content else "LED content not provided"}

{"LKPS Content Preview: " + lkps_content[:3000] if lkps_content else "LKPS content not provided"}

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
5. KEUANGAN, SARANA PRASARANA → kata kunci: keuangan, anggaran, laboratorium, perpustakaan
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
    
    async def extract_text_from_pdf(self, pdf_content: bytes) -> str:
        """Extract text from PDF for deeper analysis - strategically samples pages"""
        try:
            print(f"[Gemini] extract_text_from_pdf: Starting PDF extraction ({len(pdf_content)} bytes)")
            import asyncio
            from PyPDF2 import PdfReader
            import io
            
            def _extract():
                print(f"[Gemini] extract_text_from_pdf: Reading PDF...")
                pdf_file = io.BytesIO(pdf_content)
                reader = PdfReader(pdf_file)
                total_pages = len(reader.pages)
                print(f"[Gemini] extract_text_from_pdf: PDF has {total_pages} pages")
                
                # Strategy: Extract from beginning, middle, and end to detect all 9 criteria
                pages_to_extract = []
                
                # First 5 pages (intro, visi-misi)
                pages_to_extract.extend(range(min(5, total_pages)))
                
                # Middle section (kriteria tengah)
                if total_pages > 10:
                    mid_start = total_pages // 3
                    pages_to_extract.extend(range(mid_start, min(mid_start + 5, total_pages)))
                
                # Near end (luaran, capaian)
                if total_pages > 15:
                    end_start = (total_pages * 2) // 3
                    pages_to_extract.extend(range(end_start, min(end_start + 5, total_pages)))
                
                # Last 2 pages (kesimpulan)
                if total_pages > 20:
                    pages_to_extract.extend(range(max(0, total_pages - 2), total_pages))
                
                # Remove duplicates and sort
                pages_to_extract = sorted(set(pages_to_extract))
                print(f"[Gemini] extract_text_from_pdf: Extracting {len(pages_to_extract)} strategic pages: {pages_to_extract[:10]}...")
                
                text = ""
                for i in pages_to_extract:
                    page_text = reader.pages[i].extract_text()
                    text += f"\n--- Halaman {i+1} ---\n{page_text}\n"
                    
                    # Stop if we have enough text
                    if len(text) > 30000:
                        break
                
                print(f"[Gemini] extract_text_from_pdf: Extraction complete, {len(text)} chars")
                return text[:30000]  # Max 30k chars to cover more criteria
            
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
