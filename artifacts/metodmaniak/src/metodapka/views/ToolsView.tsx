import { useCallback, useState } from "react";
import { useAuth } from "@clerk/react";
import FishCounter from "../components/FishCounter";
import CompetitionAnalyzer from "../components/CompetitionAnalyzer";
import FishingTimer from "../components/FishingTimer";
import FishingPoints from "../components/FishingPoints";

function Tools() {
  const [totals, setTotals] = useState({ fish: 0, grams: 0 });
  const onData = useCallback((fish: number, grams: number) => {
    setTotals((p) => (p.fish === fish && p.grams === grams ? p : { fish, grams }));
  }, []);
  return (
    <div className="mm-tools-grid grid grid-cols-1 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
      <FishCounter onDataChange={onData} />
      <CompetitionAnalyzer totalFish={totals.fish} totalWeightGrams={totals.grams} />
      <FishingTimer />
      <FishingPoints />
    </div>
  );
}

export default function ToolsView() {
  const { userId } = useAuth();
  return (
    <div key={userId ?? "anon"} className="space-y-6" data-testid="section-tools">
      <Tools />
    </div>
  );
}
