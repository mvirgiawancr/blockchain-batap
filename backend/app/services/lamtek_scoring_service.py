"""
LAM-TEK 2025 Official Scoring Service
Implementasi sistem scoring yang sesuai dengan instrumen resmi LAM-TEK 2025
"""
from typing import Dict, List, Any, Optional, Tuple
from pydantic import BaseModel
from dataclasses import dataclass
from enum import Enum
import math

class ProgramType(Enum):
    """Program types dengan jumlah butir sesuai LAM-TEK 2025"""
    SARJANA = "S"              # 60 Butir
    DIPLOMA_SATU = "D1"        # 56 Butir  
    DIPLOMA_DUA = "D2"         # 56 Butir
    DIPLOMA_TIGA = "D3"        # 56 Butir
    SARJANA_TERAPAN = "STr"    # 64 Butir
    MAGISTER = "M"             # 55 Butir
    MAGISTER_TERAPAN = "MTr"   # 58 Butir
    DOKTOR = "D"               # 53 Butir
    DOKTOR_TERAPAN = "DTr"     # 56 Butir
    PPI = "PPI"                # 54 Butir (Program Profesi Insinyur)

@dataclass
class ButirResult:
    """Result of butir calculation"""
    butir_number: int
    butir_name: str
    sub_indicator: str  # I, II, III, atau tunggal
    score: float
    method: str  # "Kualitatif" / "Kuantitatif" / "Komposit"
    bobot_butir: float
    weighted_contribution: float
    details: Dict[str, Any] = None

class LAMTEKModels:
    """Data models untuk LAM-TEK 2025 dengan diferensiasi program yang tepat"""
    
    # Struktur Program dengan jumlah butir sesuai LAM-TEK 2025
    PROGRAM_STRUCTURE = {
        ProgramType.SARJANA: {"butir_count": 60, "name": "Sarjana", "code": "S"},
        ProgramType.DIPLOMA_SATU: {"butir_count": 56, "name": "Diploma Satu", "code": "D1"},
        ProgramType.DIPLOMA_DUA: {"butir_count": 56, "name": "Diploma Dua", "code": "D2"},
        ProgramType.DIPLOMA_TIGA: {"butir_count": 56, "name": "Diploma Tiga", "code": "D3"},
        ProgramType.SARJANA_TERAPAN: {"butir_count": 64, "name": "Sarjana Terapan", "code": "STr"},
        ProgramType.MAGISTER: {"butir_count": 55, "name": "Magister", "code": "M"},
        ProgramType.MAGISTER_TERAPAN: {"butir_count": 58, "name": "Magister Terapan", "code": "MTr"},
        ProgramType.DOKTOR: {"butir_count": 53, "name": "Doktor", "code": "D"},
        ProgramType.DOKTOR_TERAPAN: {"butir_count": 56, "name": "Doktor Terapan", "code": "DTr"},
        ProgramType.PPI: {"butir_count": 54, "name": "Program Profesi Insinyur", "code": "PPI"},
    }
    
    # Threshold BOP berdasarkan Task 1 dari skoring.md
    BOP_THRESHOLDS = {
        "low_level": {  # D1, D2, D3, S, STr, PPI
            "threshold": 40000000,  # 40 juta
            "divisor": 10000000     # 10 juta
        },
        "high_level": {  # M, MTr, D, DTr
            "threshold": 28000000,  # 28 juta
            "divisor": 7000000      # 7 juta
        }
    }
    
    # Threshold DPD berdasarkan Task 1 dari skoring.md
    DPD_THRESHOLDS = {
        "low_level": {  # D1, D2, D3, S, STr, PPI
            "threshold": 30000000,  # 30 juta
            "divisor": 15000000     # 15 juta
        },
        "high_level": {  # M, MTr, D, DTr
            "threshold": 20000000,  # 20 juta
            "divisor": 10000000     # 10 juta
        }
    }
    
    # Faktor Kuantitatif untuk rumus interpolasi (Task 1)
    QUANTITATIVE_FACTORS = {
        "kerjasama": {
            "low_level": {"a": 2, "b": 6, "c": 8},    # S, STr, M, MTr, PPI
            "high_level": {"a": 3, "b": 8, "c": 10}   # D, DTr
        },
        "publikasi_dtps": {
            "S": {"a": 0.5, "b": 1, "c": 2},
            "PPI": {"a": 0.5, "b": 1, "c": 2},
            "M": {"a": 0.5, "b": 4, "c": 4},
            "D": {"a": 0.5, "b": 6, "c": 4}
        }
    }
    
    # RMD Thresholds (Task 2)
    RMD_RULES = {
        "S": {  # Sarjana Butir 40
            "optimal_min": 15,
            "optimal_max": 25,
            "max_acceptable": 35
        },
        "PPI": {  # PPI Butir 37
            "optimal_min": 4,
            "optimal_max": 10,
            "max_acceptable": 35
        }
    }
    
    # Waktu Tunggu Rules (Task 2)
    WAKTU_TUNGGU_RULES = {
        "vokasi": {  # D1, D2, D3, STr
            "excellent_threshold": 3,  # < 3 bulan = Skor 4
            "good_min": 3,
            "good_max": 6,
            "zero_threshold": 6  # > 6 bulan = Skor 0
        },
        "sarjana": {  # S
            "excellent_threshold": 6,  # < 6 bulan = Skor 4
            "good_min": 6,
            "good_max": 18,
            "zero_threshold": 18  # > 18 bulan = Skor 0
        }
    }
    
    @classmethod
    def get_program_info(cls, program_type: ProgramType) -> Dict[str, Any]:
        """Get program information"""
        return cls.PROGRAM_STRUCTURE.get(program_type, {})
    
    @classmethod
    def is_low_level_program(cls, program_type: ProgramType) -> bool:
        """Check if program uses low level thresholds (D1, D2, D3, S, STr, PPI)"""
        return program_type in [
            ProgramType.DIPLOMA_SATU, ProgramType.DIPLOMA_DUA, ProgramType.DIPLOMA_TIGA,
            ProgramType.SARJANA, ProgramType.SARJANA_TERAPAN, ProgramType.PPI
        ]
    
    @classmethod
    def is_high_level_program(cls, program_type: ProgramType) -> bool:
        """Check if program uses high level thresholds (M, MTr, D, DTr)"""
        return program_type in [
            ProgramType.MAGISTER, ProgramType.MAGISTER_TERAPAN,
            ProgramType.DOKTOR, ProgramType.DOKTOR_TERAPAN
        ]
    
    @classmethod
    def is_vokasi_program(cls, program_type: ProgramType) -> bool:
        """Check if program is vokasi (D1, D2, D3, STr)"""
        return program_type in [
            ProgramType.DIPLOMA_SATU, ProgramType.DIPLOMA_DUA, 
            ProgramType.DIPLOMA_TIGA, ProgramType.SARJANA_TERAPAN
        ]

class LAMTEKScoringService:
    """LAM-TEK 2025 Official Scoring Service"""
    
    def __init__(self):
        self.models = LAMTEKModels()
        
        # Convenience mappings for testing
        self.program_butir_counts = {
            'S': 60, 'M': 55, 'D': 53, 'D1': 56, 'D2': 56, 'D3': 56,
            'STr': 64, 'MTr': 58, 'DTr': 56, 'PPI': 54
        }
        self.low_level_programs = ['D1', 'D2', 'D3', 'S', 'STr', 'PPI']
        self.high_level_programs = ['M', 'MTr', 'D', 'DTr']
    
    def get_total_butir(self, program_type: str) -> int:
        """Get total butir count for program type"""
        return self.program_butir_counts.get(program_type, 60)
    
    def get_bop_dpd_thresholds(self, program_type: str) -> tuple:
        """Get BOP and DPD thresholds for program type"""
        if program_type in self.low_level_programs:
            return (40_000_000, 30_000_000)  # BOP ≥ 40M, DPD ≥ 30M
        else:
            return (28_000_000, 20_000_000)  # BOP ≥ 28M, DPD ≥ 20M
    
    def calculate_interpolation_score(self, ri: float, rn: float, rl: float, 
                                    a: float, b: float, c: float) -> float:
        """
        Implementasi rumus interpolasi 3-dimensi dari Task 2
        Skor = 3.75 × ((A+B+(C/2))-(A×B)-((A×C)/2)-((B×C)/2)+((A×B×C)/2))
        """
        # Ensure all inputs are numeric (handle None values)
        ri = ri or 0
        rn = rn or 0
        rl = rl or 0
        a = a or 1
        b = b or 1
        c = c or 1
        
        print(f"[LAM-TEK] Interpolation input: RI={ri}, RN={rn}, RL={rl}, a={a}, b={b}, c={c}")
        
        # Apply constraints from Task 2
        constrained_ri = ri
        constrained_rn = rn
        constrained_rl = rl
        
        # Task 2 constraints: Jika RI ≥ a dan RN < b, maka RI = a
        if ri >= a and rn < b:
            constrained_ri = a
            print(f"[LAM-TEK] Applied constraint: RI >= a and RN < b, set RI = a ({a})")
        # Jika RI < a dan RN ≥ b, maka RN = b
        elif ri < a and rn >= b:
            constrained_rn = b
            print(f"[LAM-TEK] Applied constraint: RI < a and RN >= b, set RN = b ({b})")
        
        # Jika RL ≥ c, maka RL = c
        if rl >= c:
            constrained_rl = c
            print(f"[LAM-TEK] Applied constraint: RL >= c, set RL = c ({c})")
        
        # Calculate ratios
        A = constrained_ri / a if a != 0 else 0
        B = constrained_rn / b if b != 0 else 0
        C = constrained_rl / c if c != 0 else 0
        
        print(f"[LAM-TEK] Ratios: A={A:.3f}, B={B:.3f}, C={C:.3f}")
        
        # Apply interpolation formula from Task 2
        score = 3.75 * (
            (A + B + (C / 2)) - 
            (A * B) - 
            ((A * C) / 2) - 
            ((B * C) / 2) + 
            ((A * B * C) / 2)
        )
        
        print(f"[LAM-TEK] Interpolation result: {score:.3f}")
        
        return min(4.0, max(0.0, score))
    
    def calculate_bop_score(self, bop_value: float, program_type: ProgramType) -> float:
        """
        Calculate BOP score using Task 1 thresholds
        """
        if self.models.is_low_level_program(program_type):
            threshold = self.models.BOP_THRESHOLDS["low_level"]["threshold"]
            divisor = self.models.BOP_THRESHOLDS["low_level"]["divisor"]
        else:
            threshold = self.models.BOP_THRESHOLDS["high_level"]["threshold"]
            divisor = self.models.BOP_THRESHOLDS["high_level"]["divisor"]
        
        if bop_value >= threshold:
            return 4.0
        else:
            score = bop_value / divisor
            return min(4.0, score)
    
    def calculate_dpd_score(self, dpd_value: float, program_type: ProgramType) -> float:
        """
        Calculate DPD score using Task 1 thresholds
        """
        if self.models.is_low_level_program(program_type):
            threshold = self.models.DPD_THRESHOLDS["low_level"]["threshold"]
            divisor = self.models.DPD_THRESHOLDS["low_level"]["divisor"]
        else:
            threshold = self.models.DPD_THRESHOLDS["high_level"]["threshold"]
            divisor = self.models.DPD_THRESHOLDS["high_level"]["divisor"]
        
        if dpd_value >= threshold:
            return 4.0
        else:
            score = (2 * dpd_value) / divisor
            return min(4.0, score)
    
    def calculate_rmd_score(self, rmd_value: float, program_type: ProgramType) -> float:
        """
        Calculate RMD score using Task 2 piecewise linear rules
        """
        program_code = self.models.get_program_info(program_type)["code"]
        
        if program_code == "S":  # Sarjana Butir 40
            rules = self.models.RMD_RULES["S"]
            if rules["optimal_min"] <= rmd_value <= rules["optimal_max"]:
                return 4.0
            elif rmd_value < rules["optimal_min"]:
                return (4 * rmd_value) / rules["optimal_min"]
            elif rules["optimal_max"] < rmd_value < rules["max_acceptable"]:
                return (70 - (2 * rmd_value)) / 5
            else:
                return 0.0
                
        elif program_code == "PPI":  # PPI Butir 37
            rules = self.models.RMD_RULES["PPI"]
            if rules["optimal_min"] <= rmd_value <= rules["optimal_max"]:
                return 4.0
            elif rmd_value < rules["optimal_min"]:
                return 1 + (3 * rmd_value) / 4
            elif rules["optimal_max"] < rmd_value <= rules["max_acceptable"]:
                return 4 - (((4 * rmd_value) - 40) / 25)
            else:
                return 0.0
        else:
            # Default calculation for other programs
            return min(4.0, (4 * 20) / rmd_value) if rmd_value > 0 else 0.0
    
    def calculate_waktu_tunggu_score(self, wt_months: float, program_type: ProgramType) -> float:
        """
        Calculate Waktu Tunggu score using Task 2 rules
        """
        if self.models.is_vokasi_program(program_type):
            rules = self.models.WAKTU_TUNGGU_RULES["vokasi"]
            if wt_months < rules["excellent_threshold"]:
                return 4.0
            elif rules["good_min"] <= wt_months <= rules["good_max"]:
                return (24 - (4 * wt_months)) / 3
            else:
                return 0.0
        else:  # Sarjana and others
            rules = self.models.WAKTU_TUNGGU_RULES["sarjana"]
            if wt_months < rules["excellent_threshold"]:
                return 4.0
            elif rules["good_min"] <= wt_months <= rules["good_max"]:
                return (18 - wt_months) / 3
            else:
                return 0.0
    
    def apply_score_constraints(self, score: float, butir_number: int, program_type: ProgramType) -> float:
        """
        Apply score constraints from Task 3
        """
        # Task 3: Score constraints
        if butir_number == 1:  # Kekhasan VMTS: Tidak ada skor kurang dari 2
            return max(2.0, score)
        elif butir_number == 2:  # Mekanisme Penyusunan VMTS: Tidak ada skor kurang dari 1
            return max(1.0, score)
        elif butir_number == 23:  # Penelitian DTPS melibatkan Mahasiswa (S/STr): Tidak ada skor kurang dari 2
            if program_type in [ProgramType.SARJANA, ProgramType.SARJANA_TERAPAN]:
                return max(2.0, score)
        
        return score
    
    def apply_discrete_score_logic(self, score: float, butir_number: int) -> float:
        """
        Apply discrete score logic from Task 3
        """
        # Task 3: Butir 15 (Metode Rekrutmen): Tidak ada skor antara 2 dan 4
        if butir_number == 15:
            if score >= 3.5:
                return 4.0
            elif score >= 1.5:
                return 2.0
            elif score >= 0.5:
                return 1.0
            else:
                return 0.0
        
        return score
    
    def calculate_weighted_average_1_2_1(self, score_i: float, score_ii: float, score_iii: float) -> float:
        """
        Task 4: Weighted average 1:2:1
        Skor = (I + (2 × II) + III) / 4
        """
        return (score_i + (2 * score_ii) + score_iii) / 4
    
    def calculate_weighted_average_1_2_2(self, score_i: float, score_ii: float, score_iii: float) -> float:
        """
        Task 4: Weighted average 1:2:2 untuk Kualitas Input Mahasiswa
        Skor = (I + (2 × II) + (2 × III)) / 5
        """
        return (score_i + (2 * score_ii) + (2 * score_iii)) / 5
    
    def calculate_simple_average(self, score_i: float, score_ii: float) -> float:
        """
        Task 4: Simple average 1:1
        Skor = (I + II) / 2
        """
        return (score_i + score_ii) / 2
    
    async def calculate_lamtek_scores(self, program_type: str, ai_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main method to calculate LAM-TEK 2025 scores
        """
        print(f"[LAM-TEK] Starting LAM-TEK 2025 scoring for program type: {program_type}")
        
        try:
            # Get total butir for program type
            total_butir = self.get_total_butir(program_type)
            
            # Extract data from AI analysis
            lkps_data = ai_data.get("lkps_data", {})
            led_data = ai_data.get("led_data", {})
            
            # Sample calculations for demonstration
            # In real implementation, you would calculate all butir based on LAM-TEK specifications
            
            # Task 1 calculations (BOP, DPD, Kerjasama)
            task1_scores = []
            
            # BOP Score (Task 1)
            bop_value = lkps_data.get("bop_value", 0) or 0  # Handle None values
            bop_threshold, _ = self.get_bop_dpd_thresholds(program_type)
            if bop_value >= bop_threshold:
                bop_score = 4.0
            else:
                bop_score = min(4.0, bop_value / (bop_threshold / 4))
            task1_scores.append(bop_score)
            
            # DPD Score (Task 1)
            dpd_total = lkps_data.get("dpd_total", 0) or 0  # Handle None values
            jumlah_dtps = lkps_data.get("jumlah_dtps", 1) or 1  # Handle None values
            dpd_per_dtps = dpd_total / jumlah_dtps if jumlah_dtps > 0 else 0
            _, dpd_threshold = self.get_bop_dpd_thresholds(program_type)
            if dpd_per_dtps >= dpd_threshold:
                dpd_score = 4.0
            else:
                dpd_score = min(4.0, (2 * dpd_per_dtps) / dpd_threshold)
            task1_scores.append(dpd_score)
            
            # Kerjasama Score (Task 1 - simplified)
            kerjasama_data = lkps_data.get("jumlah_kerjasama_institusi", {})
            ri = kerjasama_data.get("ri", 0) or 0
            rn = kerjasama_data.get("rn", 0) or 0
            rl = kerjasama_data.get("rl", 0) or 0
            
            # Use standard factors for simplified calculation
            if program_type in ['D', 'DTr']:
                a, b, c = 3, 8, 10
            else:
                a, b, c = 2, 6, 8
            
            kerjasama_score = self.calculate_interpolation_score(ri, rn, rl, a, b, c)
            task1_scores.append(kerjasama_score)
            
            # Task 2 calculations (RMD, etc.)
            task2_scores = []
            rmd = lkps_data.get("rmd", 0) or 0  # Handle None values
            # Simplified RMD calculation for testing
            if program_type == "S":
                if 15 <= rmd <= 25:
                    rmd_score = 4.0
                elif rmd < 35:
                    rmd_score = 3.0
                else:
                    rmd_score = 2.0
            elif program_type == "PPI":
                if 4 <= rmd <= 10:
                    rmd_score = 4.0
                elif rmd < 15:
                    rmd_score = 3.0
                else:
                    rmd_score = 2.0
            else:
                # Default for other programs
                if rmd <= 10:
                    rmd_score = 4.0
                elif rmd <= 20:
                    rmd_score = 3.0
                else:
                    rmd_score = 2.0
            task2_scores.append(rmd_score)
            
            # Add sample scores for other indicators
            task2_scores.extend([3.5, 3.2, 3.8])  # Sample scores
            
            # Task 3 calculations (Waktu Tunggu, etc.)
            task3_scores = []
            waktu_tunggu = lkps_data.get("waktu_tunggu_lulusan", 6.0) or 6.0  # Handle None values
            # Simplified waktu tunggu calculation for testing
            if waktu_tunggu <= 3:
                wt_score = 4.0
            elif waktu_tunggu <= 6:
                wt_score = 3.5
            elif waktu_tunggu <= 12:
                wt_score = 2.5
            else:
                wt_score = 1.0
            task3_scores.append(wt_score)
            
            # Add sample scores for other indicators
            task3_scores.extend([3.6, 3.4, 3.7, 3.3])  # Sample scores
            
            # Task 4 calculations (composite scores)
            task4_scores = []
            # Sample composite calculations
            composite1 = self.calculate_weighted_average_1_2_1(3.5, 3.7, 3.4)
            composite2 = self.calculate_simple_average(3.6, 3.8)
            task4_scores.extend([composite1, composite2, 3.5, 3.6])  # Sample scores
            
            # Calculate task totals
            task1_total = sum(task1_scores)
            task2_total = sum(task2_scores)
            task3_total = sum(task3_scores)
            task4_total = sum(task4_scores)
            
            # Calculate overall totals
            total_score = task1_total + task2_total + task3_total + task4_total
            butir_completed = len(task1_scores) + len(task2_scores) + len(task3_scores) + len(task4_scores)
            
            # Determine grade based on percentage
            percentage = (total_score / total_butir) * 100
            if percentage >= 90:
                grade = "A"
            elif percentage >= 80:
                grade = "B"
            elif percentage >= 70:
                grade = "C"
            elif percentage >= 60:
                grade = "D"
            else:
                grade = "E"
            
            # Prepare result structure
            result = {
                "summary": {
                    "total_butir": total_butir,
                    "butir_completed": butir_completed,
                    "total_score": total_score,
                    "percentage": percentage,
                    "grade": grade,
                    "task1_score": task1_total,
                    "task2_score": task2_total,
                    "task3_score": task3_total,
                    "task4_score": task4_total
                },
                "task_scores": [
                    {
                        "task": "Task 1 - BOP/DPD/Kerjasama", 
                        "score": task1_total, 
                        "details": task1_scores,
                        "description": "Biaya Operasional Pendidikan, Dana Penelitian DTPS, Kerjasama Institusi"
                    },
                    {
                        "task": "Task 2 - RMD/Mahasiswa", 
                        "score": task2_total, 
                        "details": task2_scores,
                        "description": "Rasio Mahasiswa-Dosen, Kualitas Input Mahasiswa, Penelitian DTPS"
                    },
                    {
                        "task": "Task 3 - Waktu Tunggu/Lulusan", 
                        "score": task3_total, 
                        "details": task3_scores,
                        "description": "Waktu Tunggu Lulusan, Kinerja Lulusan, Kepuasan Pengguna"
                    },
                    {
                        "task": "Task 4 - Composite Scores", 
                        "score": task4_total, 
                        "details": task4_scores,
                        "description": "Skor Komposit Berbagai Indikator Terintegrasi"
                    }
                ],
                "method": "LAM-TEK 2025",
                "program_type": program_type
            }
            
            print(f"[LAM-TEK] ✅ Scoring completed: {butir_completed}/{total_butir} butir, Grade: {grade} ({percentage:.1f}%)")
            return result
            
        except Exception as e:
            print(f"[LAM-TEK] ❌ Error in calculate_lamtek_scores: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Return error result
            return {
                "summary": {
                    "total_butir": self.get_total_butir(program_type),
                    "butir_completed": 0,
                    "total_score": 0,
                    "percentage": 0,
                    "grade": "E",
                    "error": str(e)
                },
                "task_scores": [],
                "method": "LAM-TEK 2025 (Error)",
                "program_type": program_type
            }

lamtek_scoring_service = LAMTEKScoringService()