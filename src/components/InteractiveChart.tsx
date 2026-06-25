import { useState, useMemo } from "react";
import { formatFinancial, formatPercent } from "#/lib/utils";

interface InteractiveChartProps {
  baseVal: number;
  growth1_5: number;
  growth6_10: number;
  growth11_20: number;
  discountRate: number;
  label: string;
  currency: string;
}

interface YearProjection {
  year: number;
  nominal: number;
  pv: number;
}

export default function InteractiveChart({
  baseVal,
  growth1_5,
  growth6_10,
  growth11_20,
  discountRate,
  label,
  currency = "USD",
}: InteractiveChartProps) {
  const [viewMode, setViewMode] = useState<"nominal" | "pv">("pv");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Generate 20 years projection mathematically based on rates
  const projections: YearProjection[] = useMemo(() => {
    const list: YearProjection[] = [];
    let currentNominal = baseVal;

    for (let yr = 1; yr <= 20; yr++) {
      let growth = growth1_5;
      if (yr > 5 && yr <= 10) growth = growth6_10;
      else if (yr > 10) growth = growth11_20;

      currentNominal = currentNominal * (1 + growth);
      const pv = currentNominal / Math.pow(1 + discountRate, yr);

      list.push({
        year: yr,
        nominal: currentNominal,
        pv: pv,
      });
    }
    return list;
  }, [baseVal, growth1_5, growth6_10, growth11_20, discountRate]);

  // Find max value to calibrate SVG height scaling
  const maxVal = useMemo(() => {
    const vals = projections.map((p) => (viewMode === "nominal" ? p.nominal : p.pv));
    return Math.max(...vals, baseVal) * 1.05; // 5% padding
  }, [projections, viewMode, baseVal]);

  // SVG Drawing Helpers
  const width = 800;
  const height = 240;
  const paddingX = 60;
  const paddingY = 30;

  const points = useMemo(() => {
    return projections.map((p, idx) => {
      const rawX = paddingX + (idx / 19) * (width - paddingX * 2);
      const val = viewMode === "nominal" ? p.nominal : p.pv;
      const rawY = height - paddingY - (val / maxVal) * (height - paddingY * 2);
      return {
        x: Math.round(rawX * 10000) / 10000,
        y: Math.round(rawY * 10000) / 10000,
        ...p,
      };
    });
  }, [projections, viewMode, maxVal]);

  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    return points.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, "");
  }, [points]);

  const areaD = useMemo(() => {
    if (points.length === 0) return "";
    const first = points[0];
    const last = points[points.length - 1];
    return `${pathD} L ${last.x} ${height - paddingY} L ${first.x} ${height - paddingY} Z`;
  }, [points, pathD]);

  const currentHovered = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="bg-white border border-brand-border rounded-xl p-6 transition-all duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border pb-4 mb-6">
        <div>
          <span className="font-mono text-xs text-brand-primary font-bold uppercase tracking-wider">
            20-Year Forecasting Simulation
          </span>
          <h4 className="font-display text-xl font-semibold text-brand-dark mt-1">
            Projection Model: {label}
          </h4>
        </div>

        {/* View Toggle */}
        <div className="flex bg-brand-bg p-1 rounded-lg border border-brand-border self-start">
          <button
            onClick={() => setViewMode("pv")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === "pv"
                ? "bg-white text-brand-dark shadow-sm"
                : "text-gray-500 hover:text-brand-dark"
              }`}
          >
            Present Value (Discounted)
          </button>
          <button
            onClick={() => setViewMode("nominal")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === "nominal"
                ? "bg-white text-brand-dark shadow-sm"
                : "text-gray-500 hover:text-brand-dark"
              }`}
          >
            Nominal Value (Raw Growth)
          </button>
        </div>
      </div>

      {/* Visual Chart Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          style={{ maxHeight: "280px" }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = height - paddingY - ratio * (height - paddingY * 2);
            return (
              <g key={idx} className="opacity-40">
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#e8dfd2"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="font-mono text-[10px] fill-gray-500 font-medium"
                >
                  {formatFinancial(ratio * maxVal, currency)}
                </text>
              </g>
            );
          })}

          {/* Fill Area representing stream */}
          <path
            d={areaD}
            fill="url(#orange-gradient)"
            className="opacity-15"
          />

          {/* Stroke Line */}
          <path
            d={pathD}
            fill="none"
            stroke="var(--color-brand-primary)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* Interactive touch targets */}
          {points.map((p, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                {/* Vertical slider line on hover */}
                {isHovered && (
                  <line
                    x1={p.x}
                    y1={paddingY}
                    x2={p.x}
                    y2={height - paddingY}
                    stroke="var(--color-brand-primary)"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    className="opacity-70"
                  />
                )}

                {/* Point dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? "var(--color-brand-primary)" : "#ffffff"}
                  stroke="var(--color-brand-primary)"
                  strokeWidth={2}
                  className="transition-all duration-150"
                />

                {/* Vertical tracking slice */}
                <rect
                  x={p.x - 15}
                  y={paddingY}
                  width={30}
                  height={height - paddingY * 2}
                  fill="transparent"
                />
              </g>
            );
          })}

          {/* X Axis Labelling */}
          {[1, 5, 10, 15, 20].map((yr) => {
            const idx = yr - 1;
            const x = points[idx]?.x ?? Math.round((paddingX + (idx / 19) * (width - paddingX * 2)) * 10000) / 10000;
            return (
              <text
                key={yr}
                x={x}
                y={height - 8}
                textAnchor="middle"
                className="font-mono text-[11px] fill-gray-500 font-semibold"
              >
                Yr {yr}
              </text>
            );
          })}

          {/* Gradients */}
          <defs>
            <linearGradient id="orange-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-primary)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--color-brand-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Floating tooltip summary */}
        {currentHovered && (
          <div className="absolute top-0 right-0 bg-brand-dark text-white rounded-lg p-3 shadow-lg max-w-[200px] border border-brand-primary/20 animate-fade-in font-mono text-[11px]">
            <p className="font-bold text-brand-primary">Year {currentHovered.year}</p>
            <div className="mt-1 space-y-0.5">
              <p>
                <span className="text-gray-400">Nominal:</span>{" "}
                <span className="font-semibold text-white">
                  {formatFinancial(currentHovered.nominal, currency)}
                </span>
              </p>
              <p>
                <span className="text-gray-400">P.V.:</span>{" "}
                <span className="font-semibold text-brand-primary">
                  {formatFinancial(currentHovered.pv, currency)}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Grid displaying the mathematical parameters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-6 bg-brand-bg/50 rounded-xl p-4 border border-brand-border/65 font-mono text-xs">
        <div>
          <p className="text-gray-500 uppercase font-semibold">Base cash-flow</p>
          <p className="text-sm font-bold text-brand-dark mt-0.5">
            {formatFinancial(baseVal, currency)}
          </p>
        </div>
        <div>
          <p className="text-gray-500 uppercase font-semibold">Growth rates (Yr 1-5)</p>
          <p className="text-sm font-bold text-brand-dark mt-0.5">
            {formatPercent(growth1_5)}
          </p>
        </div>
        <div>
          <p className="text-gray-500 uppercase font-semibold">Growth rates (Yr 6-10)</p>
          <p className="text-sm font-bold text-brand-dark mt-0.5">
            {formatPercent(growth6_10)}
          </p>
        </div>
        <div>
          <p className="text-gray-500 uppercase font-semibold">Growth rates (Yr 11-20)</p>
          <p className="text-sm font-bold text-brand-dark mt-0.5">
            {formatPercent(growth11_20)}
          </p>
        </div>
        <div>
          <p className="text-gray-500 uppercase font-semibold">Discount hurdle rate</p>
          <p className="text-sm font-bold text-brand-primary mt-0.5">
            {formatPercent(discountRate)}
          </p>
        </div>
      </div>
    </div>
  );
}
