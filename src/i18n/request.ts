import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  const selectedLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  const locale = selectedLocale === "vi" ? "vi" : "en";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
