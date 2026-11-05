import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import { Suspense } from "react";
import ProtectedPage from "@/components/auth/ProtectedPage";
import Upload from "@/modules/Upload";

export default function UploadPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="page" />}>
      <ProtectedPage>
        <Upload />
      </ProtectedPage>
    </Suspense>
  );
}
