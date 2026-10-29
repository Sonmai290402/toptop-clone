import VideoWatch from "@/modules/VideoWatch";
import { Suspense } from "react";

const VideoWatchPage = () => {
  return (
    <div>
      <Suspense fallback={<p role="status">Loading post...</p>}>
        <VideoWatch />
      </Suspense>
    </div>
  );
};

export default VideoWatchPage;
