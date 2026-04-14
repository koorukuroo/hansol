// ── Customers ──
export interface Customer {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lng: number;
  product: string;
  productName: string;
  tankCapacity: number;
  currentLevel: number;
  dailyConsumption: number;
  depletionDays: number;
  riskLevel: "danger" | "warning" | "safe";
  monthlyDeliveries: number;
}

export const customers: Customer[] = [
  { id:"C001", name:"현대미포조선", shortName:"현대미포", lat:35.5012, lng:129.3857, product:"N2", productName:"액화질소", tankCapacity:5000, currentLevel:18, dailyConsumption:420, depletionDays:2.1, riskLevel:"danger", monthlyDeliveries:22 },
  { id:"C002", name:"에쓰오일", shortName:"에쓰오일", lat:35.4926, lng:129.3621, product:"N2", productName:"액화질소", tankCapacity:8000, currentLevel:12, dailyConsumption:580, depletionDays:1.7, riskLevel:"danger", monthlyDeliveries:28 },
  { id:"C003", name:"포스코", shortName:"포스코", lat:35.4856, lng:129.3234, product:"AR", productName:"액화알곤", tankCapacity:6000, currentLevel:35, dailyConsumption:320, depletionDays:6.6, riskLevel:"warning", monthlyDeliveries:18 },
  { id:"C004", name:"삼성SDI", shortName:"삼성SDI", lat:35.5234, lng:129.3156, product:"N2", productName:"액화질소", tankCapacity:4000, currentLevel:8, dailyConsumption:350, depletionDays:0.9, riskLevel:"danger", monthlyDeliveries:15 },
  { id:"C005", name:"한국가스텍", shortName:"가스텍", lat:35.5567, lng:129.3534, product:"CO2", productName:"액화탄산", tankCapacity:3000, currentLevel:45, dailyConsumption:180, depletionDays:7.5, riskLevel:"safe", monthlyDeliveries:12 },
  { id:"C006", name:"SK에너지", shortName:"SK에너지", lat:35.4789, lng:129.3912, product:"O2", productName:"액화산소", tankCapacity:7000, currentLevel:28, dailyConsumption:450, depletionDays:4.4, riskLevel:"warning", monthlyDeliveries:20 },
  { id:"C007", name:"현대자동차 울산", shortName:"현대차", lat:35.5345, lng:129.3678, product:"N2", productName:"액화질소", tankCapacity:10000, currentLevel:55, dailyConsumption:600, depletionDays:9.2, riskLevel:"safe", monthlyDeliveries:25 },
  { id:"C008", name:"좋은삼정병원", shortName:"삼정병원", lat:35.5467, lng:129.3312, product:"O2-M", productName:"의료용산소", tankCapacity:1500, currentLevel:62, dailyConsumption:80, depletionDays:11.6, riskLevel:"safe", monthlyDeliveries:8 },
  { id:"C009", name:"울산대학교병원", shortName:"울산대병원", lat:35.5523, lng:129.3589, product:"O2-M", productName:"의료용산소", tankCapacity:2000, currentLevel:22, dailyConsumption:120, depletionDays:3.7, riskLevel:"warning", monthlyDeliveries:10 },
  { id:"C010", name:"삼정에너지", shortName:"삼정에너지", lat:35.5156, lng:129.3423, product:"LPG", productName:"LPG", tankCapacity:5000, currentLevel:72, dailyConsumption:280, depletionDays:12.9, riskLevel:"safe", monthlyDeliveries:14 },
  { id:"C011", name:"한화솔루션 울산", shortName:"한화솔루션", lat:35.4912, lng:129.3745, product:"N2", productName:"액화질소", tankCapacity:6000, currentLevel:40, dailyConsumption:380, depletionDays:6.3, riskLevel:"warning", monthlyDeliveries:16 },
  { id:"C012", name:"동국제강", shortName:"동국제강", lat:35.5078, lng:129.3567, product:"O2", productName:"액화산소", tankCapacity:4500, currentLevel:85, dailyConsumption:250, depletionDays:15.3, riskLevel:"safe", monthlyDeliveries:11 },
  { id:"C013", name:"KCC 울산", shortName:"KCC", lat:35.4834, lng:129.3289, product:"CO2", productName:"액화탄산", tankCapacity:2500, currentLevel:52, dailyConsumption:150, depletionDays:8.7, riskLevel:"safe", monthlyDeliveries:9 },
  { id:"C014", name:"현대중공업", shortName:"현대중공업", lat:35.5189, lng:129.3923, product:"AR", productName:"액화알곤", tankCapacity:5500, currentLevel:15, dailyConsumption:400, depletionDays:2.1, riskLevel:"danger", monthlyDeliveries:19 },
  { id:"C015", name:"코오롱인더스트리", shortName:"코오롱", lat:35.5401, lng:129.3178, product:"N2", productName:"액화질소", tankCapacity:3500, currentLevel:68, dailyConsumption:200, depletionDays:11.9, riskLevel:"safe", monthlyDeliveries:10 },
];

// ── Vehicles ──
export interface Vehicle {
  id: string;
  plateNumber: string;
  type: string;
  typeName: string;
  product: string;
  productName: string;
  model: string;
  year: number;
  age: number;
  mileage: number;
  location: string;
  driver: string;
  status: "running" | "idle" | "warning";
  healthScore: number;
  lat: number;
  lng: number;
}

export const vehicles: Vehicle[] = [
  { id:"V001", plateNumber:"84노1302", type:"bulk", typeName:"벌크(탱크로리)", product:"CO2", productName:"액화탄산", model:"트라고엑시언트", year:2014, age:12, mileage:287432, location:"달천", driver:"허원준", status:"running", healthScore:72, lat:35.5234, lng:129.3456 },
  { id:"V002", plateNumber:"88소1619", type:"bulk", typeName:"벌크(탱크로리)", product:"LPG", productName:"LPG", model:"트라고", year:2016, age:10, mileage:245120, location:"신정동", driver:"김기권", status:"running", healthScore:85, lat:35.5412, lng:129.3312 },
  { id:"V003", plateNumber:"89보4327", type:"bulk", typeName:"벌크(탱크로리)", product:"O2", productName:"액화산소", model:"트라고", year:2014, age:12, mileage:312456, location:"양정동", driver:"박태화", status:"warning", healthScore:52, lat:35.5145, lng:129.3289 },
  { id:"V004", plateNumber:"91가2345", type:"bulk", typeName:"벌크(탱크로리)", product:"N2", productName:"액화질소", model:"트라고엑시언트", year:2018, age:8, mileage:189234, location:"삼산동", driver:"이철수", status:"running", healthScore:91, lat:35.5389, lng:129.3567 },
  { id:"V005", plateNumber:"85누3456", type:"bulk", typeName:"벌크(탱크로리)", product:"AR", productName:"액화알곤", model:"뉴파워트럭", year:2020, age:6, mileage:132567, location:"범서", driver:"최동현", status:"running", healthScore:95, lat:35.5567, lng:129.3134 },
  { id:"V006", plateNumber:"87다5678", type:"bulk", typeName:"벌크(탱크로리)", product:"N2", productName:"액화질소", model:"트라고", year:2015, age:11, mileage:298765, location:"남목", driver:"장영호", status:"running", healthScore:67, lat:35.4923, lng:129.3834 },
  { id:"V007", plateNumber:"90라6789", type:"bulk", typeName:"벌크(탱크로리)", product:"O2", productName:"액화산소", model:"트라고엑시언트", year:2019, age:7, mileage:165432, location:"방어진", driver:"정민수", status:"idle", healthScore:88, lat:35.4856, lng:129.4123 },
  { id:"V008", plateNumber:"82마7890", type:"bulk", typeName:"벌크(탱크로리)", product:"CO2", productName:"액화탄산", model:"뉴파워트럭", year:2021, age:5, mileage:98765, location:"온산", driver:"한재영", status:"running", healthScore:96, lat:35.4234, lng:129.3234 },
  { id:"V009", plateNumber:"86바8901", type:"bulk", typeName:"벌크(탱크로리)", product:"LPG", productName:"LPG", model:"트라고", year:2013, age:13, mileage:345678, location:"언양", driver:"윤성민", status:"warning", healthScore:48, lat:35.5678, lng:129.2867 },
  { id:"V010", plateNumber:"93사9012", type:"bulk", typeName:"벌크(탱크로리)", product:"N2", productName:"액화질소", model:"트라고엑시언트", year:2022, age:4, mileage:76543, location:"무거동", driver:"송준호", status:"running", healthScore:98, lat:35.5456, lng:129.3456 },
];

// ── Alerts ──
export interface Alert {
  time: string;
  type: "danger" | "warning" | "safe" | "info";
  message: string;
}

export const alerts: Alert[] = [
  { time: "14:23", type: "danger", message: "삼성SDI 탱크 잔량 8% — 고갈 임박" },
  { time: "14:18", type: "danger", message: "에쓰오일 N2 탱크 잔량 12% — 긴급 보충 필요" },
  { time: "14:15", type: "warning", message: "89보4327 차량 브레이크 패드 교체 임박" },
  { time: "14:10", type: "danger", message: "현대미포조선 N2 고갈 2.1일 — 자동주문 생성됨" },
  { time: "13:58", type: "warning", message: "포스코 AR 탱크 잔량 35% — 주의 모니터링" },
  { time: "13:45", type: "info", message: "AI 배차 최적화 완료 — 28% 거리 절감" },
  { time: "13:30", type: "safe", message: "현대자동차 N2 보충 완료 (4,200kg)" },
  { time: "13:15", type: "warning", message: "86바8901 엔진오일 잔여수명 34일" },
  { time: "12:50", type: "safe", message: "카톡 발주 3건 자동 파싱 완료" },
  { time: "12:30", type: "info", message: "오전 배송 38건 완료, 오후 36건 예정" },
];

// ── Daily delivery stats (30 days) ──
export const dailyDeliveries = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 2, 15 + i); // March 15 ~ April 13
  return {
    date: `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`,
    N2: Math.round(2800 + Math.random() * 1200),
    O2: Math.round(1600 + Math.random() * 800),
    CO2: Math.round(1200 + Math.random() * 600),
    AR: Math.round(800 + Math.random() * 400),
    LPG: Math.round(600 + Math.random() * 300),
  };
});

// ── Forecast ──
export interface ForecastPoint {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
  noRefill: number;          // 보충 안 했을 때 예측
  refillEvent?: {            // 보충 이벤트 (이 날 보충 발생)
    quantity: number;        // 보충량 (kg)
    preLevel: number;        // 보충 전 잔량 (%)
  };
}

export interface HistoryPoint {
  date: string;
  level: number;
  refill?: {                 // 이 날 보충이 있었으면
    driver: string;          // 배송기사
    vehicle: string;         // 차량번호
    quantity: number;        // 보충량 (kg)
    preLevel: number;        // 보충 전 잔량 (%)
    time: string;            // 도착 시각
  };
}

export interface ForecastData {
  product: string;
  currentLevel: number;
  history: HistoryPoint[];
  forecast: ForecastPoint[];
  depletionDate: string;
  recommendedRefill: number;
  mape: number;
  topFactors: string[];
}

// Seeded PRNG for reproducibility
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generate 30 days of realistic tank history ending at `endLevel`.
 *
 * 물리적 규칙:
 * - 탱크 잔량은 매일 소비로 "하락"만 함
 * - 보충 시 "급등" (15% → 88% 같은 점프)
 * - 점진적 상승은 절대 발생하지 않음
 *
 * 역방향 생성: day30=endLevel에서 시작, 거꾸로 올라가며 계산.
 * 거꾸로 가면서 매일 dailyRate를 더함(= 어제는 오늘보다 높았음).
 * 95%를 넘으면 "이 날 보충이 있었다" = 보충 전 낮은 값으로 리셋.
 */
// 배송기사 풀 (보충 이벤트 배정용)
const refillDrivers = [
  { driver: "허원준", vehicle: "84노1302" },
  { driver: "김기권", vehicle: "88소1619" },
  { driver: "이철수", vehicle: "91가2345" },
  { driver: "장영호", vehicle: "87다5678" },
  { driver: "최동현", vehicle: "85누3456" },
  { driver: "한재영", vehicle: "82마7890" },
  { driver: "정민수", vehicle: "90라6789" },
  { driver: "송준호", vehicle: "93사9012" },
];
const refillTimes = ["06:30", "07:15", "08:00", "08:45", "09:20", "10:10", "11:00", "13:30", "14:15"];

function genForecast(endLevel: number, consumption: number, capacity: number): ForecastData["history"] {
  const dailyRate = (consumption / capacity) * 100;
  const rng = seededRng(Math.round(endLevel * 100 + consumption));

  // Step 1: 역방향으로 30일 레벨 계산 + 보충 발생 일자 기록
  const raw: number[] = new Array(30);
  const refillDays = new Set<number>(); // 보충이 발생한 day index
  const preLevels: Record<number, number> = {};  // 보충 전 잔량

  let lv = endLevel;
  for (let i = 29; i >= 0; i--) {
    raw[i] = lv;
    const noise = 0.85 + rng() * 0.3;
    const dow = new Date(2026, 2, 15 + i).getDay();
    const weekendFactor = (dow === 0 || dow === 6) ? 0.7 : 1.0;
    lv += dailyRate * noise * weekendFactor;

    if (lv > 95) {
      // 역방향에서 95% 초과 = 포워드에서 보면 이 날 보충이 있었음
      // 보충 후 레벨 = raw[i], 보충 전 레벨 = lv가 리셋될 값
      const preLevel = 10 + rng() * 12;
      preLevels[i] = preLevel;
      refillDays.add(i);
      lv = preLevel;
    }
  }

  // Step 2: 포워드로 변환, 보충일에 상세정보 부착
  const hist: HistoryPoint[] = [];
  let driverIdx = Math.floor(rng() * refillDrivers.length);

  for (let i = 0; i < 30; i++) {
    const d = new Date(2026, 2, 15 + i);
    const level = Math.max(3, Math.min(98, Math.round(raw[i])));
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

    const point: HistoryPoint = { date: dateStr, level };

    if (refillDays.has(i)) {
      const preLevel = Math.round(preLevels[i]);
      const quantity = Math.round(((level - preLevel) / 100) * capacity);
      const drv = refillDrivers[driverIdx % refillDrivers.length];
      const time = refillTimes[driverIdx % refillTimes.length];
      driverIdx++;

      point.refill = {
        driver: drv.driver,
        vehicle: drv.vehicle,
        quantity,
        preLevel,
        time,
      };
    }

    hist.push(point);
  }

  return hist;
}

/**
 * Generate 14-day forecast with two scenarios:
 * - `predicted`: VMI 보충 적용 시 예측
 * - `noRefill`: 보충 없이 방치 시 예측
 * - `refillEvent`: 보충 발생 시점 표시
 */
function genForecastPred(startLevel: number, consumption: number, capacity: number): ForecastData["forecast"] {
  const dailyRate = (consumption / capacity) * 100;
  const rng = seededRng(Math.round(startLevel * 77 + consumption));
  const pred: ForecastData["forecast"] = [];

  let levelWithRefill = startLevel;
  let levelNoRefill = startLevel;

  for (let i = 0; i < 14; i++) {
    const d = new Date(2026, 3, 14 + i);
    const noise = 0.8 + rng() * 0.4;
    const dow = d.getDay();
    const weekendFactor = (dow === 0 || dow === 6) ? 0.7 : 1.0;
    const drop = dailyRate * noise * weekendFactor;

    // 보충 없는 시나리오: 계속 하락
    levelNoRefill = Math.max(0, levelNoRefill - drop);

    // 보충 있는 시나리오: 임계점 이하에서 VMI 보충
    levelWithRefill = Math.max(0, levelWithRefill - drop);

    let refillEvent: ForecastPoint["refillEvent"] = undefined;
    if (levelWithRefill < 15) {
      const preLevel = Math.round(levelWithRefill);
      const refillPct = 78 + rng() * 12; // 78~90%로 보충
      const refillQty = Math.round(((refillPct - levelWithRefill) / 100) * capacity);
      levelWithRefill = refillPct;
      refillEvent = { quantity: refillQty, preLevel };
    }

    const predicted = Math.round(levelWithRefill);
    const noRefill = Math.round(levelNoRefill);

    // 신뢰구간: 시간이 갈수록 넓어짐
    const baseMargin = 2 + dailyRate * 0.25;
    const margin = Math.round((baseMargin + i * 0.6) * 10) / 10;

    pred.push({
      date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`,
      predicted,
      lower: Math.max(0, Math.round(predicted - margin)),
      upper: Math.min(100, Math.round(predicted + margin)),
      noRefill,
      refillEvent,
    });
  }

  return pred;
}

export const forecasts: Record<string, ForecastData> = {
  "현대미포조선": { product:"N2", currentLevel:18, history: genForecast(18, 420, 5000), forecast: genForecastPred(18, 420, 5000), depletionDate:"2026-04-16", recommendedRefill:4000, mape:27.7, topFactors:["기온 하강 (+12%)","가동률 증가 (+8%)","요일 패턴 (화요일 피크)"] },
  "에쓰오일": { product:"N2", currentLevel:12, history: genForecast(12, 580, 8000), forecast: genForecastPred(12, 580, 8000), depletionDate:"2026-04-15", recommendedRefill:6000, mape:22.3, topFactors:["정기보수 종료 (+15%)","공정 가동 재개","계절 수요 증가 (+5%)"] },
  "삼성SDI": { product:"N2", currentLevel:8, history: genForecast(8, 350, 4000), forecast: genForecastPred(8, 350, 4000), depletionDate:"2026-04-14", recommendedRefill:3500, mape:31.2, topFactors:["2차전지 라인 증설","야간 생산 확대 (+20%)","원자재 입고 증가"] },
  "포스코": { product:"AR", currentLevel:35, history: genForecast(35, 320, 6000), forecast: genForecastPred(35, 320, 6000), depletionDate:"2026-04-20", recommendedRefill:4500, mape:18.9, topFactors:["용접 작업 증가","계절 요인 (+7%)","재고 정책 변경"] },
  "SK에너지": { product:"O2", currentLevel:28, history: genForecast(28, 450, 7000), forecast: genForecastPred(28, 450, 7000), depletionDate:"2026-04-18", recommendedRefill:5000, mape:24.5, topFactors:["탈황 공정 강화","환경규제 대응","기온 상승 (+9%)"] },
  "현대중공업": { product:"AR", currentLevel:15, history: genForecast(15, 400, 5500), forecast: genForecastPred(15, 400, 5500), depletionDate:"2026-04-16", recommendedRefill:4800, mape:29.1, topFactors:["선박 건조 일정 변동","특수 용접 수요 급증","주말 작업 확대"] },
  "울산대학교병원": { product:"O2-M", currentLevel:22, history: genForecast(22, 120, 2000), forecast: genForecastPred(22, 120, 2000), depletionDate:"2026-04-17", recommendedRefill:1600, mape:15.8, topFactors:["봄철 호흡기 환자 증가","수술 일정 증가","ICU 가동률 상승"] },
  "한화솔루션 울산": { product:"N2", currentLevel:40, history: genForecast(40, 380, 6000), forecast: genForecastPred(40, 380, 6000), depletionDate:"2026-04-21", recommendedRefill:4200, mape:20.4, topFactors:["공정 전환 예정","원료 투입량 변동","야간 생산 축소 (-8%)"] },
  "한국가스텍": { product:"CO2", currentLevel:45, history: genForecast(45, 180, 3000), forecast: genForecastPred(45, 180, 3000), depletionDate:"2026-04-22", recommendedRefill:2200, mape:19.6, topFactors:["음료 성수기 진입","탄산음료 생산 확대","원가 절감 모드"] },
  "현대자동차 울산": { product:"N2", currentLevel:55, history: genForecast(55, 600, 10000), forecast: genForecastPred(55, 600, 10000), depletionDate:"2026-04-23", recommendedRefill:6000, mape:16.2, topFactors:["신차 출시 라인 가동","야간 생산 일정 확대","재고 보충 사이클"] },
  "좋은삼정병원": { product:"O2-M", currentLevel:62, history: genForecast(62, 80, 1500), forecast: genForecastPred(62, 80, 1500), depletionDate:"2026-04-25", recommendedRefill:1200, mape:14.3, topFactors:["봄철 환자 증가 (+10%)","수술실 가동 확대","야간 응급 수요 안정"] },
  "삼정에너지": { product:"LPG", currentLevel:72, history: genForecast(72, 280, 5000), forecast: genForecastPred(72, 280, 5000), depletionDate:"2026-04-27", recommendedRefill:3500, mape:17.5, topFactors:["가정용 수요 감소 (계절)","산업용 수요 유지","재고 회전율 안정"] },
  "동국제강": { product:"O2", currentLevel:85, history: genForecast(85, 250, 4500), forecast: genForecastPred(85, 250, 4500), depletionDate:"2026-04-29", recommendedRefill:3000, mape:12.8, topFactors:["철강 생산 안정","전기로 가동률 유지","계절 영향 미미"] },
  "KCC 울산": { product:"CO2", currentLevel:52, history: genForecast(52, 150, 2500), forecast: genForecastPred(52, 150, 2500), depletionDate:"2026-04-23", recommendedRefill:1800, mape:21.0, topFactors:["유리 생산 라인 증설","CO2 공정 투입 증가 (+14%)","재고 정책 변경"] },
  "코오롱인더스트리": { product:"N2", currentLevel:68, history: genForecast(68, 200, 3500), forecast: genForecastPred(68, 200, 3500), depletionDate:"2026-04-26", recommendedRefill:2500, mape:18.4, topFactors:["필름 생산 라인 안정","질소 치환 공정 유지","원료 입고 정상"] },
};

// ── Routes ──
export const routeData = {
  before: {
    totalDistance: 1240,
    totalTime: 580,
    emptyRunRate: 7.6,
    vehicles: [
      { id:"V001", driver:"허원준", stops:[{name:"본사",lat:35.5234,lng:129.3456},{name:"현대미포조선",lat:35.5012,lng:129.3857},{name:"삼정에너지",lat:35.5156,lng:129.3423},{name:"본사",lat:35.5234,lng:129.3456}], distance:67, deliveries:2 },
      { id:"V004", driver:"이철수", stops:[{name:"본사",lat:35.5234,lng:129.3456},{name:"에쓰오일",lat:35.4926,lng:129.3621},{name:"현대중공업",lat:35.5189,lng:129.3923},{name:"코오롱",lat:35.5401,lng:129.3178},{name:"본사",lat:35.5234,lng:129.3456}], distance:89, deliveries:3 },
      { id:"V006", driver:"장영호", stops:[{name:"본사",lat:35.5234,lng:129.3456},{name:"SK에너지",lat:35.4789,lng:129.3912},{name:"한화솔루션",lat:35.4912,lng:129.3745},{name:"본사",lat:35.5234,lng:129.3456}], distance:72, deliveries:2 },
      { id:"V002", driver:"김기권", stops:[{name:"본사",lat:35.5234,lng:129.3456},{name:"포스코",lat:35.4856,lng:129.3234},{name:"동국제강",lat:35.5078,lng:129.3567},{name:"한국가스텍",lat:35.5567,lng:129.3534},{name:"본사",lat:35.5234,lng:129.3456}], distance:95, deliveries:3 },
      { id:"V005", driver:"최동현", stops:[{name:"본사",lat:35.5234,lng:129.3456},{name:"삼성SDI",lat:35.5234,lng:129.3156},{name:"현대자동차",lat:35.5345,lng:129.3678},{name:"본사",lat:35.5234,lng:129.3456}], distance:54, deliveries:2 },
    ],
  },
  after: {
    totalDistance: 890,
    totalTime: 420,
    emptyRunRate: 3.2,
    vehicles: [
      { id:"V001", driver:"허원준", stops:[{name:"본사",lat:35.5234,lng:129.3456},{name:"삼정에너지",lat:35.5156,lng:129.3423},{name:"삼성SDI",lat:35.5234,lng:129.3156},{name:"본사",lat:35.5234,lng:129.3456}], distance:38, deliveries:2 },
      { id:"V004", driver:"이철수", stops:[{name:"본사",lat:35.5234,lng:129.3456},{name:"현대미포조선",lat:35.5012,lng:129.3857},{name:"현대중공업",lat:35.5189,lng:129.3923},{name:"본사",lat:35.5234,lng:129.3456}], distance:52, deliveries:2 },
      { id:"V006", driver:"장영호", stops:[{name:"본사",lat:35.5234,lng:129.3456},{name:"에쓰오일",lat:35.4926,lng:129.3621},{name:"SK에너지",lat:35.4789,lng:129.3912},{name:"한화솔루션",lat:35.4912,lng:129.3745},{name:"본사",lat:35.5234,lng:129.3456}], distance:65, deliveries:3 },
      { id:"V002", driver:"김기권", stops:[{name:"본사",lat:35.5234,lng:129.3456},{name:"포스코",lat:35.4856,lng:129.3234},{name:"동국제강",lat:35.5078,lng:129.3567},{name:"본사",lat:35.5234,lng:129.3456}], distance:48, deliveries:2 },
      { id:"V005", driver:"최동현", stops:[{name:"본사",lat:35.5234,lng:129.3456},{name:"현대자동차",lat:35.5345,lng:129.3678},{name:"코오롱",lat:35.5401,lng:129.3178},{name:"한국가스텍",lat:35.5567,lng:129.3534},{name:"본사",lat:35.5234,lng:129.3456}], distance:58, deliveries:3 },
    ],
  },
};

// ── Kakao Samples ──
export const kakaoSamples = [
  { id:1, sender:"김과장 (울산대병원)", message:"산소 발주 1.4톤 내일 오전까지", parsed:{ customer:"울산대학교병원", customerId:"C009", product:"O2", productName:"액화산소", quantity:1400, unit:"kg", requestTime:"내일 오전", urgency:"normal" as const, confidence:98 }},
  { id:2, sender:"박팀장 (현대미포)", message:"질소 3톤 급합니다 오늘중", parsed:{ customer:"현대미포조선", customerId:"C001", product:"N2", productName:"액화질소", quantity:3000, unit:"kg", requestTime:"오늘", urgency:"urgent" as const, confidence:95 }},
  { id:3, sender:"이대리 (포스코)", message:"알곤 2톤이랑 산소 1톤 이번주 금요일", parsed:{ customer:"포스코", customerId:"C003", product:"AR+O2", productName:"액화알곤 + 액화산소", quantity:3000, unit:"kg", requestTime:"이번주 금요일", urgency:"normal" as const, confidence:92 }},
  { id:4, sender:"최부장 (한국가스텍)", message:"탄산가스 5톤 보내주세요 수요일 오전", parsed:{ customer:"한국가스텍", customerId:"C005", product:"CO2", productName:"액화탄산", quantity:5000, unit:"kg", requestTime:"수요일 오전", urgency:"normal" as const, confidence:97 }},
  { id:5, sender:"정사원 (좋은삼정병원)", message:"의료용 산소 500kg 가능하면 내일", parsed:{ customer:"좋은삼정병원", customerId:"C008", product:"O2-M", productName:"의료용산소", quantity:500, unit:"kg", requestTime:"내일", urgency:"normal" as const, confidence:94 }},
];

// ── Safety Events ──
export const safetyEvents = [
  { time:"14:23:15", vehicle:"84노1302", driver:"허원준", type:"pedestrian", typeName:"보행자 감지", direction:"left", distance:3.2, level:"warning", levelName:"주의" },
  { time:"14:22:48", vehicle:"84노1302", driver:"허원준", type:"clear", typeName:"안전 복귀", direction:null, distance:null, level:"safe", levelName:"안전" },
  { time:"14:21:30", vehicle:"88소1619", driver:"김기권", type:"vehicle", typeName:"차량 감지", direction:"rear", distance:0.8, level:"emergency", levelName:"긴급" },
  { time:"14:20:05", vehicle:"88소1619", driver:"김기권", type:"vehicle", typeName:"차량 접근", direction:"rear", distance:2.1, level:"warning", levelName:"주의" },
  { time:"14:19:40", vehicle:"89보4327", driver:"박태화", type:"obstacle", typeName:"장애물 감지", direction:"front", distance:4.5, level:"warning", levelName:"주의" },
  { time:"14:18:12", vehicle:"84노1302", driver:"허원준", type:"pedestrian", typeName:"보행자 접근", direction:"right", distance:5.0, level:"safe", levelName:"안전" },
  { time:"14:17:30", vehicle:"91가2345", driver:"이철수", type:"clear", typeName:"안전 복귀", direction:null, distance:null, level:"safe", levelName:"안전" },
  { time:"14:16:45", vehicle:"91가2345", driver:"이철수", type:"vehicle", typeName:"차량 감지", direction:"left", distance:1.5, level:"danger", levelName:"위험" },
  { time:"14:15:20", vehicle:"85누3456", driver:"최동현", type:"pedestrian", typeName:"보행자 감지", direction:"front", distance:6.0, level:"safe", levelName:"안전" },
  { time:"14:14:55", vehicle:"87다5678", driver:"장영호", type:"obstacle", typeName:"적재물 감지", direction:"rear", distance:1.2, level:"danger", levelName:"위험" },
];

// ── Drivers ──
export const drivers = [
  { name:"허원준", vehicle:"84노1302", product:"CO2", deliveries:198, safetyScore:92, incidents:{suddenBrake:0,blindSpotWarning:2,speeding:0}, rank:1 },
  { name:"김기권", vehicle:"88소1619", product:"LPG", deliveries:176, safetyScore:87, incidents:{suddenBrake:1,blindSpotWarning:3,speeding:0}, rank:2 },
  { name:"이철수", vehicle:"91가2345", product:"N2", deliveries:189, safetyScore:90, incidents:{suddenBrake:0,blindSpotWarning:1,speeding:1}, rank:3 },
  { name:"최동현", vehicle:"85누3456", product:"AR", deliveries:167, safetyScore:94, incidents:{suddenBrake:0,blindSpotWarning:0,speeding:0}, rank:4 },
  { name:"장영호", vehicle:"87다5678", product:"N2", deliveries:156, safetyScore:78, incidents:{suddenBrake:2,blindSpotWarning:5,speeding:1}, rank:5 },
  { name:"한재영", vehicle:"82마7890", product:"CO2", deliveries:145, safetyScore:85, incidents:{suddenBrake:1,blindSpotWarning:2,speeding:0}, rank:6 },
  { name:"정민수", vehicle:"90라6789", product:"O2", deliveries:134, safetyScore:88, incidents:{suddenBrake:0,blindSpotWarning:3,speeding:0}, rank:7 },
  { name:"송준호", vehicle:"93사9012", product:"N2", deliveries:123, safetyScore:96, incidents:{suddenBrake:0,blindSpotWarning:0,speeding:0}, rank:8 },
  { name:"윤성민", vehicle:"86바8901", product:"LPG", deliveries:142, safetyScore:72, incidents:{suddenBrake:3,blindSpotWarning:6,speeding:2}, rank:9 },
  { name:"박태화", vehicle:"89보4327", product:"O2", deliveries:154, safetyScore:64, incidents:{suddenBrake:4,blindSpotWarning:8,speeding:2}, rank:10 },
];

// ── Vehicle Health ──
export const vehicleHealth: Record<string, {
  plateNumber: string; model: string; year: number; mileage: number; overallScore: number; status: string;
  components: { name: string; rul: number; health: number; status: string }[];
  nextMaintenance: { date: string; type: string; autoExcluded: boolean };
  alerts: { date: string; message: string; severity: string }[];
}> = {
  "89보4327": {
    plateNumber:"89보4327", model:"트라고", year:2014, mileage:312456, overallScore:52, status:"warning",
    components:[
      {name:"브레이크 패드",rul:23,health:35,status:"warning"},
      {name:"냉각수 시스템",rul:45,health:55,status:"normal"},
      {name:"배터리",rul:67,health:78,status:"normal"},
      {name:"탱크 밸브",rul:90,health:92,status:"good"},
      {name:"엔진 오일",rul:34,health:48,status:"warning"},
    ],
    nextMaintenance:{date:"2026-04-28",type:"브레이크 패드 교체",autoExcluded:true},
    alerts:[
      {date:"2026-04-12",message:"DTC P0401: EGR 유량 부족 감지",severity:"warning"},
      {date:"2026-04-10",message:"브레이크 패드 마모 임계치 접근",severity:"danger"},
    ],
  },
  "86바8901": {
    plateNumber:"86바8901", model:"트라고", year:2013, mileage:345678, overallScore:48, status:"warning",
    components:[
      {name:"브레이크 패드",rul:56,health:62,status:"normal"},
      {name:"냉각수 시스템",rul:18,health:28,status:"warning"},
      {name:"배터리",rul:12,health:22,status:"danger"},
      {name:"탱크 밸브",rul:78,health:85,status:"good"},
      {name:"엔진 오일",rul:28,health:42,status:"warning"},
    ],
    nextMaintenance:{date:"2026-04-22",type:"배터리 교체 + 냉각수 점검",autoExcluded:true},
    alerts:[
      {date:"2026-04-13",message:"배터리 전압 저하 감지 (11.2V)",severity:"danger"},
      {date:"2026-04-11",message:"냉각수 온도 이상 (102°C)",severity:"warning"},
    ],
  },
  "84노1302": {
    plateNumber:"84노1302", model:"트라고엑시언트", year:2014, mileage:287432, overallScore:72, status:"normal",
    components:[
      {name:"브레이크 패드",rul:45,health:58,status:"normal"},
      {name:"냉각수 시스템",rul:67,health:72,status:"normal"},
      {name:"배터리",rul:89,health:90,status:"good"},
      {name:"탱크 밸브",rul:95,health:96,status:"good"},
      {name:"엔진 오일",rul:38,health:52,status:"normal"},
    ],
    nextMaintenance:{date:"2026-05-10",type:"정기 점검",autoExcluded:false},
    alerts:[
      {date:"2026-04-08",message:"엔진 오일 교환 권장 시기 접근",severity:"warning"},
    ],
  },
  "88소1619": {
    plateNumber:"88소1619", model:"트라고", year:2016, mileage:245120, overallScore:85, status:"normal",
    components:[
      {name:"브레이크 패드",rul:120,health:88,status:"good"},
      {name:"냉각수 시스템",rul:95,health:82,status:"good"},
      {name:"배터리",rul:78,health:80,status:"good"},
      {name:"탱크 밸브",rul:150,health:95,status:"good"},
      {name:"엔진 오일",rul:65,health:78,status:"normal"},
    ],
    nextMaintenance:{date:"2026-06-15",type:"정기 점검",autoExcluded:false},
    alerts:[],
  },
  "91가2345": {
    plateNumber:"91가2345", model:"트라고엑시언트", year:2018, mileage:189234, overallScore:91, status:"normal",
    components:[
      {name:"브레이크 패드",rul:145,health:92,status:"good"},
      {name:"냉각수 시스템",rul:130,health:90,status:"good"},
      {name:"배터리",rul:110,health:88,status:"good"},
      {name:"탱크 밸브",rul:180,health:96,status:"good"},
      {name:"엔진 오일",rul:85,health:87,status:"good"},
    ],
    nextMaintenance:{date:"2026-07-01",type:"정기 점검",autoExcluded:false},
    alerts:[],
  },
  "85누3456": {
    plateNumber:"85누3456", model:"뉴파워트럭", year:2020, mileage:132567, overallScore:95, status:"normal",
    components:[
      {name:"브레이크 패드",rul:180,health:96,status:"good"},
      {name:"냉각수 시스템",rul:160,health:94,status:"good"},
      {name:"배터리",rul:140,health:92,status:"good"},
      {name:"탱크 밸브",rul:200,health:98,status:"good"},
      {name:"엔진 오일",rul:110,health:93,status:"good"},
    ],
    nextMaintenance:{date:"2026-07-20",type:"정기 점검",autoExcluded:false},
    alerts:[],
  },
  "87다5678": {
    plateNumber:"87다5678", model:"트라고", year:2015, mileage:298765, overallScore:67, status:"normal",
    components:[
      {name:"브레이크 패드",rul:55,health:65,status:"normal"},
      {name:"냉각수 시스템",rul:40,health:58,status:"normal"},
      {name:"배터리",rul:72,health:75,status:"normal"},
      {name:"탱크 밸브",rul:88,health:82,status:"good"},
      {name:"엔진 오일",rul:30,health:50,status:"normal"},
    ],
    nextMaintenance:{date:"2026-05-05",type:"엔진 오일 교체 + 냉각수 점검",autoExcluded:false},
    alerts:[
      {date:"2026-04-11",message:"엔진 오일 점도 저하 감지",severity:"warning"},
    ],
  },
  "90라6789": {
    plateNumber:"90라6789", model:"트라고엑시언트", year:2019, mileage:165432, overallScore:88, status:"normal",
    components:[
      {name:"브레이크 패드",rul:130,health:90,status:"good"},
      {name:"냉각수 시스템",rul:110,health:86,status:"good"},
      {name:"배터리",rul:95,health:84,status:"good"},
      {name:"탱크 밸브",rul:165,health:94,status:"good"},
      {name:"엔진 오일",rul:75,health:82,status:"good"},
    ],
    nextMaintenance:{date:"2026-06-20",type:"정기 점검",autoExcluded:false},
    alerts:[],
  },
  "82마7890": {
    plateNumber:"82마7890", model:"뉴파워트럭", year:2021, mileage:98765, overallScore:96, status:"normal",
    components:[
      {name:"브레이크 패드",rul:200,health:97,status:"good"},
      {name:"냉각수 시스템",rul:175,health:95,status:"good"},
      {name:"배터리",rul:160,health:94,status:"good"},
      {name:"탱크 밸브",rul:220,health:98,status:"good"},
      {name:"엔진 오일",rul:130,health:96,status:"good"},
    ],
    nextMaintenance:{date:"2026-08-01",type:"정기 점검",autoExcluded:false},
    alerts:[],
  },
  "93사9012": {
    plateNumber:"93사9012", model:"트라고엑시언트", year:2022, mileage:76543, overallScore:98, status:"normal",
    components:[
      {name:"브레이크 패드",rul:230,health:98,status:"good"},
      {name:"냉각수 시스템",rul:210,health:97,status:"good"},
      {name:"배터리",rul:190,health:96,status:"good"},
      {name:"탱크 밸브",rul:250,health:99,status:"good"},
      {name:"엔진 오일",rul:150,health:97,status:"good"},
    ],
    nextMaintenance:{date:"2026-08-15",type:"정기 점검",autoExcluded:false},
    alerts:[],
  },
};
