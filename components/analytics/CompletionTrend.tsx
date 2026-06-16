"use client";

type TrendItem = {
  date: string;
  count: number;
};

type Props = {
  trend: TrendItem[];
};

export function CompletionTrend({ trend }: Props) {
  // Find maximum count to scale the Y axis
  const maxVal = Math.max(...trend.map((t) => t.count));
  const maxY = maxVal > 0 ? Math.ceil(maxVal / 5) * 5 : 5; // Default max is 5 if all are 0

  const chartHeight = 200;
  const chartWidth = 460;
  const paddingLeft = 50;
  const paddingTop = 30;

  // Calculate coordinates for Y axis grid lines
  const gridSteps = 5;
  const gridLines = Array.from({ length: gridSteps + 1 }, (_, i) => i);

  return (
    <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset flex flex-col gap-6 rotate-[-0.5deg]">
      <div>
        <h3 className="font-cursive text-2xl font-bold mb-1">Task Completion Trend</h3>
        <p className="font-sans text-xs text-secondary/70">
          Daily chronological logging of completed cards over the last 7 days
        </p>
      </div>

      <div className="w-full overflow-x-auto">
        <div className="min-w-[550px] p-2">
          <svg viewBox="0 0 550 280" className="w-full h-auto overflow-visible">
            {/* Grid Dotted Lines & Y Labels */}
            {gridLines.map((step) => {
              const yVal = paddingTop + chartHeight - (step / gridSteps) * chartHeight;
              const labelVal = Math.round((step / gridSteps) * maxY);

              return (
                <g key={step}>
                  {step > 0 && (
                    <line
                      x1={paddingLeft}
                      y1={yVal}
                      x2={paddingLeft + chartWidth}
                      y2={yVal}
                      stroke="rgba(0,0,0,0.08)"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                  )}
                  <text
                    x={paddingLeft - 12}
                    y={yVal + 4}
                    textAnchor="end"
                    className="font-sans text-[11px] font-semibold fill-secondary/60"
                  >
                    {labelVal}
                  </text>
                </g>
              );
            })}

            {/* X Axis Labels & Sketchy Bars */}
            {trend.map((item, idx) => {
              const barWidth = 36;
              const spacing = chartWidth / trend.length;
              const xVal = paddingLeft + idx * spacing + (spacing - barWidth) / 2;
              
              const pct = item.count / maxY;
              const barHeight = Math.max(0, pct * chartHeight);
              const yVal = paddingTop + chartHeight - barHeight;

              return (
                <g key={item.date} className="group">
                  {/* Shadow Offset (Sketchy Aesthetic) */}
                  {barHeight > 0 && (
                    <rect
                      x={xVal + 3}
                      y={yVal + 3}
                      width={barWidth}
                      height={barHeight}
                      fill="#000000"
                      rx="4"
                    />
                  )}

                  {/* Actual Value Bar (Muted Green) */}
                  {barHeight > 0 ? (
                    <rect
                      x={xVal}
                      y={yVal}
                      width={barWidth}
                      height={barHeight}
                      fill="#D4EDDA"
                      stroke="#000000"
                      strokeWidth="2.5"
                      rx="4"
                      className="transition-all duration-300 group-hover:fill-[#C6E9CE]"
                    />
                  ) : (
                    // Flat line indicator if count is 0
                    <line
                      x1={xVal}
                      y1={paddingTop + chartHeight}
                      x2={xVal + barWidth}
                      y2={paddingTop + chartHeight}
                      stroke="#000000"
                      strokeWidth="2"
                    />
                  )}

                  {/* Value bubble above bar */}
                  {item.count > 0 && (
                    <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <rect
                        x={xVal + barWidth / 2 - 14}
                        y={yVal - 28}
                        width="28"
                        height="18"
                        fill="#000000"
                        rx="3"
                      />
                      <text
                        x={xVal + barWidth / 2}
                        y={yVal - 16}
                        textAnchor="middle"
                        className="font-sans text-[10px] font-bold fill-white"
                      >
                        {item.count}
                      </text>
                      <polygon
                        points={`${xVal + barWidth / 2 - 4},${yVal - 10} ${xVal + barWidth / 2 + 4},${yVal - 10} ${xVal + barWidth / 2},${yVal - 6}`}
                        fill="#000000"
                      />
                    </g>
                  )}

                  {/* Inline value helper (always visible) */}
                  {item.count > 0 && (
                    <text
                      x={xVal + barWidth / 2}
                      y={yVal - 8}
                      textAnchor="middle"
                      className="font-sans text-[11px] font-bold fill-primary/80 group-hover:opacity-0 transition-opacity"
                    >
                      {item.count}
                    </text>
                  )}

                  {/* Date Axis Label */}
                  <text
                    x={xVal + barWidth / 2}
                    y={paddingTop + chartHeight + 24}
                    textAnchor="middle"
                    className="font-cursive text-sm font-bold fill-primary rotate-[-4deg] origin-center"
                  >
                    {item.date}
                  </text>
                </g>
              );
            })}

            {/* Primary Axis Lines */}
            {/* Y Axis */}
            <line
              x1={paddingLeft}
              y1={paddingTop - 10}
              x2={paddingLeft}
              y2={paddingTop + chartHeight}
              stroke="#000000"
              strokeWidth="3"
            />
            {/* X Axis */}
            <line
              x1={paddingLeft}
              y1={paddingTop + chartHeight}
              x2={paddingLeft + chartWidth}
              y2={paddingTop + chartHeight}
              stroke="#000000"
              strokeWidth="3"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
