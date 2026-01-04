import { DataPoint, RegressionResult } from "@/types";

export function calculateRegression(data: DataPoint[]): RegressionResult {
  const n = data.length;
  if (n < 2) {
    throw new Error("Insufficient data points");
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  data.forEach((p) => {
    sumX += p.area;
    sumY += p.price;
    sumXY += p.area * p.price;
    sumXX += p.area * p.area;
  });

  // Handle vertical line case (all X are same)
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
      return { m: 0, b: 0, r2: 0, rmse: 0, equation: "Undefined (Vertical Line)" };
  }

  const m = (n * sumXY - sumX * sumY) / denominator;
  const b = (sumY - m * sumX) / n;

  // Calculate R2 and RMSE
  let ssTot = 0;
  let ssRes = 0;
  const meanY = sumY / n;

  data.forEach((p) => {
    const predictedY = m * p.area + b;
    ssTot += Math.pow(p.price - meanY, 2);
    ssRes += Math.pow(p.price - predictedY, 2);
  });

  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const rmse = Math.sqrt(ssRes / n);

  return {
    m,
    b,
    r2,
    rmse,
    equation: `y = ${m.toFixed(4)}x + ${b.toFixed(2)}`,
  };
}

export function predictPrice(area: number, m: number, b: number): number {
    return m * area + b;
}
