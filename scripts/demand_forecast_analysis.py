#!/usr/bin/env python3
"""
덕양가스 수요예측 AI 데모 분석
- 배차현황 데이터 기반 시계열 분석 및 수요 예측
- 사업계획서 삽입용 기초 지표 산출
"""

import warnings
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.ticker import FuncFormatter
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.seasonal import seasonal_decompose
from datetime import timedelta
import os

# ── Korean font support ──
matplotlib.rcParams['font.family'] = 'AppleGothic'
matplotlib.rcParams['axes.unicode_minus'] = False

# ── Paths ──
BASE_DIR = '/Users/kyunghoon/project/project2026/hansol'
DATA_PATH = os.path.join(BASE_DIR, '덕양 자료/2. 운행 상세현황 - DINOERP 20250101-20260331.xlsx')
PNG_DIR = os.path.join(BASE_DIR, 'diagrams/png')
DOCS_DIR = os.path.join(BASE_DIR, 'docs')

os.makedirs(PNG_DIR, exist_ok=True)
os.makedirs(DOCS_DIR, exist_ok=True)

# ── Color palette (professional) ──
COLORS = {
    'primary': '#1B3A5C',      # 딥네이비
    'secondary': '#2E86AB',     # 스틸블루
    'accent': '#E8702A',        # 어크센트오렌지
    'success': '#28A745',       # 그린
    'warning': '#FFC107',       # 옐로
    'danger': '#DC3545',        # 레드
    'light_bg': '#F8F9FA',
    'grid': '#E0E0E0',
    'palette': ['#1B3A5C', '#2E86AB', '#E8702A', '#28A745', '#8E44AD',
                '#E74C3C', '#F39C12', '#16A085', '#2C3E50', '#D35400']
}

def style_ax(ax, title, xlabel='', ylabel=''):
    """Apply consistent professional styling to axes."""
    ax.set_title(title, fontsize=15, fontweight='bold', color=COLORS['primary'], pad=15)
    ax.set_xlabel(xlabel, fontsize=11, color='#555')
    ax.set_ylabel(ylabel, fontsize=11, color='#555')
    ax.set_facecolor(COLORS['light_bg'])
    ax.grid(True, alpha=0.3, color=COLORS['grid'], linestyle='--')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#CCC')
    ax.spines['bottom'].set_color('#CCC')
    ax.tick_params(colors='#555', labelsize=9)


# ═══════════════════════════════════════════════════════════════
# 1. DATA LOADING & PREPROCESSING
# ═══════════════════════════════════════════════════════════════
print("=" * 60)
print("  덕양가스 수요예측 데모 분석")
print("=" * 60)
print("\n[1/6] 데이터 로딩...")

df_raw = pd.read_excel(DATA_PATH, sheet_name='배차현황')
print(f"  전체 레코드: {len(df_raw):,}건")

# Filter sales only
df = df_raw[df_raw['구분'] == '매출'].copy()
print(f"  매출 레코드: {len(df):,}건")

# Parse date
df['운행일자'] = df['운행일자'].astype(int).astype(str)
df['날짜'] = pd.to_datetime(df['운행일자'], format='%Y%m%d')
df['요일'] = df['날짜'].dt.dayofweek  # 0=Mon, 6=Sun
df['요일명'] = df['날짜'].dt.day_name()
df['주차'] = df['날짜'].dt.isocalendar().week.astype(int)
df['월'] = df['날짜'].dt.month

# Parse departure time
df['출발시간'] = pd.to_datetime(df['출발일시'], format='%Y/%m/%d %H:%M', errors='coerce')
df['출발_시'] = df['출발시간'].dt.hour

# Product category simplification
def simplify_product(name):
    """Group products into main gas categories."""
    name = str(name)
    if '질소' in name and '탱크' in name:
        return '액화질소(벌크)'
    elif '산소' in name and '탱크' in name:
        return '액화산소(벌크)'
    elif '알곤' in name and '탱크' in name:
        return '액화알곤(벌크)'
    elif '탄산' in name and '탱크' in name:
        return '액화탄산(벌크)'
    elif '에틸렌' in name and '탱크' in name:
        return '액화에틸렌(벌크)'
    elif 'LPG' in name or '프로판' in name and ('Bulk' in name or '탱크' in name):
        return 'LPG(벌크)'
    elif '질소' in name:
        return '질소(소용기)'
    elif '산소' in name:
        return '산소(소용기)'
    elif '알곤' in name:
        return '알곤(소용기)'
    elif '수소' in name:
        return '수소(소용기)'
    elif '이산화탄소' in name or 'CO2' in name:
        return 'CO2(소용기)'
    elif '헬륨' in name:
        return '헬륨(소용기)'
    elif '아세틸렌' in name:
        return '아세틸렌(소용기)'
    elif '암모니아' in name:
        return '암모니아'
    elif 'LPG' in name or '프로판' in name:
        return 'LPG(소용기)'
    else:
        return '기타'

df['가스분류'] = df['품명'].apply(simplify_product)

DATE_MIN = df['날짜'].min()
DATE_MAX = df['날짜'].max()
TOTAL_DAYS = (DATE_MAX - DATE_MIN).days + 1
print(f"  분석 기간: {DATE_MIN.strftime('%Y-%m-%d')} ~ {DATE_MAX.strftime('%Y-%m-%d')} ({TOTAL_DAYS}일)")
print(f"  가스 분류: {df['가스분류'].nunique()}개 카테고리")


# ═══════════════════════════════════════════════════════════════
# 2. DAILY AGGREGATION & TIME SERIES
# ═══════════════════════════════════════════════════════════════
print("\n[2/6] 일별 집계 및 시계열 분석...")

daily = df.groupby('날짜').agg(
    총배송건수=('배송수량', 'count'),
    총배송수량=('배송수량', 'sum'),
    총금액=('금액', 'sum')
).reset_index()

# Fill missing dates
date_range = pd.date_range(DATE_MIN, DATE_MAX, freq='D')
daily = daily.set_index('날짜').reindex(date_range, fill_value=0).rename_axis('날짜').reset_index()
daily['요일'] = daily['날짜'].dt.dayofweek

# Weekly aggregation
weekly = daily.set_index('날짜').resample('W').agg({
    '총배송건수': 'sum',
    '총배송수량': 'sum',
    '총금액': 'sum'
}).reset_index()

# Daily by gas category
daily_by_gas = df.groupby(['날짜', '가스분류'])['배송수량'].sum().unstack(fill_value=0)
daily_by_gas = daily_by_gas.reindex(date_range, fill_value=0).rename_axis('날짜')

# Top 3 gas categories by total volume
top3_gas = df.groupby('가스분류')['배송수량'].sum().sort_values(ascending=False).head(3).index.tolist()
print(f"  상위 3개 가스: {', '.join(top3_gas)}")

# Day-of-week analysis
dow_names_kr = ['월', '화', '수', '목', '금', '토', '일']
dow = daily.groupby('요일').agg(
    평균건수=('총배송건수', 'mean'),
    평균수량=('총배송수량', 'mean'),
    합계건수=('총배송건수', 'sum')
).reset_index()
dow['요일명'] = dow['요일'].map(lambda x: dow_names_kr[x])


# ═══════════════════════════════════════════════════════════════
# 3. TOP 10 CUSTOMERS
# ═══════════════════════════════════════════════════════════════
print("\n[3/6] 고객별 소비 패턴 분석...")

customer_summary = df.groupby('거래처명').agg(
    총수량=('배송수량', 'sum'),
    총건수=('배송수량', 'count'),
    총금액=('금액', 'sum'),
    평균수량=('배송수량', 'mean'),
    거래일수=('날짜', 'nunique'),
    주요품목=('가스분류', lambda x: x.mode().iloc[0] if len(x.mode()) > 0 else '기타')
).sort_values('총수량', ascending=False)

top10_customers = customer_summary.head(10)
print(f"  총 거래처 수: {customer_summary.shape[0]}개")
print(f"  상위 10개 거래처 점유율: {top10_customers['총수량'].sum() / customer_summary['총수량'].sum() * 100:.1f}%")


# ═══════════════════════════════════════════════════════════════
# 4. BASELINE METRICS
# ═══════════════════════════════════════════════════════════════
print("\n[4/6] 기초 지표 산출...")

# Coefficient of Variation for daily delivery
cv_daily = daily['총배송수량'].std() / daily['총배송수량'].mean() * 100
cv_daily_count = daily['총배송건수'].std() / daily['총배송건수'].mean() * 100

# CV by gas category
cv_by_gas = {}
for gas in top3_gas:
    if gas in daily_by_gas.columns:
        series = daily_by_gas[gas]
        series_nonzero = series[series > 0]
        if len(series_nonzero) > 0:
            cv_by_gas[gas] = series_nonzero.std() / series_nonzero.mean() * 100

# Emergency/Urgent delivery ratio (before 07:00 or weekends)
has_time = df['출발_시'].notna()
early_morning = df[has_time & (df['출발_시'] < 7)]
weekend = df[df['요일'].isin([5, 6])]  # Sat, Sun
weekend_with_time = df[has_time & df['요일'].isin([5, 6])]

emergency_count = len(early_morning) + len(weekend)
# Remove double-counting (weekend AND early morning)
early_and_weekend = df[has_time & (df['출발_시'] < 7) & df['요일'].isin([5, 6])]
emergency_count = len(early_morning) + len(weekend) - len(early_and_weekend)
emergency_ratio = emergency_count / len(df) * 100

# Weekend delivery ratio specifically
weekend_ratio = len(weekend) / len(df) * 100

# Early morning ratio (before 07:00)
early_ratio = len(early_morning) / len(df[has_time]) * 100 if has_time.sum() > 0 else 0

# Empty run ratio (quantity = 0)
empty_runs = len(df[df['배송수량'] == 0])
empty_ratio = empty_runs / len(df) * 100

# Average daily delivery count & volume
avg_daily_count = daily['총배송건수'].mean()
avg_daily_volume = daily['총배송수량'].mean()
avg_weekday_count = daily[daily['요일'] < 5]['총배송건수'].mean()
avg_weekend_count = daily[daily['요일'] >= 5]['총배송건수'].mean()

# Monthly growth
monthly = df.groupby('월').agg(
    건수=('배송수량', 'count'),
    수량=('배송수량', 'sum'),
    금액=('금액', 'sum')
)
monthly_growth_count = (monthly['건수'].iloc[-1] - monthly['건수'].iloc[0]) / monthly['건수'].iloc[0] * 100
monthly_growth_volume = (monthly['수량'].iloc[-1] - monthly['수량'].iloc[0]) / monthly['수량'].iloc[0] * 100

print(f"  일평균 배송건수: {avg_daily_count:.1f}건")
print(f"  일평균 배송수량: {avg_daily_volume:,.0f}")
print(f"  배송수량 변동계수(CV): {cv_daily:.1f}%")
print(f"  긴급배송 비율: {emergency_ratio:.1f}%")
print(f"  공차운행 비율: {empty_ratio:.1f}%")


# ═══════════════════════════════════════════════════════════════
# 5. FORECASTING MODEL (Holt-Winters Exponential Smoothing)
# ═══════════════════════════════════════════════════════════════
print("\n[5/6] 수요예측 모델 구축...")

forecast_results = {}

for gas in top3_gas:
    print(f"\n  ▶ {gas} 예측 모델...")
    if gas not in daily_by_gas.columns:
        print(f"    ⚠ 데이터 없음, 건너뜀")
        continue

    ts = daily_by_gas[gas].copy()
    ts.index = pd.DatetimeIndex(ts.index)
    ts.index.freq = 'D'

    # Use Holt-Winters with additive seasonality (weekly cycle = 7)
    try:
        model = ExponentialSmoothing(
            ts,
            trend='add',
            seasonal='add',
            seasonal_periods=7,
            initialization_method='estimated'
        )
        fit = model.fit(optimized=True)
        forecast = fit.forecast(14)

        # Calculate prediction intervals (approximate)
        residuals = fit.resid
        residual_std = residuals.std()
        forecast_index = pd.date_range(DATE_MAX + timedelta(days=1), periods=14, freq='D')
        forecast.index = forecast_index

        # Widen CI over forecast horizon
        ci_multiplier = np.array([1.0 + 0.05 * i for i in range(14)])
        lower = forecast - 1.96 * residual_std * ci_multiplier
        upper = forecast + 1.96 * residual_std * ci_multiplier

        # Clip negatives
        lower = lower.clip(lower=0)
        forecast = forecast.clip(lower=0)

        # Model fit metrics
        mae = np.abs(residuals).mean()
        mape = (np.abs(residuals) / ts.replace(0, np.nan)).dropna().mean() * 100

        forecast_results[gas] = {
            'actual': ts,
            'fitted': fit.fittedvalues,
            'forecast': forecast,
            'lower': lower,
            'upper': upper,
            'mae': mae,
            'mape': mape,
            'residual_std': residual_std,
            'aic': fit.aic
        }
        print(f"    MAE: {mae:,.0f}, MAPE: {mape:.1f}%")
        print(f"    14일 예측 평균: {forecast.mean():,.0f}")

    except Exception as e:
        print(f"    ⚠ Holt-Winters 실패: {e}")
        # Fallback: Simple Exponential Smoothing
        try:
            from statsmodels.tsa.holtwinters import SimpleExpSmoothing
            model = SimpleExpSmoothing(ts, initialization_method='estimated')
            fit = model.fit(optimized=True)
            forecast = fit.forecast(14)
            forecast_index = pd.date_range(DATE_MAX + timedelta(days=1), periods=14, freq='D')
            forecast.index = forecast_index

            residuals = fit.resid
            residual_std = residuals.std()
            ci_multiplier = np.array([1.0 + 0.05 * i for i in range(14)])
            lower = (forecast - 1.96 * residual_std * ci_multiplier).clip(lower=0)
            upper = forecast + 1.96 * residual_std * ci_multiplier

            forecast_results[gas] = {
                'actual': ts,
                'fitted': fit.fittedvalues,
                'forecast': forecast,
                'lower': lower,
                'upper': upper,
                'mae': np.abs(residuals).mean(),
                'mape': (np.abs(residuals) / ts.replace(0, np.nan)).dropna().mean() * 100,
                'residual_std': residual_std,
                'aic': fit.aic
            }
            print(f"    Simple ES Fallback - MAE: {forecast_results[gas]['mae']:,.0f}")
        except Exception as e2:
            print(f"    ⚠ Fallback도 실패: {e2}")


# ═══════════════════════════════════════════════════════════════
# 6. CHART GENERATION
# ═══════════════════════════════════════════════════════════════
print("\n\n[6/6] 차트 생성...")

# ─── Chart 1: Daily Total Delivery Volume Trend ───
fig, ax = plt.subplots(figsize=(14, 6))
fig.patch.set_facecolor('white')

# 7-day moving average
daily['이동평균_7d'] = daily['총배송수량'].rolling(7, min_periods=1).mean()

ax.bar(daily['날짜'], daily['총배송수량'], color=COLORS['secondary'], alpha=0.35, width=0.8, label='일별 배송수량')
ax.plot(daily['날짜'], daily['이동평균_7d'], color=COLORS['accent'], linewidth=2.5, label='7일 이동평균')

# Highlight weekends
for idx, row in daily.iterrows():
    if row['요일'] >= 5:
        ax.axvspan(row['날짜'] - timedelta(hours=12), row['날짜'] + timedelta(hours=12),
                   alpha=0.05, color=COLORS['danger'])

style_ax(ax, '덕양가스 일별 총 배송수량 추이 (2025.01 ~ 2025.03)', '날짜', '배송수량')
ax.legend(loc='upper right', fontsize=10, framealpha=0.8)
ax.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d'))
ax.xaxis.set_major_locator(mdates.WeekdayLocator(byweekday=0))
plt.xticks(rotation=45)

# Annotations
ax.annotate(f'일평균: {avg_daily_volume:,.0f}',
            xy=(0.02, 0.95), xycoords='axes fraction',
            fontsize=10, color=COLORS['primary'],
            bbox=dict(boxstyle='round,pad=0.3', facecolor='white', edgecolor=COLORS['grid']))
ax.annotate(f'CV: {cv_daily:.1f}%',
            xy=(0.02, 0.87), xycoords='axes fraction',
            fontsize=10, color=COLORS['accent'],
            bbox=dict(boxstyle='round,pad=0.3', facecolor='white', edgecolor=COLORS['grid']))

plt.tight_layout()
chart1_path = os.path.join(PNG_DIR, 'demand_01_daily_trend.png')
plt.savefig(chart1_path, dpi=200, bbox_inches='tight', facecolor='white')
plt.close()
print(f"  ✅ Chart 1 저장: {chart1_path}")


# ─── Chart 2: Day-of-Week Demand Pattern ───
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
fig.patch.set_facecolor('white')

# Bar colors: weekday blue, weekend red
bar_colors = [COLORS['secondary'] if i < 5 else COLORS['danger'] for i in range(7)]

bars1 = ax1.bar(dow['요일명'], dow['평균건수'], color=bar_colors, edgecolor='white', linewidth=0.5)
style_ax(ax1, '요일별 평균 배송건수', '', '평균 건수')
for bar, val in zip(bars1, dow['평균건수']):
    ax1.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.5,
             f'{val:.1f}', ha='center', va='bottom', fontsize=9, fontweight='bold', color=COLORS['primary'])

bars2 = ax2.bar(dow['요일명'], dow['평균수량'], color=bar_colors, edgecolor='white', linewidth=0.5)
style_ax(ax2, '요일별 평균 배송수량', '', '평균 수량')
for bar, val in zip(bars2, dow['평균수량']):
    ax2.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 100,
             f'{val:,.0f}', ha='center', va='bottom', fontsize=9, fontweight='bold', color=COLORS['primary'])

# Add weekday/weekend annotation
ax1.axhline(y=avg_weekday_count, color=COLORS['primary'], linestyle='--', alpha=0.5, label=f'평일 평균: {avg_weekday_count:.1f}건')
ax1.axhline(y=avg_weekend_count, color=COLORS['danger'], linestyle='--', alpha=0.5, label=f'주말 평균: {avg_weekend_count:.1f}건')
ax1.legend(fontsize=8, loc='upper right')

plt.tight_layout()
chart2_path = os.path.join(PNG_DIR, 'demand_02_dow_pattern.png')
plt.savefig(chart2_path, dpi=200, bbox_inches='tight', facecolor='white')
plt.close()
print(f"  ✅ Chart 2 저장: {chart2_path}")


# ─── Chart 3: Top 10 Customers by Volume ───
fig, ax = plt.subplots(figsize=(12, 7))
fig.patch.set_facecolor('white')

top10 = top10_customers.reset_index()
y_pos = range(len(top10) - 1, -1, -1)

bars = ax.barh(list(y_pos), top10['총수량'], color=COLORS['palette'][:len(top10)],
               edgecolor='white', linewidth=0.5, height=0.7)

ax.set_yticks(list(y_pos))
ax.set_yticklabels(top10['거래처명'], fontsize=10)
style_ax(ax, '상위 10개 거래처 배송수량 (2025.01~03)', '', '총 배송수량')

# Add value labels
for bar, val, gas_type in zip(bars, top10['총수량'], top10['주요품목']):
    ax.text(bar.get_width() + 5000, bar.get_y() + bar.get_height() / 2,
            f'{val:,.0f} ({gas_type})', ha='left', va='center', fontsize=9, color=COLORS['primary'])

# Cumulative % annotation
total_vol = customer_summary['총수량'].sum()
cumsum = top10['총수량'].cumsum() / total_vol * 100
ax.annotate(f'상위 10개 = 전체의 {cumsum.iloc[-1]:.1f}%',
            xy=(0.65, 0.05), xycoords='axes fraction',
            fontsize=11, fontweight='bold', color=COLORS['accent'],
            bbox=dict(boxstyle='round,pad=0.5', facecolor='white', edgecolor=COLORS['accent']))

plt.tight_layout()
chart3_path = os.path.join(PNG_DIR, 'demand_03_top10_customers.png')
plt.savefig(chart3_path, dpi=200, bbox_inches='tight', facecolor='white')
plt.close()
print(f"  ✅ Chart 3 저장: {chart3_path}")


# ─── Chart 4: 14-Day Demand Forecast ───
n_forecasts = len(forecast_results)
if n_forecasts > 0:
    fig, axes = plt.subplots(n_forecasts, 1, figsize=(14, 5 * n_forecasts))
    fig.patch.set_facecolor('white')
    if n_forecasts == 1:
        axes = [axes]

    for idx, (gas, res) in enumerate(forecast_results.items()):
        ax = axes[idx]

        # Plot last 30 days of actual data + forecast
        actual_tail = res['actual'][-30:]
        fitted_tail = res['fitted'][-30:]

        ax.plot(actual_tail.index, actual_tail.values, color=COLORS['primary'],
                linewidth=1.5, marker='o', markersize=3, label='실측값', alpha=0.8)
        ax.plot(fitted_tail.index, fitted_tail.values, color=COLORS['secondary'],
                linewidth=1, linestyle='--', label='적합값', alpha=0.6)

        # Forecast
        ax.plot(res['forecast'].index, res['forecast'].values, color=COLORS['accent'],
                linewidth=2.5, marker='s', markersize=4, label='14일 예측')
        ax.fill_between(res['forecast'].index, res['lower'].values, res['upper'].values,
                        color=COLORS['accent'], alpha=0.15, label='95% 신뢰구간')

        # Vertical line at forecast start
        ax.axvline(x=DATE_MAX, color=COLORS['danger'], linestyle=':', alpha=0.7, linewidth=1)
        ax.text(DATE_MAX, ax.get_ylim()[1] * 0.95, ' 예측시작→',
                fontsize=8, color=COLORS['danger'], ha='left', va='top')

        style_ax(ax, f'{gas} — 14일 수요예측 (Holt-Winters)', '날짜', '배송수량')

        # Metrics box
        metrics_text = f'MAE: {res["mae"]:,.0f}\nMAPE: {res["mape"]:.1f}%\n예측평균: {res["forecast"].mean():,.0f}'
        ax.text(0.02, 0.95, metrics_text, transform=ax.transAxes,
                fontsize=9, verticalalignment='top',
                bbox=dict(boxstyle='round,pad=0.5', facecolor='white', edgecolor=COLORS['grid'], alpha=0.9))

        ax.legend(loc='upper right', fontsize=9, framealpha=0.8)
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d'))

    plt.tight_layout()
    chart4_path = os.path.join(PNG_DIR, 'demand_04_forecast_14day.png')
    plt.savefig(chart4_path, dpi=200, bbox_inches='tight', facecolor='white')
    plt.close()
    print(f"  ✅ Chart 4 저장: {chart4_path}")
else:
    print("  ⚠ 예측 결과 없음 — Chart 4 건너뜀")
    chart4_path = None


# ═══════════════════════════════════════════════════════════════
# 7. SUMMARY REPORT
# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  분석 결과 보고서 생성")
print("=" * 60)

# Build detailed metrics
gas_cat_summary = df.groupby('가스분류').agg(
    총수량=('배송수량', 'sum'),
    총건수=('배송수량', 'count'),
    평균수량=('배송수량', 'mean')
).sort_values('총수량', ascending=False)

# Delivery time distribution
time_distribution = df[df['출발_시'].notna()].groupby('출발_시').size()
peak_hour = time_distribution.idxmax()
peak_count = time_distribution.max()

# Vehicle utilization
vehicle_trips = df.groupby('차량번호').size()
vehicle_volume = df.groupby('차량번호')['배송수량'].sum()

# Forecast table for report
forecast_table_lines = []
for gas, res in forecast_results.items():
    for d in range(14):
        date = res['forecast'].index[d]
        forecast_table_lines.append(
            f"| {date.strftime('%Y-%m-%d')} | {dow_names_kr[date.dayofweek]} | "
            f"{res['forecast'].iloc[d]:,.0f} | {res['lower'].iloc[d]:,.0f} | {res['upper'].iloc[d]:,.0f} |"
        )

# Generate markdown report
report = f"""# 덕양가스 배송 데이터 분석 결과

> 분석일시: 2026-04-14
> 데이터 기간: {DATE_MIN.strftime('%Y-%m-%d')} ~ {DATE_MAX.strftime('%Y-%m-%d')} ({TOTAL_DAYS}일)
> 분석 대상: 매출(배송) 기록 {len(df):,}건
> 분석 도구: Python (pandas, statsmodels, matplotlib)

---

## 1. 핵심 요약 지표 (사업계획서 삽입용)

| 지표 | 값 | 비고 |
|------|-----|------|
| **총 배송건수** | {len(df):,}건 | 3개월 기준 |
| **일평균 배송건수** | {avg_daily_count:.1f}건 | 전일 평균 |
| **평일 일평균 배송건수** | {avg_weekday_count:.1f}건 | 월~금 |
| **주말 일평균 배송건수** | {avg_weekend_count:.1f}건 | 토~일 |
| **일평균 배송수량** | {avg_daily_volume:,.0f} | 전체 가스 합산 |
| **배송수량 변동계수(CV)** | **{cv_daily:.1f}%** | 높을수록 수요 불안정 |
| **배송건수 변동계수(CV)** | **{cv_daily_count:.1f}%** | 건수 기준 |
| **공차운행 비율** | **{empty_ratio:.1f}%** ({empty_runs:,}건) | 배송수량=0 |
| **주말배송 비율** | {weekend_ratio:.1f}% ({len(weekend):,}건) | 토/일 배송 |
| **조기출발(07시 이전) 비율** | {early_ratio:.1f}% | 출발시간 기록 건 대비 |
| **긴급/비정상 배송 비율** | **{emergency_ratio:.1f}%** | 주말+조기출발 합산 |
| **거래처 수** | {customer_summary.shape[0]}개 | 3개월 내 1건 이상 |
| **차량 수** | {vehicle_trips.shape[0]}대 | 운행 기록 차량 |
| **차량당 평균 운행건수** | {vehicle_trips.mean():.1f}건 | 3개월 기준 |
| **1→3월 건수 증가율** | {monthly_growth_count:+.1f}% | 월간 |
| **1→3월 수량 증가율** | {monthly_growth_volume:+.1f}% | 월간 |

### AI 도입 시 개선 가능 목표치 (추정)

| 개선 항목 | 현재 (As-Is) | 목표 (To-Be) | 개선율 |
|-----------|------------|------------|--------|
| 수요예측 정확도 (MAPE) | 수동 경험치 | {min(r['mape'] for r in forecast_results.values()):.1f}% 이하 | 정량화 가능 |
| 배송수량 변동계수(CV) | {cv_daily:.1f}% | {cv_daily * 0.7:.1f}% | 30% 감소 |
| 공차운행 비율 | {empty_ratio:.1f}% | {empty_ratio * 0.5:.1f}% | 50% 감소 |
| 긴급배송 비율 | {emergency_ratio:.1f}% | {emergency_ratio * 0.6:.1f}% | 40% 감소 |

---

## 2. 가스 제품별 배송 현황

| 가스 분류 | 총 배송수량 | 총 건수 | 건당 평균수량 | 비율 |
|-----------|-----------|--------|------------|------|
"""

total_qty = gas_cat_summary['총수량'].sum()
for gas_name, row in gas_cat_summary.iterrows():
    pct = row['총수량'] / total_qty * 100 if total_qty > 0 else 0
    report += f"| {gas_name} | {row['총수량']:,.0f} | {row['총건수']:,.0f} | {row['평균수량']:,.1f} | {pct:.1f}% |\n"

report += f"""
**벌크(탱크로리) vs 소용기 비율:**
"""

bulk_volume = gas_cat_summary[gas_cat_summary.index.str.contains('벌크')]['총수량'].sum()
cylinder_volume = total_qty - bulk_volume
report += f"- 벌크: {bulk_volume:,.0f} ({bulk_volume/total_qty*100:.1f}%)\n"
report += f"- 소용기: {cylinder_volume:,.0f} ({cylinder_volume/total_qty*100:.1f}%)\n"

report += f"""
---

## 3. 요일별 배송 패턴

| 요일 | 평균 건수 | 평균 수량 | 총 건수 |
|------|---------|---------|--------|
"""

for _, row in dow.iterrows():
    report += f"| {row['요일명']} | {row['평균건수']:.1f} | {row['평균수량']:,.0f} | {row['합계건수']:,} |\n"

report += f"""
**패턴 분석:**
- 평일(월~금) 평균: {avg_weekday_count:.1f}건, 주말(토~일) 평균: {avg_weekend_count:.1f}건
- 주말 대비 평일 배송량 비율: {avg_weekday_count/max(avg_weekend_count,0.01):.1f}배
- 피크 출발시간대: {int(peak_hour):02d}시 ({peak_count}건)

---

## 4. 상위 10개 거래처

| 순위 | 거래처명 | 총 배송수량 | 건수 | 거래일수 | 주요 품목 |
|------|---------|-----------|------|---------|---------|
"""

for rank, (name, row) in enumerate(top10_customers.iterrows(), 1):
    report += f"| {rank} | {name} | {row['총수량']:,.0f} | {row['총건수']:,.0f} | {row['거래일수']}일 | {row['주요품목']} |\n"

top10_pct = top10_customers['총수량'].sum() / total_qty * 100
report += f"\n**상위 10개 거래처 점유율:** {top10_pct:.1f}% (파레토 원칙 적용 대상)\n"

report += f"""
---

## 5. 수요예측 모델 결과 (Holt-Winters Exponential Smoothing)

### 모델 성능

| 가스 분류 | MAE | MAPE | 잔차 표준편차 | AIC |
|-----------|-----|------|-----------|-----|
"""

for gas, res in forecast_results.items():
    report += f"| {gas} | {res['mae']:,.0f} | {res['mape']:.1f}% | {res['residual_std']:,.0f} | {res['aic']:,.0f} |\n"

report += f"""
### 가스별 변동계수(CV)

| 가스 분류 | CV(%) | 해석 |
|-----------|-------|------|
"""

for gas, cv_val in cv_by_gas.items():
    interp = '안정' if cv_val < 50 else '변동성 중간' if cv_val < 80 else '변동성 높음'
    report += f"| {gas} | {cv_val:.1f}% | {interp} |\n"

report += "\n### 14일 예측 상세 (상위 3개 가스)\n\n"

for gas, res in forecast_results.items():
    report += f"\n#### {gas}\n\n"
    report += "| 날짜 | 요일 | 예측수량 | 하한(95%) | 상한(95%) |\n"
    report += "|------|------|---------|----------|----------|\n"
    for d in range(14):
        date = res['forecast'].index[d]
        report += (f"| {date.strftime('%Y-%m-%d')} | {dow_names_kr[date.dayofweek]} | "
                   f"{res['forecast'].iloc[d]:,.0f} | {res['lower'].iloc[d]:,.0f} | "
                   f"{res['upper'].iloc[d]:,.0f} |\n")
    report += f"\n- 14일 예측 평균: **{res['forecast'].mean():,.0f}**\n"
    report += f"- 14일 예측 합계: **{res['forecast'].sum():,.0f}**\n"

report += f"""
---

## 6. 생성된 차트 목록

| 파일명 | 설명 |
|--------|------|
| `demand_01_daily_trend.png` | 일별 총 배송수량 추이 (7일 이동평균 포함) |
| `demand_02_dow_pattern.png` | 요일별 수요 패턴 (건수/수량) |
| `demand_03_top10_customers.png` | 상위 10개 거래처 배송수량 |
| `demand_04_forecast_14day.png` | 14일 수요예측 (신뢰구간 포함) |

---

## 7. 사업계획서 활용 포인트

### 수요예측 AI 모듈 정당성
1. **높은 수요 변동성(CV {cv_daily:.1f}%)** → AI 기반 수요예측으로 안정화 필요
2. **공차운행 {empty_ratio:.1f}%** → 수요예측 정확도 향상 시 공차율 50% 이상 감소 가능
3. **긴급배송 {emergency_ratio:.1f}%** → 선제적 수요예측으로 사전 배차 가능

### 배차최적화 AI 모듈 정당성
4. **일평균 {avg_daily_count:.1f}건** 배차를 {vehicle_trips.shape[0]}대 차량으로 운영 → 최적 배분 필요
5. **상위 10개 거래처가 {top10_pct:.1f}% 점유** → 핵심 거래처 VMI(자동재고관리) 우선 도입

### 데이터 기반 기대효과 수치
6. **현재 MAPE 기준선:** {min(r['mape'] for r in forecast_results.values()):.1f}% (가장 안정적 품목)
   - AI 도입 후 목표: MAPE 10% 이하
7. **연간 추정 배송건수:** {avg_daily_count * 365:,.0f}건 (일평균 기준 환산)
8. **연간 추정 배송수량:** {avg_daily_volume * 365:,.0f} (일평균 기준 환산)
"""

# Save report
report_path = os.path.join(DOCS_DIR, '덕양_데이터_분석_결과.md')
with open(report_path, 'w', encoding='utf-8') as f:
    f.write(report)

print(f"\n✅ 보고서 저장: {report_path}")
print(f"\n{'=' * 60}")
print(f"  분석 완료!")
print(f"  - 차트 4개: {PNG_DIR}/demand_*.png")
print(f"  - 보고서: {report_path}")
print(f"{'=' * 60}")
