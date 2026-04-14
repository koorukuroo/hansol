import { vehicles } from "@/lib/data";

// ── Seeded PRNG ──
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Interfaces ──
export interface TelematicsEvent {
  time: string;
  type: "brake" | "accel" | "speed" | "idle" | "dtc" | "door" | "geofence";
  description: string;
  severity: "info" | "warning" | "danger";
}

export interface DtcCode {
  code: string;
  description: string;
  severity: "info" | "warning" | "danger";
}

export interface TelematicsData {
  vehicleId: string;

  // 1. Vehicle Health
  engineRpm: number;
  coolantTemp: number;
  oilPressure: number;
  batteryVoltage: number;
  fuelLevel: number;
  tirePressure: { fl: number; fr: number; rl: number; rr: number };
  dtcCodes: DtcCode[];

  // 2. Driving Behavior
  currentSpeed: number;
  avgSpeed: number;
  todayDistance: number;
  idleTimeMin: number;
  hardBrakeCount: number;
  hardAccelCount: number;
  overSpeedCount: number;
  drivingScore: number;

  // 3. Fuel & Energy
  fuelConsumptionLph: number;
  fuelEfficiency: number;
  todayFuelUsed: number;
  co2Emission: number;

  // 4. Cargo & Load
  loadWeight: number;
  maxLoad: number;
  tankPressure: number;
  tankTemp: number;

  // 5. Recent Events
  events: TelematicsEvent[];

  // 6. Speed history (last 60 minutes)
  speedHistory: { time: string; speed: number }[];

  // 7. Fuel history (last 24 hours)
  fuelHistory: { time: string; level: number }[];
}

// ── DTC Code pools ──
const dtcPool: DtcCode[] = [
  { code: "P0401", description: "EGR 유량 부족 감지", severity: "warning" },
  { code: "P0217", description: "냉각수 과열 경고", severity: "danger" },
  { code: "P0562", description: "시스템 전압 저하", severity: "warning" },
  { code: "P0171", description: "연료 혼합비 희박", severity: "warning" },
  { code: "P0420", description: "촉매 효율 저하", severity: "info" },
  { code: "P0128", description: "냉각수 온도 조절 불량", severity: "warning" },
  { code: "P0300", description: "엔진 불규칙 점화 감지", severity: "danger" },
  { code: "P0113", description: "흡기온도 센서 높음", severity: "info" },
];

// ── Event description templates ──
const eventTemplates: { type: TelematicsEvent["type"]; description: string; severity: TelematicsEvent["severity"] }[] = [
  { type: "brake", description: "급제동 감지 (감속 -3.2m/s2)", severity: "warning" },
  { type: "brake", description: "급제동 발생 (감속 -4.1m/s2)", severity: "danger" },
  { type: "accel", description: "급가속 감지 (가속 2.8m/s2)", severity: "warning" },
  { type: "speed", description: "제한속도 초과 (62km/h > 60km/h)", severity: "warning" },
  { type: "speed", description: "과속 감지 (75km/h > 60km/h)", severity: "danger" },
  { type: "idle", description: "공회전 10분 초과", severity: "info" },
  { type: "idle", description: "공회전 20분 지속 중", severity: "warning" },
  { type: "dtc", description: "DTC 코드 발생 - EGR 유량 이상", severity: "warning" },
  { type: "door", description: "적재함 도어 열림 감지", severity: "info" },
  { type: "door", description: "운전석 도어 열림 (운행 중)", severity: "warning" },
  { type: "geofence", description: "지오펜스 이탈 감지", severity: "warning" },
  { type: "geofence", description: "배송 구역 진입 확인", severity: "info" },
];

// ── Product-specific tank parameters ──
function getTankParams(product: string, rng: () => number): { pressure: number; temp: number } {
  switch (product) {
    case "N2":
      return { pressure: 1.5 + rng() * 3.0, temp: -196 + rng() * 10 };
    case "O2":
      return { pressure: 2.0 + rng() * 4.0, temp: -183 + rng() * 10 };
    case "AR":
      return { pressure: 2.0 + rng() * 3.5, temp: -186 + rng() * 10 };
    case "CO2":
      return { pressure: 15.0 + rng() * 3.0, temp: -20 + rng() * 15 };
    case "LPG":
      return { pressure: 5.0 + rng() * 8.0, temp: 5 + rng() * 20 };
    default:
      return { pressure: 2.0 + rng() * 5.0, temp: -100 + rng() * 50 };
  }
}

// ── Generate telematics data for a single vehicle ──
function generateForVehicle(vehicleId: string): TelematicsData {
  const v = vehicles.find((veh) => veh.id === vehicleId);
  if (!v) {
    throw new Error(`Vehicle ${vehicleId} not found`);
  }

  const seed = parseInt(v.id.replace("V", ""), 10) * 7919;
  const rng = seededRng(seed);

  const isRunning = v.status === "running";
  const isIdle = v.status === "idle";
  const isWarning = v.status === "warning";

  // 1. Vehicle Health
  const engineRpm = isRunning
    ? Math.round(1000 + rng() * 1200)
    : isIdle
      ? Math.round(800 + rng() * 100)
      : Math.round(800 + rng() * 600);

  const coolantTemp = isWarning
    ? Math.round((90 + rng() * 15) * 10) / 10
    : Math.round((78 + rng() * 12) * 10) / 10;

  const oilPressure = isWarning
    ? Math.round((2.0 + rng() * 1.5) * 10) / 10
    : Math.round((3.0 + rng() * 2.0) * 10) / 10;

  const batteryVoltage = isWarning
    ? Math.round((11.5 + rng() * 1.2) * 10) / 10
    : Math.round((12.5 + rng() * 1.7) * 10) / 10;

  const fuelLevel = Math.round(10 + rng() * 85);

  const baseTire = 7.0 + rng() * 1.0;
  const tirePressure = {
    fl: Math.round((baseTire + (rng() - 0.5) * 1.0) * 10) / 10,
    fr: Math.round((baseTire + (rng() - 0.5) * 1.0) * 10) / 10,
    rl: Math.round((baseTire + (rng() - 0.5) * 1.2) * 10) / 10,
    rr: Math.round((baseTire + (rng() - 0.5) * 1.2) * 10) / 10,
  };

  // Warning vehicles get low tire(s)
  if (isWarning && rng() > 0.5) {
    tirePressure.rl = Math.round((6.0 + rng() * 0.4) * 10) / 10;
  }

  // DTC codes
  const dtcCodes: DtcCode[] = [];
  if (isWarning) {
    const count = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < count; i++) {
      dtcCodes.push(dtcPool[Math.floor(rng() * dtcPool.length)]);
    }
  } else if (rng() > 0.8) {
    dtcCodes.push(dtcPool[Math.floor(rng() * dtcPool.length)]);
  }

  // 2. Driving Behavior
  const currentSpeed = isRunning
    ? Math.round(25 + rng() * 55)
    : 0;

  const avgSpeed = isRunning
    ? Math.round(35 + rng() * 20)
    : isIdle
      ? 0
      : Math.round(30 + rng() * 15);

  const todayDistance = isRunning
    ? Math.round(40 + rng() * 140)
    : isIdle
      ? 0
      : Math.round(20 + rng() * 60);

  const idleTimeMin = isIdle
    ? Math.round(15 + rng() * 30)
    : Math.round(rng() * 25);

  const hardBrakeCount = isWarning
    ? Math.round(2 + rng() * 3)
    : Math.round(rng() * 2);

  const hardAccelCount = isWarning
    ? Math.round(1 + rng() * 2)
    : Math.round(rng() * 1.5);

  const overSpeedCount = isWarning
    ? Math.round(rng() * 2)
    : Math.round(rng() * 0.8);

  const drivingScore = isWarning
    ? Math.round(60 + rng() * 15)
    : isRunning
      ? Math.round(78 + rng() * 22)
      : Math.round(82 + rng() * 18);

  // 3. Fuel & Energy
  const fuelConsumptionLph = isRunning
    ? Math.round((18 + rng() * 17) * 10) / 10
    : Math.round((15 + rng() * 5) * 10) / 10;

  const fuelEfficiency = Math.round((2.5 + rng() * 2.0) * 10) / 10;

  const todayFuelUsed = isRunning
    ? Math.round(30 + rng() * 50)
    : isIdle
      ? Math.round(5 + rng() * 15)
      : Math.round(20 + rng() * 40);

  const co2Emission = Math.round(50 + rng() * 150);

  // 4. Cargo & Load
  const maxLoad = 20000;
  const loadWeight = isIdle
    ? 0
    : Math.round(5000 + rng() * 15000);

  const tankParams = getTankParams(v.product, rng);
  const tankPressure = Math.round(tankParams.pressure * 10) / 10;
  const tankTemp = Math.round(tankParams.temp * 10) / 10;

  // 5. Events (last 10)
  const events: TelematicsEvent[] = [];
  const eventCount = isWarning ? 8 + Math.floor(rng() * 3) : 4 + Math.floor(rng() * 5);
  for (let i = 0; i < Math.min(eventCount, 10); i++) {
    const tmpl = eventTemplates[Math.floor(rng() * eventTemplates.length)];
    const hour = 14 - Math.floor(i * 0.8);
    const min = Math.floor(rng() * 60);
    events.push({
      time: `${String(Math.max(6, hour)).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
      type: tmpl.type,
      description: tmpl.description,
      severity: tmpl.severity,
    });
  }

  // 6. Speed history (last 60 minutes, 1 per minute)
  const speedHistory: { time: string; speed: number }[] = [];
  let baseSpeed = isRunning ? 40 + rng() * 20 : 0;
  for (let i = 0; i < 60; i++) {
    const hour = 13 + Math.floor(i / 60);
    const minute = i % 60;
    if (isRunning) {
      baseSpeed = Math.max(0, Math.min(80, baseSpeed + (rng() - 0.48) * 12));
    } else if (isIdle) {
      baseSpeed = 0;
    } else {
      // warning: some movement with stops
      baseSpeed = rng() > 0.3
        ? Math.max(0, Math.min(60, baseSpeed + (rng() - 0.5) * 15))
        : 0;
    }
    speedHistory.push({
      time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      speed: Math.round(baseSpeed),
    });
  }

  // 7. Fuel history (last 24 hours, 1 per hour)
  const fuelHistory: { time: string; level: number }[] = [];
  let fuelLv = Math.min(95, fuelLevel + 30 + rng() * 20);
  for (let i = 0; i < 24; i++) {
    const hour = (15 + i) % 24; // starts from 15:00 yesterday
    const drop = isRunning
      ? 1.0 + rng() * 2.5
      : isIdle
        ? 0.1 + rng() * 0.3
        : 0.5 + rng() * 1.5;
    fuelLv = Math.max(fuelLevel - 2, fuelLv - drop);
    fuelHistory.push({
      time: `${String(hour).padStart(2, "0")}:00`,
      level: Math.round(fuelLv),
    });
  }

  return {
    vehicleId,
    engineRpm,
    coolantTemp,
    oilPressure,
    batteryVoltage,
    fuelLevel,
    tirePressure,
    dtcCodes,
    currentSpeed,
    avgSpeed,
    todayDistance,
    idleTimeMin,
    hardBrakeCount,
    hardAccelCount,
    overSpeedCount,
    drivingScore,
    fuelConsumptionLph,
    fuelEfficiency,
    todayFuelUsed,
    co2Emission,
    loadWeight,
    maxLoad,
    tankPressure,
    tankTemp,
    events,
    speedHistory,
    fuelHistory,
  };
}

// ── Generate all data ──
export const allTelematicsData: Record<string, TelematicsData> = {};
for (const v of vehicles) {
  allTelematicsData[v.id] = generateForVehicle(v.id);
}

export function getTelematicsData(vehicleId: string): TelematicsData {
  const data = allTelematicsData[vehicleId];
  if (!data) throw new Error(`No telematics data for ${vehicleId}`);
  return data;
}
