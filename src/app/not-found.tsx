import { getSpecialPage } from '@/lib/content';
import { SitePage } from '@/components/site/SitePage';

// Same "Page not found" page as WordPress (also used for 410 Gone URLs)
export default function NotFound() {
  return <SitePage page={getSpecialPage('__404')} pathname="/__404/" />;
}
