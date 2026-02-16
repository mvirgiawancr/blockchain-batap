#!/usr/bin/env python3
"""
Generate benchmark performance charts from Hyperledger Caliper report data.
Diagrams match the format described in the DOCX document:
  1. Keberhasilan Transaksi (Success/Fail)
  2. Send Rate (TPS)
  3. Latency (s)
  4. Throughput (TPS)
"""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np
import os

# ============================================================
# DATA from full_benchmark_20260214_094310.html
# ============================================================
benchmark_data = {
    'labels': ['create-submission', 'query-submission', 'query-all-submissions'],
    'labels_short': ['Create\nSubmission', 'Query\nSubmission', 'Query All\nSubmissions'],
    'succ':       [2000, 2000, 100],
    'fail':       [0, 0, 0],
    'send_rate':  [50.1, 49.0, 2.1],
    'max_lat':    [6.28, 0.18, 1.78],
    'min_lat':    [-1.43, -1.60, 0.86],   # negative = clock skew, show as 0
    'avg_lat':    [1.58, 0.01, 1.13],
    'throughput': [49.9, 49.0, 2.1],
}

# Fix negative min_latency (clock skew artifact) for display
benchmark_data['min_lat_display'] = [max(0, v) for v in benchmark_data['min_lat']]

# ============================================================
# STYLE CONFIG
# ============================================================
COLORS = {
    'success':    '#4CAF50',
    'fail':       '#F44336',
    'send_rate':  '#2196F3',
    'max_lat':    '#FF9800',
    'min_lat':    '#8BC34A',
    'avg_lat':    '#F44336',
    'throughput': '#9C27B0',
    'bg':         '#FFFFFF',
    'grid':       '#E0E0E0',
    'text':       '#333333',
}

plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.sans-serif': ['DejaVu Sans', 'Arial', 'Helvetica'],
    'font.size': 11,
    'axes.facecolor': COLORS['bg'],
    'figure.facecolor': COLORS['bg'],
    'axes.edgecolor': COLORS['grid'],
    'axes.grid': True,
    'grid.color': COLORS['grid'],
    'grid.alpha': 0.5,
    'grid.linestyle': '--',
})

output_dir = os.path.dirname(os.path.abspath(__file__))
x = np.arange(len(benchmark_data['labels']))
bar_width = 0.35

def add_value_labels(ax, bars, fmt='{:.0f}'):
    """Add value labels on top of bars."""
    for bar in bars:
        height = bar.get_height()
        ax.annotate(fmt.format(height),
                    xy=(bar.get_x() + bar.get_width() / 2, height),
                    xytext=(0, 5), textcoords="offset points",
                    ha='center', va='bottom', fontsize=10, fontweight='bold',
                    color=COLORS['text'])

# ============================================================
# DIAGRAM 1: Keberhasilan Transaksi (Success vs Fail)
# ============================================================
fig1, ax1 = plt.subplots(figsize=(10, 6))
bars_succ = ax1.bar(x - bar_width/2, benchmark_data['succ'], bar_width,
                    label='Berhasil (Success)', color=COLORS['success'],
                    edgecolor='white', linewidth=0.8, zorder=3)
bars_fail = ax1.bar(x + bar_width/2, benchmark_data['fail'], bar_width,
                    label='Gagal (Fail)', color=COLORS['fail'],
                    edgecolor='white', linewidth=0.8, zorder=3)

add_value_labels(ax1, bars_succ)
# Add '0' labels for fail bars
for i, bar in enumerate(bars_fail):
    ax1.annotate('0', xy=(bar.get_x() + bar.get_width() / 2, 0),
                 xytext=(0, 5), textcoords="offset points",
                 ha='center', va='bottom', fontsize=10, fontweight='bold',
                 color=COLORS['text'])

ax1.set_xlabel('Jenis Pengujian', fontsize=12, fontweight='bold', color=COLORS['text'])
ax1.set_ylabel('Jumlah Transaksi', fontsize=12, fontweight='bold', color=COLORS['text'])
ax1.set_title('Hasil Pengujian Keberhasilan Transaksi', fontsize=14, fontweight='bold',
              color=COLORS['text'], pad=15)
ax1.set_xticks(x)
ax1.set_xticklabels(benchmark_data['labels_short'], fontsize=10)
ax1.legend(fontsize=11, loc='upper right', framealpha=0.9)
ax1.set_ylim(0, max(benchmark_data['succ']) * 1.15)
fig1.tight_layout()
fig1.savefig(os.path.join(output_dir, 'diagram_1_keberhasilan_transaksi.png'), dpi=200, bbox_inches='tight')
print("✓ Diagram 1: Keberhasilan Transaksi saved")

# ============================================================
# DIAGRAM 2: Send Rate (TPS)
# ============================================================
fig2, ax2 = plt.subplots(figsize=(10, 6))
bars_sr = ax2.bar(x, benchmark_data['send_rate'], bar_width * 1.5,
                  label='Send Rate (TPS)', color=COLORS['send_rate'],
                  edgecolor='white', linewidth=0.8, zorder=3)
add_value_labels(ax2, bars_sr, fmt='{:.1f}')

ax2.set_xlabel('Jenis Pengujian', fontsize=12, fontweight='bold', color=COLORS['text'])
ax2.set_ylabel('Send Rate (TPS)', fontsize=12, fontweight='bold', color=COLORS['text'])
ax2.set_title('Hasil Pengujian Send Rate Transaksi', fontsize=14, fontweight='bold',
              color=COLORS['text'], pad=15)
ax2.set_xticks(x)
ax2.set_xticklabels(benchmark_data['labels_short'], fontsize=10)
ax2.legend(fontsize=11, loc='upper right', framealpha=0.9)
ax2.set_ylim(0, max(benchmark_data['send_rate']) * 1.25)
fig2.tight_layout()
fig2.savefig(os.path.join(output_dir, 'diagram_2_send_rate.png'), dpi=200, bbox_inches='tight')
print("✓ Diagram 2: Send Rate saved")

# ============================================================
# DIAGRAM 3: Latency (s) - Grouped Bar (Max, Min, Avg)
# ============================================================
fig3, ax3 = plt.subplots(figsize=(10, 6))
bar_w = 0.25
bars_max = ax3.bar(x - bar_w, benchmark_data['max_lat'], bar_w,
                   label='Max Latency (s)', color=COLORS['max_lat'],
                   edgecolor='white', linewidth=0.8, zorder=3)
bars_min = ax3.bar(x, benchmark_data['min_lat_display'], bar_w,
                   label='Min Latency (s)', color=COLORS['min_lat'],
                   edgecolor='white', linewidth=0.8, zorder=3)
bars_avg = ax3.bar(x + bar_w, benchmark_data['avg_lat'], bar_w,
                   label='Avg Latency (s)', color=COLORS['avg_lat'],
                   edgecolor='white', linewidth=0.8, zorder=3)

add_value_labels(ax3, bars_max, fmt='{:.2f}')
add_value_labels(ax3, bars_min, fmt='{:.2f}')
add_value_labels(ax3, bars_avg, fmt='{:.2f}')

ax3.set_xlabel('Jenis Pengujian', fontsize=12, fontweight='bold', color=COLORS['text'])
ax3.set_ylabel('Latency (detik)', fontsize=12, fontweight='bold', color=COLORS['text'])
ax3.set_title('Hasil Pengujian Latency Transaksi', fontsize=14, fontweight='bold',
              color=COLORS['text'], pad=15)
ax3.set_xticks(x)
ax3.set_xticklabels(benchmark_data['labels_short'], fontsize=10)
ax3.legend(fontsize=10, loc='upper right', framealpha=0.9)
ax3.set_ylim(0, max(benchmark_data['max_lat']) * 1.25)
fig3.tight_layout()
fig3.savefig(os.path.join(output_dir, 'diagram_3_latency.png'), dpi=200, bbox_inches='tight')
print("✓ Diagram 3: Latency saved")

# ============================================================
# DIAGRAM 4: Throughput (TPS)
# ============================================================
fig4, ax4 = plt.subplots(figsize=(10, 6))
bars_tp = ax4.bar(x, benchmark_data['throughput'], bar_width * 1.5,
                  label='Throughput (TPS)', color=COLORS['throughput'],
                  edgecolor='white', linewidth=0.8, zorder=3)
add_value_labels(ax4, bars_tp, fmt='{:.1f}')

ax4.set_xlabel('Jenis Pengujian', fontsize=12, fontweight='bold', color=COLORS['text'])
ax4.set_ylabel('Throughput (TPS)', fontsize=12, fontweight='bold', color=COLORS['text'])
ax4.set_title('Hasil Pengujian Throughput Transaksi', fontsize=14, fontweight='bold',
              color=COLORS['text'], pad=15)
ax4.set_xticks(x)
ax4.set_xticklabels(benchmark_data['labels_short'], fontsize=10)
ax4.legend(fontsize=11, loc='upper right', framealpha=0.9)
ax4.set_ylim(0, max(benchmark_data['throughput']) * 1.25)
fig4.tight_layout()
fig4.savefig(os.path.join(output_dir, 'diagram_4_throughput.png'), dpi=200, bbox_inches='tight')
print("✓ Diagram 4: Throughput saved")

plt.close('all')
print(f"\nAll 4 diagrams saved to: {output_dir}")
