#!/usr/bin/env python3
"""
Script untuk menganalisis file LKPS Excel dan menemukan field yang menyebabkan skor 0
Untuk LAM-TEK 2025 - Program Magister

Usage:
    python analyze_lkps.py
"""

import pandas as pd
import os
import json
from pathlib import Path

# Field yang dicari (menyebabkan skor 0)
REQUIRED_FIELDS = {
    "Kriteria 2 - Akuntabilitas": {
        "bop_value": "BOP per mahasiswa (Rupiah)",
        "dpd_total": "Total dana penelitian DTPS (Rupiah)",
        "jumlah_dtps": "Jumlah Dosen Tetap Program Studi"
    },
    "Kriteria 4 - SDM": {
        "rbk_dtps": "Rasio Bidang Keahlian DTPS (%)",
        "publikasi_ilmiah_dtps_ri": "Publikasi ilmiah DTPS di jurnal internasional bereputasi",
        "publikasi_ilmiah_dtps_rn": "Publikasi ilmiah DTPS di jurnal nasional terakreditasi"
    },
    "Kriteria 6 - Mahasiswa": {
        "pma": "Persentase Mahasiswa Asing (%)",
        "tingkat_tempat_kerja_ri": "Lulusan bekerja di perusahaan internasional/multinasional",
        "tingkat_tempat_kerja_rn": "Lulusan bekerja di perusahaan nasional besar"
    }
}

def analyze_excel_file(file_path):
    """Analisis file Excel LKPS"""
    print(f"📊 Menganalisis file: {file_path}")
    print("=" * 80)
    
    if not os.path.exists(file_path):
        print(f"❌ File tidak ditemukan: {file_path}")
        return
    
    try:
        # Baca semua sheet
        excel_file = pd.ExcelFile(file_path)
        sheet_names = excel_file.sheet_names
        
        print(f"\n📋 Ditemukan {len(sheet_names)} sheet:\n")
        for i, sheet in enumerate(sheet_names, 1):
            print(f"   {i}. {sheet}")
        
        print("\n" + "=" * 80)
        print("🔍 MENCARI FIELD YANG HILANG (Menyebabkan Skor 0)")
        print("=" * 80)
        
        results = {}
        
        # Analisis setiap kriteria
        for kriteria, fields in REQUIRED_FIELDS.items():
            print(f"\n{'='*80}")
            print(f"📌 {kriteria}")
            print(f"{'='*80}")
            
            results[kriteria] = {}
            
            for field_key, field_desc in fields.items():
                print(f"\n🔎 Mencari: {field_desc}")
                print(f"   Field key: {field_key}")
                
                found = False
                found_location = []
                
                # Cari di semua sheet
                for sheet_name in sheet_names:
                    try:
                        df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
                        
                        # Cari keyword di seluruh sheet
                        keywords = [
                            "BOP", "bop", "biaya operasional",
                            "dana penelitian", "DPD", "dtps", "DTPS",
                            "publikasi", "jurnal", "internasional", "nasional",
                            "mahasiswa asing", "asing", "foreign",
                            "tempat kerja", "perusahaan", "lulusan", "kerja",
                            "rasio", "bidang keahlian", "RBK"
                        ]
                        
                        for keyword in keywords:
                            if field_key.lower().find(keyword.lower()) >= 0 or field_desc.lower().find(keyword.lower()) >= 0:
                                # Cari keyword di dataframe
                                for row_idx, row in df.iterrows():
                                    for col_idx, cell in enumerate(row):
                                        if pd.notna(cell) and keyword.lower() in str(cell).lower():
                                            found = True
                                            found_location.append({
                                                'sheet': sheet_name,
                                                'row': row_idx + 1,
                                                'col': col_idx + 1,
                                                'value': str(cell)[:50]
                                            })
                                            break
                                    if found:
                                        break
                            if found:
                                break
                        if found:
                            break
                    except Exception as e:
                        continue
                
                if found_location:
                    print(f"   ✅ DITEMUKAN di:")
                    for loc in found_location[:3]:  # Tampilkan max 3 lokasi
                        print(f"      - Sheet: '{loc['sheet']}', Row: {loc['row']}, Col: {loc['col']}")
                        print(f"        Text: {loc['value']}")
                    results[kriteria][field_key] = {
                        'status': 'found',
                        'locations': found_location[:3]
                    }
                else:
                    print(f"   ❌ TIDAK DITEMUKAN - Ini yang menyebabkan skor 0!")
                    results[kriteria][field_key] = {
                        'status': 'not_found',
                        'locations': []
                    }
        
        # Simpan hasil analisis
        output_file = os.path.join(os.path.dirname(__file__), 'analisis_hasil.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print("\n" + "=" * 80)
        print("📝 RINGKASAN ANALISIS")
        print("=" * 80)
        
        total_fields = sum(len(fields) for fields in REQUIRED_FIELDS.values())
        found_count = sum(1 for k in results.values() for v in k.values() if v['status'] == 'found')
        missing_count = total_fields - found_count
        
        print(f"\n✅ Field ditemukan: {found_count}/{total_fields}")
        print(f"❌ Field hilang: {missing_count}/{total_fields}")
        print(f"\n💾 Hasil analisis disimpan di: {output_file}")
        
        print("\n" + "=" * 80)
        print("📋 REKOMENDASI")
        print("=" * 80)
        print("\nUntuk field yang TIDAK DITEMUKAN, Anda perlu:")
        print("1. Cek manual di sheet yang relevan")
        print("2. Isi data yang kosong")
        print("3. Re-upload LKPS setelah dilengkapi")
        print("\nField yang hilang akan menyebabkan skor 0 pada butir terkait!")
        
    except Exception as e:
        print(f"\n❌ Error saat menganalisis file: {str(e)}")
        import traceback
        traceback.print_exc()

def main():
    """Main function"""
    # Cari file LKPS
    base_dir = Path(__file__).parent.parent
    lkps_file = base_dir / "Bahan_LKPS_Lamtek-S2-TIP-Januari2025.xlsx"
    
    # Jika tidak ada, coba cari di Copy of...
    if not lkps_file.exists():
        lkps_file = base_dir / "Copy of Bahan_LKPS_Lamtek-S2-TIP-Januari2025.xlsx"
    
    if not lkps_file.exists():
        print("❌ File LKPS tidak ditemukan!")
        print("   Cari file: Bahan_LKPS_Lamtek-S2-TIP-Januari2025.xlsx")
        print(f"   Di folder: {base_dir}")
        return
    
    analyze_excel_file(str(lkps_file))

if __name__ == "__main__":
    main()
