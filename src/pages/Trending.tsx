import { AppLayout, PageHeading } from "@/components/layout/AppLayout";
import { VideoGrid } from "@/components/VideoGrid";

const Trending = () => (
  <AppLayout>
    <PageHeading
      title="الأكثر مشاهدة"
      description="أكثر المقاطع تشغيلًا في مكتبتك المحلية"
    />
    <VideoGrid />
  </AppLayout>
);

export default Trending;
