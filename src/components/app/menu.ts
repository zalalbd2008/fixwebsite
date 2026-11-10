// Mobile drawer menu (same items as the WordPress main menu)
export type MenuItem = { label: string; href?: string; id?: string; children?: MenuItem[]; aria?: string };

export const DRAWER_MENU: MenuItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'What We Fix', id: '254181',
    children: [
      { label: 'Hacked Website', href: '/hacked-website-repair/' },
      { label: 'WordPress Errors', href: '/wordpress-wp-website-errors-repair/' },
      { label: 'SEO/ AI Issues', href: '/website-seo-repair-services-in-us/' },
      { label: 'Healthcare SEO & Marketing', href: '/healthcare-seo-agency-med-marketing/' },
      { label: 'Healthcare Marketing by Specialty', href: '/healthcare-online-marketing/' },
    ],
  },
  {
    label: 'AI Search', href: '/ai-search-optimization/', id: '254407', aria: 'Show AI Search pages',
    children: [
      { label: 'AI Search Optimization', href: '/ai-search-optimization/' },
      { label: 'AI Visibility Audit', href: '/ai-visibility-audit/' },
      { label: 'ChatGPT SEO', href: '/chatgpt-seo/' },
      { label: 'Generative Engine Optimization', href: '/generative-engine-optimization/' },
      { label: 'Answer Engine Optimization', href: '/answer-engine-optimization/' },
      { label: 'LLM Optimization', href: '/llm-optimization/' },
      { label: 'Google AI Optimization', href: '/google-ai-optimization/' },
    ],
  },
  {
    label: 'Fix More', href: '/what-we-fix/', id: '250867', aria: 'Show Fix More pages',
    children: [
      { label: 'Broken Layout Repair', href: '/broken-website-layout-repair/' },
      { label: 'CPanel & Security', href: '/website-cpanel-https-security-database-issues-repair-us/' },
      {
        label: "What's More", id: '251108',
        children: [
          { label: 'Maintenance', href: '/website-maintenance-services/' },
          { label: 'Ads Services', href: '/pay-per-click-advertising-companies-houston/' },
          { label: 'Tec Errors', href: '/website-technical-errors/' },
          { label: 'Migration & Upgrade', href: '/website-migration-and-upgrade-services-in-us/' },
          { label: 'Blog', href: '/fix-website-issues-blogs/' },
          { label: 'Review Us', href: '/review-us/' },
        ],
      },
    ],
  },
  { label: 'Who We Are', href: '/about/' },
];
