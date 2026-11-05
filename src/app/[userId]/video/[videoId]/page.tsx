import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import VideoWatch from "@/modules/VideoWatch";
import { Suspense } from "react";

const VideoWatchPage = () => {
  return (
    <div>
      <Suspense fallback={<LoadingSkeleton variant="page" />}>
        <VideoWatch />
      </Suspense>
    </div>
  );
};

export default VideoWatchPage;
