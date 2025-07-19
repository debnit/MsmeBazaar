export function calculateMetrics(data: any[]) {
  const totalMSMEs = data.length;
  const totalRevenue = data.reduce((acc, d) => acc + (d.revenue || 0), 0);
  const averageValuation = data.reduce((acc, d) => acc + (d.valuation || 0), 0) / totalMSMEs;

  return {
    totalMSMEs,
    totalRevenue,
    averageValuation: Math.round(averageValuation),
    lastUpdated: new Date().toISOString(),
  };
}

