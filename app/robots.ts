import type { MetadataRoute } from 'next';
import { config } from '@/lib/config';
import { buildRobots } from '@/lib/robots-policy';

export default function robots(): MetadataRoute.Robots {
  return buildRobots(config.siteUrl, {
    NEXT_PUBLIC_NOINDEX: config.noindexFlag,
    NEXT_PUBLIC_AIMEE_ENV: config.aimeeEnv,
  });
}
