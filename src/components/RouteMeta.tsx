import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BASE = "LocalTube";
const META: Record<string, [string, string]> = {
  "/": ["LocalTube — مكتبتك المحلية كأنها YouTube", "تصفح مكتبة الصوتيات والفيديو الخاصة بك محليًا كأنك على YouTube، وشاركها داخل شبكتك."],
  "/watch": ["مشاهدة — LocalTube", "شغّل مقاطعك المحلية بمشغل متقدم يدعم الترجمات والسرعات ووضع المسرح."],
  "/settings": ["الإعدادات — LocalTube", "تحكم باللغة والمظهر والمسارات والمشغل وحسابك في LocalTube."],
  "/channels": ["القنوات — LocalTube", "تصفح مجلدات مكتبتك المحلية كقنوات مرتبة مثل YouTube."],
  "/library": ["المكتبة — LocalTube", "سجل المشاهدة والمقاطع المفضلة وقائمة المشاهدة لاحقًا في مكان واحد."],
  "/history": ["سجل المشاهدة — LocalTube", "استأنف مشاهدة مقاطعك المحلية من حيث توقفت في LocalTube."],
  "/liked": ["المقاطع المعجب بها — LocalTube", "كل المقاطع التي أعجبتك من مكتبتك المحلية في قائمة واحدة."],
  "/later": ["المشاهدة لاحقًا — LocalTube", "المقاطع التي حفظتها لتشاهدها لاحقًا من مكتبتك المحلية."],
  "/subscriptions": ["الاشتراكات — LocalTube", "أحدث المقاطع من القنوات المحلية التي اشتركت فيها."],
  "/trending": ["الرائج — LocalTube", "المقاطع الأكثر مشاهدة في مكتبتك المحلية على LocalTube."],
  "/auth": ["تسجيل الدخول — LocalTube", "سجّل الدخول أو أنشئ حسابًا محليًا مشفرًا للوصول إلى مكتبتك."],
  "/browse": ["تصفح المجلدات — LocalTube", "تنقّل بين مجلدات وملفات مكتبتك المحلية بسهولة."],
  "/search": ["البحث — LocalTube", "ابحث فورًا في مقاطع الفيديو والصوتيات داخل مكتبتك المحلية."],
};

function setMeta(attr: "name" | "property", key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = value;
}

/** Sets a unique title, description and social tags for each page. */
export function RouteMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    const key = "/" + (pathname.split("/")[1] ?? "");
    const [title, description] = META[key] ?? [`الصفحة غير موجودة — ${BASE}`, META["/"][1]];
    document.title = title;
    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", `https://local-tube.lovable.app${pathname}`);
  }, [pathname]);
  return null;
}
