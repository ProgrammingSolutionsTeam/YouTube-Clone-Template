import { AppLayout, PageHeading } from "@/components/layout/AppLayout";
import { VideoGrid } from "@/components/VideoGrid";

const Subscriptions = () => (
  <AppLayout>
    <PageHeading
      title="الاشتراكات"
      description="أحدث المقاطع من القنوات (المجلدات) التي تتابعها"
    />
    <VideoGrid />
  </AppLayout>
);

export default Subscriptions;
