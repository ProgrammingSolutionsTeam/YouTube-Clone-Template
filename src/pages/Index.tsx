import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { VideoGrid } from "@/components/VideoGrid";
import { cn } from "@/lib/utils";

const categories = [
  "الكل",
  "مضاف حديثًا",
  "أفلام",
  "مسلسلات",
  "موسيقى",
  "ألعاب",
  "دروس",
  "وثائقي",
  "صوتيات",
];

const Index = () => {
  const [active, setActive] = useState("الكل");

  return (
    <AppLayout bare>
      {/* شرائح التصنيفات */}
      <div className="sticky top-14 z-30 border-b border-youtube-border bg-background/95 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto px-3 py-3 [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors",
                active === c
                  ? "bg-foreground text-background"
                  : "bg-secondary text-foreground/80 hover:bg-youtube-light-gray"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-4">
        <VideoGrid />
      </div>
    </AppLayout>
  );
};

export default Index;
