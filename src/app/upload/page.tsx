import { Suspense } from "react";
import ProtectedPage from "@/components/auth/ProtectedPage";
import Upload from "@/modules/Upload";

export default function UploadPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading...</p>}>
      <ProtectedPage>
        <Upload />
      </ProtectedPage>
    </Suspense>
  );
}
