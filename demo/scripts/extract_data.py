#!/usr/bin/env python3
"""
덕양가스 AI 물류 플랫폼 데모 데이터 추출 스크립트
Excel 원본 데이터에서 JSON 데이터 파일을 생성합니다.
"""

import json
import math
import os
import random
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

# ============================================================
# Configuration
# ============================================================
random.seed(42)
np.random.seed(42)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_SRC = os.path.join(os.path.dirname(BASE_DIR), "덕양 자료")
DATA_OUT = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_OUT, exist_ok=True)

# Product code mapping
PRODUCT_MAP = {
    "N2-TK": ("N2", "액화질소"),
    "N2-TK(L)": ("N2", "액화질소"),
    "O2-TK": ("O2", "액화산소"),
    "O2-TK(M)": ("O2", "액화산소(의료용)"),
    "CO2-TK": ("CO2", "액화탄산"),
    "AR-TK": ("AR", "액화아르곤"),
    "LPG-TK": ("LPG", "액화석유가스"),
    "C2H4-TK": ("C2H4", "액화에틸렌"),
    "AR-TK(P)": ("AR", "액화아르곤"),
    "C2H4-TK(P)": ("C2H4", "액화에틸렌"),
    "CO2-TK(P)": ("CO2", "액화탄산"),
    "N2-TK(P)": ("N2", "액화질소"),
    "O2-TK(P)": ("O2", "액화산소"),
}

# Realistic coordinates for Ulsan/Gyeongnam industrial areas
# Grouped by district for realistic placement
LOCATION_ZONES = {
    "울산본사_달천": (35.5234, 129.3456),
    "온산공단": (35.4220, 129.2910),
    "매곡공단": (35.5550, 129.3250),
    "효문공단": (35.5420, 129.3710),
    "용연공단": (35.4850, 129.3820),
    "모화공단": (35.5100, 129.3100),
    "경포": (35.5680, 129.3580),
    "냉천": (35.5050, 129.3200),
    "두왕": (35.4950, 129.3600),
    "양산": (35.3350, 129.0380),
    "김해": (35.2300, 128.8900),
    "경주": (35.8560, 129.2250),
    "대구": (35.8700, 128.6010),
    "포항": (36.0190, 129.3430),
    "여수": (34.7600, 127.6620),
    "광양": (34.9400, 127.6960),
}

# Assign zone by keyword in customer/delivery name
def assign_coordinates(name,납품처=""):
    """Assign realistic coordinates based on customer/delivery name keywords."""
    combined = f"{name} {납품처}"
    if "온산" in combined:
        base = LOCATION_ZONES["온산공단"]
    elif "매곡" in combined:
        base = LOCATION_ZONES["매곡공단"]
    elif "용연" in combined:
        base = LOCATION_ZONES["용연공단"]
    elif "모화" in combined:
        base = LOCATION_ZONES["모화공단"]
    elif "경포" in combined:
        base = LOCATION_ZONES["경포"]
    elif "냉천" in combined:
        base = LOCATION_ZONES["냉천"]
    elif "두동" in combined or "두왕" in combined:
        base = LOCATION_ZONES["두왕"]
    elif "양산" in combined:
        base = LOCATION_ZONES["양산"]
    elif "김해" in combined:
        base = LOCATION_ZONES["김해"]
    elif "경주" in combined:
        base = LOCATION_ZONES["경주"]
    elif "대구" in combined or "경북" in combined:
        base = LOCATION_ZONES["대구"]
    elif "포항" in combined:
        base = LOCATION_ZONES["포항"]
    elif "여수" in combined:
        base = LOCATION_ZONES["여수"]
    elif "광양" in combined:
        base = LOCATION_ZONES["광양"]
    elif "현대미포" in combined or "미포" in combined:
        base = (35.5012, 129.3857)
    elif "현대중공업" in combined:
        base = (35.5090, 129.3750)
    elif "현대힘스" in combined:
        base = (35.5055, 129.3180)
    elif "유니스트" in combined or "울산과학기술원" in combined:
        base = (35.5730, 129.1900)
    elif "롯데정밀" in combined:
        base = (35.5150, 129.3480)
    elif "홍인화학" in combined:
        base = (35.5320, 129.3120)
    elif "서한이앤피" in combined:
        base = (35.5480, 129.2850)
    elif "울산대학교병원" in combined or "울산병원" in combined:
        base = (35.5410, 129.3550)
    elif "포스코" in combined:
        base = (36.0100, 129.3600)
    elif "삼성중공업" in combined:
        base = (35.0800, 128.6200)
    elif "한화오션" in combined:
        base = (35.0900, 128.6100)
    else:
        # Default: random position in Ulsan industrial area
        base = (35.52 + random.uniform(-0.05, 0.05), 129.33 + random.uniform(-0.06, 0.06))

    # Add small jitter
    lat = round(base[0] + random.uniform(-0.008, 0.008), 4)
    lng = round(base[1] + random.uniform(-0.008, 0.008), 4)
    return lat, lng


def shorten_name(name):
    """Create a short name for display."""
    # Remove common suffixes
    short = name
    for suffix in ["주식회사", "(주)", "(구.", "주식회사)", "에이치에스티"]:
        short = short.replace(suffix, "")
    short = short.strip()
    if len(short) > 6:
        short = short[:6]
    return short


# ============================================================
# 1. CUSTOMERS.JSON
# ============================================================
def generate_customers():
    print("Generating customers.json ...")
    df = pd.read_excel(os.path.join(DATA_SRC, "1. 공급 수급 거래처 현황(탱크로리).xlsx"), header=None)

    # Filter 매출 (sales to customers)
    sales = df[df.iloc[:, 0] == "매출"].copy()

    # Calculate monthly totals per customer-product
    customers = []
    for idx, row in sales.iterrows():
        거래처 = str(row.iloc[1]).strip()
        납품처 = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ""
        품목_raw = str(row.iloc[3]).strip()
        daily_vals = pd.to_numeric(row.iloc[4:], errors="coerce").fillna(0)
        total = daily_vals.sum()
        delivery_count = int((daily_vals > 0).sum())

        product_code, product_name = PRODUCT_MAP.get(품목_raw, ("ETC", 품목_raw))

        customers.append({
            "거래처": 거래처,
            "납품처": 납품처,
            "품목_raw": 품목_raw,
            "product": product_code,
            "productName": product_name,
            "total": total,
            "monthlyDeliveries": delivery_count,
        })

    # Sort by total descending, take top 45
    customers.sort(key=lambda x: x["total"], reverse=True)
    customers = customers[:45]

    result = []
    for i, c in enumerate(customers):
        cid = f"C{i + 1:03d}"
        name = c["납품처"] if c["납품처"] and c["납품처"] != "nan" else c["거래처"]
        # Clean up name: remove ● * ○ symbols
        display_name = name.replace("●", "").replace("*", "").replace("○", "").strip()

        lat, lng = assign_coordinates(c["거래처"], c["납품처"])

        # Tank capacity based on product
        cap_ranges = {
            "N2": (3000, 8000), "O2": (3000, 7000), "CO2": (2000, 5000),
            "AR": (2000, 5000), "LPG": (3000, 8000), "C2H4": (2000, 5000),
        }
        cap_min, cap_max = cap_ranges.get(c["product"], (2000, 5000))
        tank_capacity = int(round(random.randint(cap_min, cap_max), -2))

        # Daily consumption: scale relative to tank capacity for realistic depletion
        # Real data shows total monthly kg delivered; daily consumption should make
        # sense relative to tank capacity (deplete in 5-20 days typically)
        raw_daily = c["total"] / 31  # March has 31 days
        # Scale so that a full tank lasts 7-20 days on average
        target_days = random.uniform(7, 20)
        daily_consumption = int(round(tank_capacity / target_days, -1))
        if daily_consumption < 50:
            daily_consumption = random.randint(80, 300)

        # Current level: create meaningful variety for demo
        # Top 3 = danger (low level), next 5 = warning zone, next 7 = mixed, rest random
        if i < 3:
            current_level = random.randint(8, 20)  # Danger (very low)
        elif i < 8:
            current_level = random.randint(35, 55)  # Warning zone
        elif i < 15:
            current_level = random.randint(55, 85)  # Mostly safe
        else:
            current_level = random.randint(25, 95)  # Random spread

        # Calculate depletion
        remaining = tank_capacity * current_level / 100
        depletion_days = round(remaining / daily_consumption, 1) if daily_consumption > 0 else 99

        if depletion_days < 3:
            risk_level = "danger"
        elif depletion_days < 7:
            risk_level = "warning"
        else:
            risk_level = "safe"

        result.append({
            "id": cid,
            "name": display_name,
            "shortName": shorten_name(display_name),
            "lat": lat,
            "lng": lng,
            "product": c["product"],
            "productName": c["productName"],
            "tankCapacity": tank_capacity,
            "currentLevel": current_level,
            "dailyConsumption": daily_consumption,
            "depletionDays": depletion_days,
            "riskLevel": risk_level,
            "monthlyDeliveries": c["monthlyDeliveries"],
        })

    with open(os.path.join(DATA_OUT, "customers.json"), "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"  -> {len(result)} customers written")
    return result


# ============================================================
# 2. VEHICLES.JSON
# ============================================================
def generate_vehicles():
    print("Generating vehicles.json ...")
    df = pd.read_excel(os.path.join(DATA_SRC, "6. 차량리스트.xlsx"))

    # Get driver names from 운행 data
    delivery_df = pd.read_excel(os.path.join(DATA_SRC, "2. 운행 상세현황 - DINOERP 20250101-20260331.xlsx"))
    # Build plate -> driver mapping from most recent records
    delivery_df_sorted = delivery_df.sort_values("운행일자", ascending=False)
    plate_driver = {}
    for _, row in delivery_df_sorted.iterrows():
        plate = str(row["차량번호"]).strip()
        driver = str(row["기사명"]).strip()
        if plate not in plate_driver and driver != "nan":
            plate_driver[plate] = driver

    # Location mapping from 구분 column
    location_map = {}
    for _, row in df.iterrows():
        구분 = str(row["구분"]).strip()
        plate = str(row["차량번호"]).strip()
        if "달천" in 구분:
            location_map[plate] = "달천"
        elif "경산" in 구분:
            location_map[plate] = "경산"
        elif "경포" in 구분:
            location_map[plate] = "경포"
        elif "당진" in 구분:
            location_map[plate] = "당진"
        elif "여수" in 구분:
            location_map[plate] = "여수"
        else:
            location_map[plate] = "달천"

    # Vehicle type mapping
    def get_vehicle_type(구분, 품목):
        if "BULK" in str(구분).upper():
            return "bulk", "벌크(탱크로리)"
        elif "LPG" in str(구분).upper() or "LPG" in str(품목).upper():
            return "lpg", "LPG 벌크"
        elif "5톤" in str(구분) or "포터" in str(구분) or "CYL" in str(품목):
            return "cylinder", "실린더 배송"
        elif "톤" in str(구분):
            return "cylinder", "실린더 배송"
        else:
            return "bulk", "벌크(탱크로리)"

    vehicles = []
    all_drivers = list(set(d for d in plate_driver.values() if d != "nan"))

    for idx, row in df.iterrows():
        vid = f"V{idx + 1:03d}"
        plate = str(row["차량번호"]).strip()
        year = int(row["년식"]) if pd.notna(row["년식"]) else 2015
        age = 2026 - year
        model = str(row["차명"]).strip() if pd.notna(row["차명"]) else "트라고"
        # Clean model name
        model = model.replace("\t", "").strip()
        product = str(row["품목"]).strip() if pd.notna(row["품목"]) else "N2"
        product_name_map = {
            "CO2": "액화탄산", "N2": "액화질소", "O2": "액화산소",
            "AR": "액화아르곤", "LPG": "액화석유가스", "LPG 12": "LPG 12톤",
            "LPG 10": "LPG 10톤", "C2H4": "액화에틸렌", "CYL": "실린더",
        }
        product_name = product_name_map.get(product, product)
        구분 = str(row["구분"]).strip()
        vtype, vtype_name = get_vehicle_type(구분, product)
        driver = plate_driver.get(plate, random.choice(all_drivers) if all_drivers else "미배정")
        location = location_map.get(plate, "달천")

        # Status distribution: 70% running, 20% idle, 10% warning
        r = random.random()
        if r < 0.70:
            status = "running"
        elif r < 0.90:
            status = "idle"
        else:
            status = "warning"

        # Health score: older vehicles tend to have lower scores
        base_health = max(45, 98 - age * 3 + random.randint(-10, 10))
        if status == "warning":
            base_health = min(base_health, random.randint(45, 62))
        health_score = min(98, max(45, base_health))

        # Mileage: correlated with age
        mileage = int(age * random.randint(18000, 28000) + random.randint(-5000, 5000))
        mileage = max(10000, mileage)

        # Coordinates: running vehicles on roads, idle at base
        if status == "running":
            lat = round(35.48 + random.uniform(0, 0.10), 4)
            lng = round(129.28 + random.uniform(0, 0.14), 4)
        else:
            # At base location
            if location == "달천":
                lat = round(35.5234 + random.uniform(-0.003, 0.003), 4)
                lng = round(129.3456 + random.uniform(-0.003, 0.003), 4)
            elif location == "경산":
                lat = round(35.8270 + random.uniform(-0.003, 0.003), 4)
                lng = round(128.7350 + random.uniform(-0.003, 0.003), 4)
            elif location == "경포":
                lat = round(35.5680 + random.uniform(-0.003, 0.003), 4)
                lng = round(129.3580 + random.uniform(-0.003, 0.003), 4)
            elif location == "당진":
                lat = round(36.8895 + random.uniform(-0.003, 0.003), 4)
                lng = round(126.6294 + random.uniform(-0.003, 0.003), 4)
            else:
                lat = round(35.5234 + random.uniform(-0.003, 0.003), 4)
                lng = round(129.3456 + random.uniform(-0.003, 0.003), 4)

        vehicles.append({
            "id": vid,
            "plateNumber": plate,
            "type": vtype,
            "typeName": vtype_name,
            "product": product.replace(" ", ""),
            "productName": product_name,
            "model": model,
            "year": year,
            "age": age,
            "mileage": mileage,
            "location": location,
            "driver": driver,
            "status": status,
            "healthScore": health_score,
            "lat": lat,
            "lng": lng,
        })

    with open(os.path.join(DATA_OUT, "vehicles.json"), "w", encoding="utf-8") as f:
        json.dump(vehicles, f, ensure_ascii=False, indent=2)
    print(f"  -> {len(vehicles)} vehicles written")
    return vehicles


# ============================================================
# 3. DELIVERIES.JSON
# ============================================================
def generate_deliveries():
    print("Generating deliveries.json ...")
    df = pd.read_excel(os.path.join(DATA_SRC, "2. 운행 상세현황 - DINOERP 20250101-20260331.xlsx"))

    # Last 30 days (March 2025)
    last30 = df[df["운행일자"] >= 20250301].copy()
    # Only 매출 (sales deliveries)
    sales = last30[last30["구분"] == "매출"].copy()

    deliveries = []
    for _, row in sales.iterrows():
        date_val = int(row["운행일자"])
        date_str = f"{date_val // 10000}-{(date_val % 10000) // 100:02d}-{date_val % 100:02d}"
        customer = str(row["거래처명"]).strip() if pd.notna(row["거래처명"]) else ""
        delivery_to = str(row["납품처명"]).strip() if pd.notna(row["납품처명"]) else customer
        # Clean up display names
        delivery_to = delivery_to.replace("●", "").replace("*", "").replace("○", "").strip()
        customer = customer.replace("●", "").replace("*", "").replace("○", "").strip()

        product_raw = str(row["품명"]).strip() if pd.notna(row["품명"]) else ""
        # Map product name to code
        if "질소" in product_raw and "탱크로리" in product_raw:
            product = "N2"
        elif "산소" in product_raw and "탱크로리" in product_raw:
            product = "O2"
        elif "탄산" in product_raw and "탱크로리" in product_raw:
            product = "CO2"
        elif "알곤" in product_raw and "탱크로리" in product_raw:
            product = "AR"
        elif "에틸렌" in product_raw and "탱크로리" in product_raw:
            product = "C2H4"
        elif "LPG" in product_raw or "석유가스" in product_raw:
            product = "LPG"
        elif "질소" in product_raw:
            product = "N2"
        elif "산소" in product_raw:
            product = "O2"
        elif "탄소" in product_raw or "CO2" in product_raw:
            product = "CO2"
        elif "알곤" in product_raw or "AR" in product_raw:
            product = "AR"
        else:
            product = "ETC"

        quantity = int(row["배송수량"]) if pd.notna(row["배송수량"]) else 0
        vehicle = str(row["차량번호"]).strip() if pd.notna(row["차량번호"]) else ""
        driver = str(row["기사명"]).strip() if pd.notna(row["기사명"]) else ""

        # Parse departure / arrival times
        dep = str(row["출발일시"]).strip() if pd.notna(row["출발일시"]) else ""
        arr = str(row["도착일시"]).strip() if pd.notna(row["도착일시"]) else ""
        dep_time = dep.split(" ")[-1] if " " in dep else ""
        arr_time = arr.split(" ")[-1] if " " in arr else ""

        # If times are missing, generate realistic ones
        if not dep_time or dep_time == "nan":
            hour = random.randint(6, 16)
            minute = random.randint(0, 59)
            dep_time = f"{hour:02d}:{minute:02d}"
            # Arrival ~30-90 min later
            travel = random.randint(30, 90)
            arr_dt = datetime(2025, 1, 1, hour, minute) + timedelta(minutes=travel)
            arr_time = arr_dt.strftime("%H:%M")

        distance = row["운행거리"] if pd.notna(row["운행거리"]) else 0
        if distance <= 0 or distance > 500:
            distance = round(random.uniform(5, 80), 1)
        else:
            distance = round(float(distance), 1)

        if customer and driver != "nan" and quantity > 0:
            deliveries.append({
                "date": date_str,
                "customer": customer,
                "deliveryTo": delivery_to,
                "product": product,
                "quantity": quantity,
                "vehicle": vehicle,
                "driver": driver,
                "departureTime": dep_time,
                "arrivalTime": arr_time,
                "distance": distance,
            })

    # Sort by date
    deliveries.sort(key=lambda x: x["date"])

    with open(os.path.join(DATA_OUT, "deliveries.json"), "w", encoding="utf-8") as f:
        json.dump(deliveries, f, ensure_ascii=False, indent=2)
    print(f"  -> {len(deliveries)} deliveries written")
    return deliveries


# ============================================================
# 4. FORECAST.JSON
# ============================================================
def generate_forecast(customers):
    print("Generating forecast.json ...")

    # Use top 10 customers
    top10 = customers[:10]
    forecast_data = {}

    for cust in top10:
        name = cust["name"]
        product = cust["product"]
        tank_cap = cust["tankCapacity"]
        daily_cons = cust["dailyConsumption"]
        current_level = cust["currentLevel"]

        # Generate 30 days of history (level goes up on refill, down from consumption)
        history = []
        base_date = datetime(2025, 3, 1)
        level = random.randint(70, 95)  # Start high 30 days ago

        for d in range(30):
            date = base_date + timedelta(days=d)
            # Daily consumption with noise
            daily_var = daily_cons * random.uniform(0.7, 1.3)
            level -= (daily_var / tank_cap) * 100

            # Refill when below 25%
            if level < 25:
                level = random.randint(75, 95)

            level = max(5, min(98, level))
            history.append({
                "date": date.strftime("%Y-%m-%d"),
                "level": round(level, 1),
            })

        # Set last history point to current level
        history[-1]["level"] = current_level

        # Generate 14 days of forecast
        forecast_pts = []
        forecast_base = datetime(2025, 3, 31)
        pred_level = current_level

        for d in range(1, 15):
            date = forecast_base + timedelta(days=d)
            # Holt-Winters style: trend + seasonality
            daily_var = daily_cons * (1 + 0.05 * math.sin(d * 0.9))
            pred_level -= (daily_var / tank_cap) * 100

            # Confidence interval widens over time
            ci_width = 3 + d * 1.2
            lower = max(0, round(pred_level - ci_width, 1))
            upper = min(100, round(pred_level + ci_width, 1))

            if pred_level < 20 and d > 3:
                # Assume refill scheduled
                pred_level = random.randint(70, 85)

            pred_level = max(0, min(100, pred_level))

            forecast_pts.append({
                "date": date.strftime("%Y-%m-%d"),
                "predicted": round(pred_level, 1),
                "lower": lower,
                "upper": upper,
            })

        # Depletion date: when level first reaches < 10%
        depletion_date = None
        sim_level = current_level
        for d in range(1, 30):
            sim_level -= (daily_cons / tank_cap) * 100
            if sim_level < 10:
                depletion_date = (datetime(2025, 3, 31) + timedelta(days=d)).strftime("%Y-%m-%d")
                break

        # MAPE: realistic 5-30%
        mape = round(random.uniform(5, 30), 1)

        # Recommended refill quantity
        recommended_refill = int(round(tank_cap * 0.8, -2))

        # Top factors
        factor_pool = [
            "기온 하강 (+12%)", "기온 상승 (-8%)", "가동률 증가 (+8%)",
            "가동률 감소 (-5%)", "요일 패턴 (화요일 피크)", "주말 감소 (-15%)",
            "월초 수요 증가 (+10%)", "원자재 가격 상승 (+6%)",
            "계절 요인 (봄철 증가 +7%)", "설비 점검 예정 (-20%)",
            "대형 프로젝트 착수 (+18%)", "조선 물량 증가 (+14%)",
        ]
        top_factors = random.sample(factor_pool, 3)

        forecast_data[name] = {
            "product": product,
            "currentLevel": current_level,
            "history": history,
            "forecast": forecast_pts,
            "depletionDate": depletion_date,
            "recommendedRefill": recommended_refill,
            "mape": mape,
            "topFactors": top_factors,
        }

    with open(os.path.join(DATA_OUT, "forecast.json"), "w", encoding="utf-8") as f:
        json.dump(forecast_data, f, ensure_ascii=False, indent=2)
    print(f"  -> {len(forecast_data)} customer forecasts written")
    return forecast_data


# ============================================================
# 5. ROUTES.JSON
# ============================================================
def generate_routes(vehicles, customers):
    print("Generating routes.json ...")

    # Home base (울산 본사 달천)
    HOME = {"name": "울산 본사(달천)", "lat": 35.5234, "lng": 129.3456}

    # Pick 6 bulk vehicles with drivers
    bulk_vehicles = [v for v in vehicles if v["type"] == "bulk"][:6]

    # Pick customer stops (use actual customer data)
    cust_stops = [
        {"name": c["name"], "lat": c["lat"], "lng": c["lng"]}
        for c in customers[:30]
    ]

    def make_route(vehicle, stops, total_dist):
        return {
            "id": vehicle["id"],
            "plateNumber": vehicle["plateNumber"],
            "driver": vehicle["driver"],
            "product": vehicle["product"],
            "stops": [HOME] + stops + [HOME],
            "distance": total_dist,
            "deliveries": len(stops),
        }

    # BEFORE: Inefficient routes with crossing paths
    before_vehicles = []
    # Deliberately create crossing routes
    # Vehicle 1: goes south then north then south
    before_vehicles.append(make_route(bulk_vehicles[0], [
        cust_stops[5], cust_stops[20], cust_stops[2], cust_stops[18], cust_stops[8],
    ], 245))
    before_vehicles.append(make_route(bulk_vehicles[1], [
        cust_stops[12], cust_stops[1], cust_stops[15], cust_stops[3],
    ], 218))
    before_vehicles.append(make_route(bulk_vehicles[2], [
        cust_stops[7], cust_stops[22], cust_stops[4], cust_stops[19],
    ], 195))
    before_vehicles.append(make_route(bulk_vehicles[3], [
        cust_stops[10], cust_stops[25], cust_stops[6], cust_stops[14], cust_stops[9],
    ], 230))
    before_vehicles.append(make_route(bulk_vehicles[4], [
        cust_stops[16], cust_stops[0], cust_stops[21], cust_stops[11],
    ], 187))
    before_vehicles.append(make_route(bulk_vehicles[5], [
        cust_stops[13], cust_stops[24], cust_stops[17], cust_stops[23],
    ], 165))

    before_total_dist = sum(v["distance"] for v in before_vehicles)

    # AFTER: Optimized routes with clustered stops
    # Sort stops by geography for each vehicle
    after_vehicles = []
    after_vehicles.append(make_route(bulk_vehicles[0], [
        cust_stops[0], cust_stops[1], cust_stops[2], cust_stops[3],
    ], 142))
    after_vehicles.append(make_route(bulk_vehicles[1], [
        cust_stops[4], cust_stops[5], cust_stops[6], cust_stops[7],
    ], 128))
    after_vehicles.append(make_route(bulk_vehicles[2], [
        cust_stops[8], cust_stops[9], cust_stops[10], cust_stops[11],
    ], 135))
    after_vehicles.append(make_route(bulk_vehicles[3], [
        cust_stops[12], cust_stops[13], cust_stops[14], cust_stops[15], cust_stops[16],
    ], 168))
    after_vehicles.append(make_route(bulk_vehicles[4], [
        cust_stops[17], cust_stops[18], cust_stops[19], cust_stops[20],
    ], 155))
    after_vehicles.append(make_route(bulk_vehicles[5], [
        cust_stops[21], cust_stops[22], cust_stops[23], cust_stops[24], cust_stops[25],
    ], 162))

    after_total_dist = sum(v["distance"] for v in after_vehicles)

    routes = {
        "before": {
            "totalDistance": before_total_dist,
            "totalTime": 580,
            "emptyRunRate": 7.6,
            "fuelCost": 1860000,
            "co2Emission": 4820,
            "vehicles": before_vehicles,
        },
        "after": {
            "totalDistance": after_total_dist,
            "totalTime": 420,
            "emptyRunRate": 3.2,
            "fuelCost": 1340000,
            "co2Emission": 3470,
            "vehicles": after_vehicles,
        },
    }

    with open(os.path.join(DATA_OUT, "routes.json"), "w", encoding="utf-8") as f:
        json.dump(routes, f, ensure_ascii=False, indent=2)

    reduction = round((1 - after_total_dist / before_total_dist) * 100, 1)
    print(f"  -> routes written (before: {before_total_dist}km, after: {after_total_dist}km, reduction: {reduction}%)")
    return routes


# ============================================================
# 6. KAKAO_SAMPLES.JSON
# ============================================================
def generate_kakao_samples():
    print("Generating kakao_samples.json ...")

    samples = [
        {
            "id": "K001",
            "type": "order",
            "sender": "현대미포조선 구매팀",
            "timestamp": "2025-03-31 08:42",
            "message": "덕양가스 울산 배차팀 질소 1대 부탁드립니다. 본사 2공장 탱크입니다.",
            "parsed": {
                "customer": "현대미포조선",
                "product": "N2",
                "quantity": "1대 (약 15톤)",
                "location": "본사 2공장",
                "urgency": "일반",
            },
            "aiAction": "자동 배차 처리 -> 84노1302 (이재원 기사) 배정, 예상 도착 10:30",
        },
        {
            "id": "K002",
            "type": "urgent",
            "sender": "울산대학교병원 시설팀",
            "timestamp": "2025-03-31 14:15",
            "message": "산소 탱크 잔량 15% 아래로 떨어졌습니다. 긴급 배송 부탁드립니다!",
            "parsed": {
                "customer": "울산대학교병원",
                "product": "O2 (의료용)",
                "quantity": "긴급 1대",
                "location": "병원 의료가스실",
                "urgency": "긴급",
            },
            "aiAction": "긴급 배차 -> 88소1619 (김봉진 기사) 즉시 출발, 예상 도착 15:00",
        },
        {
            "id": "K003",
            "type": "order",
            "sender": "홍인화학 생산관리부",
            "timestamp": "2025-03-31 09:20",
            "message": "질소 내일 오전 중 1대 배송 부탁합니다. CA라인 탱크요.",
            "parsed": {
                "customer": "홍인화학",
                "product": "N2",
                "quantity": "1대",
                "location": "CA라인",
                "urgency": "일반 (익일)",
            },
            "aiAction": "익일 배차 예약 -> 4/1 08:00 80오0223 (이재원 기사) 배정",
        },
        {
            "id": "K004",
            "type": "inquiry",
            "sender": "삼흥에너지",
            "timestamp": "2025-03-31 11:05",
            "message": "코메론 탱크 질소 이번주 금요일 배송 가능한가요? 잔량 40% 정도입니다.",
            "parsed": {
                "customer": "삼흥에너지 (코메론)",
                "product": "N2",
                "quantity": "1대",
                "location": "코메론 탱크",
                "urgency": "예약 (금요일)",
            },
            "aiAction": "AI 수요 예측: 금요일까지 잔량 22% 예상 -> 금요일 오전 배차 권장, 84노1302 예약",
        },
        {
            "id": "K005",
            "type": "order",
            "sender": "유니스트 연구지원팀",
            "timestamp": "2025-03-31 10:30",
            "message": "101동, 106동, 108동 질소 각 200kg씩 부탁드립니다.",
            "parsed": {
                "customer": "울산과학기술원(유니스트)",
                "product": "N2",
                "quantity": "600kg (3개동 분배)",
                "location": "101동, 106동, 108동",
                "urgency": "일반",
            },
            "aiAction": "다중 납품지 배차 -> 80오0223 1대로 3개동 순회 배송, 최적 경로 생성",
        },
    ]

    with open(os.path.join(DATA_OUT, "kakao_samples.json"), "w", encoding="utf-8") as f:
        json.dump(samples, f, ensure_ascii=False, indent=2)
    print(f"  -> {len(samples)} kakao samples written")
    return samples


# ============================================================
# 7. SAFETY_EVENTS.JSON
# ============================================================
def generate_safety_events(vehicles):
    print("Generating safety_events.json ...")

    event_types = [
        ("급제동", "warning", "급제동 감지 (감속도 > 0.5G)"),
        ("급가속", "warning", "급가속 감지 (가속도 > 0.4G)"),
        ("과속", "danger", "제한속도 초과 (80km/h 구간에서 95km/h 감지)"),
        ("차선이탈", "danger", "차선이탈 경고 발생"),
        ("졸음운전", "danger", "졸음운전 의심 감지 (3초간 차선 흔들림)"),
        ("사각지대 접근", "warning", "사각지대 내 보행자/차량 감지"),
        ("후방 근접", "info", "후방 근접 알림 (2m 이내 장애물)"),
        ("급커브 과속", "warning", "급커브 구간 과속 진입 감지"),
        ("연료 누출 의심", "danger", "탱크 압력 이상 감지 (LPG 차량)"),
        ("타이어 압력 이상", "warning", "좌측 후방 타이어 압력 저하 (28psi)"),
    ]

    locations = [
        "울산시 남구 달천동 산업로",
        "울산시 울주군 온산공단 입구",
        "울산시 북구 매곡동 공단로",
        "울산시 동구 방어진순환도로",
        "경주시 외동읍 국도 7호선",
        "양산시 물금읍 물금로",
        "울산시 남구 여천동 산업로",
        "울산시 울주군 범서읍 국도 24호",
        "울산시 남구 무거동 대학로",
        "울산시 중구 학성동 중앙로",
    ]

    events = []
    bulk_vehicles = [v for v in vehicles if v["type"] == "bulk"]

    for i in range(20):
        event_type, severity, description = random.choice(event_types)
        vehicle = random.choice(bulk_vehicles)
        days_ago = random.randint(0, 29)
        event_date = datetime(2025, 3, 31) - timedelta(days=days_ago)
        hour = random.randint(6, 20)
        minute = random.randint(0, 59)

        events.append({
            "id": f"SE{i + 1:03d}",
            "timestamp": event_date.strftime(f"%Y-%m-%d {hour:02d}:{minute:02d}"),
            "vehicleId": vehicle["id"],
            "plateNumber": vehicle["plateNumber"],
            "driver": vehicle["driver"],
            "eventType": event_type,
            "severity": severity,
            "description": description,
            "location": random.choice(locations),
            "lat": round(35.48 + random.uniform(0, 0.12), 4),
            "lng": round(129.25 + random.uniform(0, 0.15), 4),
            "speed": random.randint(30, 95) if "과속" in event_type else random.randint(20, 70),
            "resolved": random.random() > 0.3,
        })

    # Sort by timestamp descending
    events.sort(key=lambda x: x["timestamp"], reverse=True)

    with open(os.path.join(DATA_OUT, "safety_events.json"), "w", encoding="utf-8") as f:
        json.dump(events, f, ensure_ascii=False, indent=2)
    print(f"  -> {len(events)} safety events written")
    return events


# ============================================================
# 8. VEHICLE_HEALTH.JSON
# ============================================================
def generate_vehicle_health(vehicles):
    print("Generating vehicle_health.json ...")

    # Detailed health for top 10 bulk vehicles
    bulk_vehicles = [v for v in vehicles if v["type"] == "bulk"][:10]

    component_types = [
        ("engine", "엔진"),
        ("transmission", "변속기"),
        ("brakes", "브레이크"),
        ("tires", "타이어"),
        ("tankPressure", "탱크 압력"),
        ("suspension", "서스펜션"),
        ("electrical", "전기 시스템"),
        ("cooling", "냉각 시스템"),
    ]

    detailed = []
    for v in bulk_vehicles:
        components = {}
        for comp_key, comp_name in component_types:
            score = random.randint(50, 98)
            # Older vehicles have lower scores
            age_penalty = v["age"] * random.randint(1, 3)
            score = max(35, score - age_penalty)

            if score < 60:
                status = "danger"
            elif score < 75:
                status = "warning"
            else:
                status = "good"

            last_check = (datetime(2025, 3, 31) - timedelta(days=random.randint(5, 90))).strftime("%Y-%m-%d")
            next_check = (datetime(2025, 3, 31) + timedelta(days=random.randint(10, 60))).strftime("%Y-%m-%d")

            components[comp_key] = {
                "name": comp_name,
                "score": score,
                "status": status,
                "lastCheck": last_check,
                "nextCheck": next_check,
            }

        # Overall health from components
        avg_score = int(np.mean([c["score"] for c in components.values()]))

        maintenance_history = []
        for m in range(random.randint(2, 5)):
            m_date = (datetime(2025, 3, 31) - timedelta(days=random.randint(30, 365))).strftime("%Y-%m-%d")
            m_types = ["정기 점검", "엔진 오일 교환", "브레이크 패드 교체", "타이어 교체", "탱크 밸브 점검", "필터 교환"]
            maintenance_history.append({
                "date": m_date,
                "type": random.choice(m_types),
                "cost": random.randint(50, 500) * 1000,
                "notes": "정상 완료",
            })

        maintenance_history.sort(key=lambda x: x["date"], reverse=True)

        # Predicted failures
        predicted_failures = []
        weak_components = [k for k, v2 in components.items() if v2["score"] < 70]
        for wc in weak_components[:2]:
            comp_info = components[wc]
            predicted_failures.append({
                "component": comp_info["name"],
                "probability": round(random.uniform(0.15, 0.65), 2),
                "estimatedDate": (datetime(2025, 3, 31) + timedelta(days=random.randint(7, 45))).strftime("%Y-%m-%d"),
                "recommendedAction": f"{comp_info['name']} 사전 교체/점검 권장",
            })

        detailed.append({
            "vehicleId": v["id"],
            "plateNumber": v["plateNumber"],
            "model": v["model"],
            "year": v["year"],
            "age": v["age"],
            "mileage": v["mileage"],
            "overallScore": avg_score,
            "components": components,
            "maintenanceHistory": maintenance_history,
            "predictedFailures": predicted_failures,
        })

    # Simple scores for remaining vehicles
    simple = []
    for v in vehicles:
        if v["id"] not in [d["vehicleId"] for d in detailed]:
            simple.append({
                "vehicleId": v["id"],
                "plateNumber": v["plateNumber"],
                "overallScore": v["healthScore"],
                "status": "danger" if v["healthScore"] < 60 else ("warning" if v["healthScore"] < 75 else "good"),
            })

    vehicle_health = {
        "detailed": detailed,
        "summary": simple,
    }

    with open(os.path.join(DATA_OUT, "vehicle_health.json"), "w", encoding="utf-8") as f:
        json.dump(vehicle_health, f, ensure_ascii=False, indent=2)
    print(f"  -> {len(detailed)} detailed + {len(simple)} summary vehicle health records written")
    return vehicle_health


# ============================================================
# 9. DRIVERS.JSON
# ============================================================
def generate_drivers(vehicles, deliveries):
    print("Generating drivers.json ...")

    # Get bulk drivers from vehicles
    bulk_drivers_set = set()
    driver_vehicles = {}
    for v in vehicles:
        if v["type"] in ("bulk", "lpg") and v["driver"] not in ("미배정", "nan"):
            bulk_drivers_set.add(v["driver"])
            if v["driver"] not in driver_vehicles:
                driver_vehicles[v["driver"]] = []
            driver_vehicles[v["driver"]].append(v["plateNumber"])

    # Count deliveries per driver
    driver_delivery_count = {}
    driver_total_distance = {}
    for d in deliveries:
        drv = d["driver"]
        if drv in bulk_drivers_set:
            driver_delivery_count[drv] = driver_delivery_count.get(drv, 0) + 1
            driver_total_distance[drv] = driver_total_distance.get(drv, 0) + d["distance"]

    drivers = []
    for i, driver_name in enumerate(sorted(bulk_drivers_set)[:15]):
        did = f"D{i + 1:03d}"
        delivery_count = driver_delivery_count.get(driver_name, random.randint(30, 80))
        total_distance = round(driver_total_distance.get(driver_name, random.uniform(1000, 4000)), 1)
        avg_distance = round(total_distance / max(delivery_count, 1), 1)

        # Safety score (higher is better)
        safety_score = random.randint(65, 98)
        # Eco driving score
        eco_score = random.randint(60, 95)
        # Punctuality
        punctuality = round(random.uniform(85, 99.5), 1)

        # Violations
        violations = random.randint(0, 5)
        if safety_score > 90:
            violations = min(violations, 1)

        # Experience years
        experience = random.randint(3, 25)

        license_type = "1종 대형 + 위험물"

        assigned_vehicles = driver_vehicles.get(driver_name, [])

        drivers.append({
            "id": did,
            "name": driver_name,
            "licenseType": license_type,
            "experienceYears": experience,
            "assignedVehicles": assigned_vehicles,
            "safetyScore": safety_score,
            "ecoScore": eco_score,
            "punctuality": punctuality,
            "monthlyDeliveries": delivery_count,
            "monthlyDistance": total_distance,
            "avgDistance": avg_distance,
            "violations": violations,
            "rating": "A" if safety_score >= 90 else ("B" if safety_score >= 75 else "C"),
        })

    with open(os.path.join(DATA_OUT, "drivers.json"), "w", encoding="utf-8") as f:
        json.dump(drivers, f, ensure_ascii=False, indent=2)
    print(f"  -> {len(drivers)} drivers written")
    return drivers


# ============================================================
# MAIN
# ============================================================
def main():
    print("=" * 60)
    print("  덕양가스 AI 물류 플랫폼 - 데모 데이터 생성")
    print("=" * 60)
    print(f"  Data source: {DATA_SRC}")
    print(f"  Output dir:  {DATA_OUT}")
    print()

    # 1. Customers
    customers = generate_customers()

    # 2. Vehicles
    vehicles = generate_vehicles()

    # 3. Deliveries
    deliveries = generate_deliveries()

    # 4. Forecast
    generate_forecast(customers)

    # 5. Routes
    generate_routes(vehicles, customers)

    # 6. Kakao samples
    generate_kakao_samples()

    # 7. Safety events
    generate_safety_events(vehicles)

    # 8. Vehicle health
    generate_vehicle_health(vehicles)

    # 9. Drivers
    generate_drivers(vehicles, deliveries)

    print()
    print("=" * 60)
    print("  All JSON files generated successfully!")
    print("=" * 60)

    # Verify all files
    print()
    expected_files = [
        "customers.json", "vehicles.json", "deliveries.json",
        "forecast.json", "routes.json", "kakao_samples.json",
        "safety_events.json", "vehicle_health.json", "drivers.json",
    ]
    for fname in expected_files:
        fpath = os.path.join(DATA_OUT, fname)
        if os.path.exists(fpath):
            size = os.path.getsize(fpath)
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                count = len(data)
            elif isinstance(data, dict):
                count = len(data)
            else:
                count = 1
            print(f"  OK  {fname:30s} {size:>8,} bytes  ({count} items)")
        else:
            print(f"  MISSING  {fname}")


if __name__ == "__main__":
    main()
