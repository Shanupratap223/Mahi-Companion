import { useEffect, useState } from "react";
import { Onboarding } from "@/pages/onboarding";
import { Home } from "@/pages/home";
import { getApiKey } from "@/lib/storage";

function App() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    setHasKey(Boolean(getApiKey()));
  }, []);

  if (hasKey === null) {
    return <div className="min-h-[100dvh] w-full bg-[#06010f]" />;
  }

  if (!hasKey) {
    return <Onboarding onReady={() => setHasKey(true)} />;
  }

  return <Home onSignOut={() => setHasKey(false)} />;
}

export default App;
