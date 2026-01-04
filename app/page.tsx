"use client";

import { useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import {
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DataPoint, RegressionResult } from "@/types";
import { calculateRegression, predictPrice } from "@/lib/regression";

const STORAGE_KEY = "housePriceTrainingData";

function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function round(n: number, digits = 2): number {
  const p = Math.pow(10, digits);
  return Math.round(n * p) / p;
}

function validateArea(area: number): string | null {
  if (!Number.isFinite(area)) return "Area is required.";
  if (area <= 0) return "Area must be a positive number.";
  if (area > 10000) return "Area must be ≤ 10,000.";
  return null;
}

function validatePrice(price: number): string | null {
  if (!Number.isFinite(price)) return "Price is required.";
  if (price <= 0) return "Price must be a positive number.";
  if (price > 100000000) return "Price must be ≤ $100,000,000.";
  return null;
}

function parseNumber(v: string): number {
  const cleaned = v.replace(/,/g, "").trim();
  if (cleaned === "") return NaN;
  return Number(cleaned);
}

export default function Page() {
  const [data, setData] = useState<DataPoint[]>([]);

  // Training form
  const [area, setArea] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [editId, setEditId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string>("");
  const [areaError, setAreaError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Model
  const [model, setModel] = useState<RegressionResult | null>(null);
  const [trainError, setTrainError] = useState<string>("");

  // Prediction
  const [predictArea, setPredictArea] = useState<string>("");
  const [predictError, setPredictError] = useState<string>("");
  const [predictedPrice, setPredictedPrice] = useState<number | null>(null);

  // Load data from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DataPoint[];
      if (Array.isArray(parsed)) setData(parsed);
    } catch {
      // ignore
    }
  }, []);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [data]);

  // Reset model when data changes
  useEffect(() => {
    setModel(null);
    setPredictedPrice(null);
    setTrainError("");
    setPredictError("");
  }, [data]);

  const canAddMore = data.length < 50;

  function onSubmitTraining(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const a = parseNumber(area);
    const p = parseNumber(price);

    const aErr = validateArea(a);
    const pErr = validatePrice(p);

    setAreaError(aErr);
    setPriceError(pErr);

    if (aErr || pErr) return;

    if (!canAddMore && editId === null) {
      setFormError("Maximum of 50 entries reached.");
      return;
    }

    if (editId) {
      setData((prev) => prev.map((d) => (d.id === editId ? { ...d, area: a, price: p } : d)));
      setEditId(null);
    } else {
      setData((prev) => [...prev, { id: nanoid(), area: a, price: p }]);
    }

    setArea("");
    setPrice("");
    setAreaError(null);
    setPriceError(null);
  }

  function startEdit(d: DataPoint) {
    setEditId(d.id);
    setArea(String(d.area));
    setPrice(String(d.price));
    setAreaError(null);
    setPriceError(null);
    setFormError("");
  }

  function remove(id: string) {
    setData((prev) => prev.filter((d) => d.id !== id));
  }

  function cancelEdit() {
    setEditId(null);
    setArea("");
    setPrice("");
    setAreaError(null);
    setPriceError(null);
    setFormError("");
  }

  function train() {
    setTrainError("");
    try {
      const r = calculateRegression(data);
      setModel(r);
    } catch (err) {
      setModel(null);
      setTrainError(err instanceof Error ? err.message : "Failed to train model");
    }
  }

  function onPredict(e: React.FormEvent) {
    e.preventDefault();
    setPredictError("");

    if (!model) {
      setPredictError("Train the model first.");
      setPredictedPrice(null);
      return;
    }

    const a = parseNumber(predictArea);
    const err = validateArea(a);
    if (err) {
      setPredictError(err);
      setPredictedPrice(null);
      return;
    }

    const y = predictPrice(a, model.m, model.b);
    setPredictedPrice(y);
  }

  const regressionLine = useMemo(() => {
    if (!model || data.length === 0) return [] as { area: number; price: number }[];
    const xs = data.map((d) => d.area);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const points = [
      { area: minX, price: predictPrice(minX, model.m, model.b) },
      { area: maxX, price: predictPrice(maxX, model.m, model.b) },
    ];
    return points;
  }, [model, data]);

  const residuals = useMemo(() => {
    if (!model) return [] as { area: number; residual: number; actual: number; predicted: number }[];
    return data.map((d) => {
      const yhat = predictPrice(d.area, model.m, model.b);
      return {
        area: d.area,
        residual: d.price - yhat,
        actual: d.price,
        predicted: yhat,
      };
    });
  }, [model, data]);

  const predictionPoint = useMemo(() => {
    const a = parseNumber(predictArea);
    if (!model || !Number.isFinite(a) || predictedPrice === null) return [] as any[];
    return [{ area: a, price: predictedPrice }];
  }, [model, predictArea, predictedPrice]);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">
            House Price Prediction using Simple Linear Regression
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-700">
            This single-page app lets you enter training data (area vs. price),
            fit a simple linear regression model 
            and visualize both the regression line and residuals—entirely in the browser.
          </p>
        </header>

        <section className="mb-10 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Training data</h2>
            <div className="text-xs text-zinc-600">
              Stored in localStorage • {data.length}/50 points
            </div>
          </div>

          <form onSubmit={onSubmitTraining} className="mt-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium">Area (sq m)</label>
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  onBlur={() => setAreaError(validateArea(parseNumber(area)))}
                  inputMode="decimal"
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                  placeholder="e.g., 120"
                />
                {areaError ? (
                  <p className="mt-1 text-xs text-red-600">{areaError}</p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium">Price (USD)</label>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  onBlur={() => setPriceError(validatePrice(parseNumber(price)))}
                  inputMode="decimal"
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                  placeholder="e.g., 250000"
                />
                {priceError ? (
                  <p className="mt-1 text-xs text-red-600">{priceError}</p>
                ) : null}
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canAddMore && !editId}
                >
                  {editId ? "Save" : "Add"}
                </button>
                {editId ? (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>

            {formError ? (
              <p className="mt-3 text-sm text-red-600">{formError}</p>
            ) : null}
          </form>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-700">
                  <th className="py-2">Area</th>
                  <th className="py-2">Price</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td className="py-4 text-zinc-600" colSpan={3}>
                      No data yet. Add at least two points to train the model.
                    </td>
                  </tr>
                ) : (
                  data.map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-zinc-100 last:border-0"
                    >
                      <td className="py-2">{d.area}</td>
                      <td className="py-2">{formatMoney(d.price)}</td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-lg border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50"
                            onClick={() => startEdit(d)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-lg border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50"
                            onClick={() => remove(d.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold">Model</h2>
            <button
              onClick={train}
              disabled={data.length < 2}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Train model
            </button>
          </div>

          {trainError ? (
            <p className="mt-3 text-sm text-red-600">{trainError}</p>
          ) : null}

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 p-4">
              <div className="text-xs text-zinc-600">Equation</div>
              <div className="mt-1 font-mono text-sm">
                {model ? model.equation : "-"}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 p-4">
              <div className="text-xs text-zinc-600">R²</div>
              <div className="mt-1 font-mono text-sm">
                {model ? round(model.r2, 4) : "-"}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 p-4">
              <div className="text-xs text-zinc-600">RMSE</div>
              <div className="mt-1 font-mono text-sm">
                {model ? formatMoney(model.rmse) : "-"}
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-zinc-600">
            Notes: R² closer to 1 means better fit. RMSE is the typical prediction
            error size (in USD) on the training set.
          </p>
        </section>

        <section className="mb-10 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Prediction</h2>
          <form onSubmit={onPredict} className="mt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium">Area (sq m)</label>
                <input
                  value={predictArea}
                  onChange={(e) => setPredictArea(e.target.value)}
                  inputMode="decimal"
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                  placeholder="e.g., 150"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Predict
                </button>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4">
                <div className="text-xs text-zinc-600">Predicted price</div>
                <div className="mt-1 text-sm font-medium">
                  {predictedPrice === null ? "-" : formatMoney(predictedPrice)}
                </div>
              </div>
            </div>
            {predictError ? (
              <p className="mt-3 text-sm text-red-600">{predictError}</p>
            ) : null}
          </form>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Visualization</h2>
          <p className="mt-2 text-sm text-zinc-700">
            Train the model to see the regression line and residual plot.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-[380px] rounded-lg border border-zinc-200 p-3">
              <div className="mb-2 text-sm font-medium">Training data + regression line</div>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="area"
                    name="Area"
                    tick={{ fontSize: 12 }}
                    label={{ value: "Area (sq m)", position: "insideBottom", offset: -5, fontSize: 12 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="price"
                    name="Price"
                    tick={{ fontSize: 12 }}
                    label={{ value: "Price (USD)", angle: -90, position: "insideLeft", fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => {
                      if (name === "price") return [formatMoney(Number(value)), "Price"];
                      return [value, "Area"];
                    }}
                  />
                  <Legend />
                  <Scatter name="Training data" data={data} fill="#0f172a" />
                  {model ? (
                    <Line
                      name="Regression line"
                      type="linear"
                      dataKey="price"
                      data={regressionLine}
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ) : null}
                  {model && predictionPoint.length > 0 ? (
                    <Scatter
                      name="Prediction"
                      data={predictionPoint}
                      fill="#22c55e"
                      shape="star"
                    />
                  ) : null}
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="h-[380px] rounded-lg border border-zinc-200 p-3">
              <div className="mb-2 text-sm font-medium">Residual plot</div>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="area"
                    name="Area"
                    tick={{ fontSize: 12 }}
                    label={{ value: "Area (sq m)", position: "insideBottom", offset: -5, fontSize: 12 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="residual"
                    name="Residual"
                    tick={{ fontSize: 12 }}
                    label={{ value: "Residual (actual - predicted)", angle: -90, position: "insideLeft", fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: any, name: any, item: any) => {
                      if (name === "residual") return [formatMoney(Number(value)), "Residual"];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Line
                    name="Zero residual"
                    type="linear"
                    dataKey="residual"
                    data={[{ area: 0, residual: 0 }, { area: 10000, residual: 0 }]}
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Scatter name="Residuals" data={residuals} fill="#0f172a" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <footer className="mt-10 text-xs text-zinc-600">
          Built with Next.js (static export) + Tailwind + Recharts. Data stays in your browser.
        </footer>
      </div>
    </main>
  );
}
