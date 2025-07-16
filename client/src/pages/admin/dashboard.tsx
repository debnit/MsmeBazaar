import { useEffect, useState } from "react";
import axios from "axios";
import { valuationEngine } from "@/lib/valuation-engine";
import type { MsmeListing } from "@shared/schema";
import type { ValuationResult } from "@/lib/valuation-engine"; // Adjust if exported separately

interface MSME extends MsmeListing {
  id: string;
  name: string;
  phone: string;
  city: string;
  industry: string;
  agreement_base64: string;
}

export default function AdminDashboard() {
  const [msmes, setMsmes] = useState<MSME[]>([]);
  const [valuations, setValuations] = useState<Record<string, ValuationResult>>(
    {},
  );
  const api = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchAndEvaluate = async () => {
      try {
        const res = await axios.get(`${api}/admin/msmes`);
        const listings = res.data as MSME[];
        setMsmes(listings);

        const results = await Promise.all(
          listings.map(async (msme) => {
            const result = await valuationEngine.calculateValuation(msme);
            return { id: msme.id, valuation: result };
          }),
        );

        const map = results.reduce(
          (acc, curr) => {
            acc[curr.id] = curr.valuation;
            return acc;
          },
          {} as Record<string, ValuationResult>,
        );

        setValuations(map);
      } catch (error) {
        console.error("Failed to fetch MSMEs or valuations:", error);
      }
    };

    fetchAndEvaluate();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      {msmes.map((msme) => {
        const valuation = valuations[msme.id];

        return (
          <div
            key={msme.id}
            className="p-4 border rounded shadow bg-white space-y-2"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold">{msme.name}</h2>
                <p className="text-sm text-gray-600">
                  {msme.phone} | {msme.city}
                </p>

                {valuation ? (
                  <div className="text-sm text-gray-800 mt-2 space-y-1">
                    <p>
                      💰 <strong>Estimated:</strong> ₹
                      {valuation.estimatedValue.toLocaleString()}
                    </p>
                    <p>
                      🎯 <strong>Confidence:</strong>{" "}
                      {(valuation.confidence * 100).toFixed(0)}%
                    </p>
                    <p>
                      📊 <strong>Recommendation:</strong>
                      <span
                        className={`ml-1 font-medium ${
                          valuation.recommendation === "undervalued"
                            ? "text-green-700"
                            : valuation.recommendation === "overvalued"
                              ? "text-red-600"
                              : "text-yellow-600"
                        }`}
                      >
                        {valuation.recommendation.replace("_", " ")}
                      </span>
                    </p>
                    <p>
                      📈 <strong>Sensitivity:</strong> ₹
                      {valuation.sensitivityAnalysis.best_case.toLocaleString()}{" "}
                      (best), ₹
                      {valuation.sensitivityAnalysis.worst_case.toLocaleString()}{" "}
                      (worst), ₹
                      {valuation.sensitivityAnalysis.most_likely.toLocaleString()}{" "}
                      (likely)
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    Calculating valuation...
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = `data:application/pdf;base64,${msme.agreement_base64}`;
                  link.download = `${msme.name}-MSME-Agreement.pdf`;
                  link.click();
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Download PDF
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
