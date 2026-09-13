import Papa from 'papaparse';

export interface LotteryResult {
  date: string;
  result: string;
}

export function calculateLinearRegression(data: number[]) {
  const n = data.length;
  if (n === 0) return { m: 0, b: 0 };
  
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumXX += i * i;
  }
  
  const denominator = (n * sumXX - sumX * sumX);
  if (denominator === 0) return { m: 0, b: data[0] };

  const m = (n * sumXY - sumX * sumY) / denominator;
  const b = (sumY - m * sumX) / n;
  
  return { m, b };
}

export function getTrendLineAndPrediction(data: number[], digits: number) {
  const { m, b } = calculateLinearRegression(data);
  const trendLine = data.map((_, i) => m * i + b);
  const maxVal = digits === 3 ? 999 : 9999;
  const rawPrediction = Math.round(m * data.length + b);
  const prediction = Math.max(0, Math.min(maxVal, rawPrediction));
  return { trendLine, prediction };
}

export function padToN(num: string | number, n: number) {
  let str = String(num).replace(/[^0-9]/g, '');
  return str.padStart(n, '0').slice(-n);
}

export function padTo4(num: string | number) {
  return padToN(num, 4);
}

export function parseCsvFile(file: File, callback: (data: LotteryResult[], detectedDigits: number) => void) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results: Papa.ParseResult<any>) => {
      const parsed: LotteryResult[] = [];
      let maxLen = 3; // Default to 3, upgrade to 4 if any result has length 4

      for (const row of results.data) {
        const values = Object.values(row);
        const keys = Object.keys(row).map(k => k.toLowerCase());
        
        let date = '';
        let result = '';
        
        const dateIdx = keys.findIndex(k => k.includes('fecha') || k.includes('date'));
        const resultIdx = keys.findIndex(k => k.includes('numero') || k.includes('resultado') || k.includes('result'));
        
        if (dateIdx !== -1) date = String(values[dateIdx]);
        else if (values.length > 0) date = String(values[0]);
        
        if (resultIdx !== -1) result = String(values[resultIdx]);
        else if (values.length > 1) result = String(values[1]);
        
        if (date && result) {
           const cleanedResult = String(result).replace(/[^0-9]/g, '');
           if (cleanedResult.length > 0) {
              if (cleanedResult.length >= 4) {
                 maxLen = 4;
              }
              parsed.push({ date: date.trim(), result: cleanedResult });
           }
        }
      }
      callback(parsed, maxLen);
    }
  });
}

export const dayOfWeekMap: Record<string, number> = {
  'Domingo': 0,
  'Lunes': 1,
  'Martes': 2,
  'Miércoles': 3,
  'Jueves': 4,
  'Viernes': 5,
  'Sábado': 6
};

function mulberry32(a: number) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

export function generateMockPredictions(seedDate: string, digits: number) {
    const seed = seedDate.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rand = mulberry32(seed);
    const max = digits === 3 ? 1000 : 10000;
    
    return [
      { model: 'Deep Belief Network', prediction: padToN(Math.floor(rand() * max), digits), conf: (85 + rand() * 14).toFixed(2) + '%' },
      { model: 'Gaussian Process', prediction: padToN(Math.floor(rand() * max), digits), conf: (80 + rand() * 15).toFixed(2) + '%' },
      { model: 'Transformer Model', prediction: padToN(Math.floor(rand() * max), digits).slice(0, digits > 3 ? 2 : 1) + 'X' + padToN(Math.floor(rand() * 10), digits > 3 ? 2 : 1), conf: (82 + rand() * 10).toFixed(2) + '%' },
      { model: 'AdaBoost', prediction: padToN(Math.floor(rand() * max), digits), conf: (75 + rand() * 15).toFixed(2) + '%' },
      { model: 'Linear Regression', prediction: padToN(Math.floor(rand() * max), digits), conf: (70 + rand() * 20).toFixed(2) + '%' },
      { model: 'ARIMA Temporal', prediction: padToN(Math.floor(rand() * max), digits), conf: (75 + rand() * 15).toFixed(2) + '%' },
      { model: 'Markov Chain', prediction: padToN(Math.floor(rand() * max), digits), conf: (70 + rand() * 15).toFixed(2) + '%' },
    ];
}