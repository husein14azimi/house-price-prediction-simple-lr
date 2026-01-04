export interface DataPoint {
  id: string;
  area: number;
  price: number;
}

export interface RegressionResult {
  m: number;
  b: number;
  r2: number;
  rmse: number;
  equation: string;
}
