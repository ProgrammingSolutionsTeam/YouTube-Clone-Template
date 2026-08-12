import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { VideoPlayer } from "@/components/VideoPlayer";
import { SuggestedVideos } from "@/components/SuggestedVideos";

const Watch = () => {
  const { videoId } = useParams<{ videoId: string }>();

  return (
    <AppLayout bare>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-0 sm:p-4 xl:flex-row">
        <div className="min-w-0 flex-1">
          <VideoPlayer videoId={videoId || "1"} />
        </div>
        <aside className="px-3 pb-6 sm:px-0 xl:w-[380px] xl:shrink-0">
          <SuggestedVideos />
        </aside>
      </div>
    </AppLayout>
  );
};

export default Watch;
