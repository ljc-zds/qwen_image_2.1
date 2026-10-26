import { useQuery } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';

import { getQueryClient } from '@/lib/query-client';

export const getAnalyticsConfigs = createServerFn().handler(async () => {
  const { getAllConfigs } = await import('@/modules/config/service');
  const configs = await getAllConfigs();
  return {
    gaId: configs.google_analytics_id?.trim() || '',
    plausibleDomain: configs.plausible_domain?.trim() || '',
    plausibleSrc: configs.plausible_src?.trim() || '',
    adsenseCode: configs.adsense_code?.trim() || '',
    crispWebsiteId:
      configs.crisp_enabled === 'true'
        ? configs.crisp_website_id?.trim() || ''
        : '',
    tawkPropertyId:
      configs.tawk_enabled === 'true'
        ? configs.tawk_property_id?.trim() || ''
        : '',
    tawkWidgetId:
      configs.tawk_enabled === 'true'
        ? configs.tawk_widget_id?.trim() || ''
        : '',
  };
});

export const SITE_DISPLAY_KEY = ['site-display'] as const;
export function useSiteDisplay() {
  return useQuery(
    {
      queryKey: SITE_DISPLAY_KEY,
      queryFn: () => getAnalyticsConfigs(),
      staleTime: 60_000,
    },
    getQueryClient()
  ).data;
}
