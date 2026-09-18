export const INDUSTRIES = [
  "SaaS",
  "FinTech",
  "Healthcare",
  "Professional Services",
  "Manufacturing",
  "Logistics",
  "Other",
];

export const TOOLS = [
  "Salesforce",
  "HubSpot",
  "Outreach",
  "Salesloft",
  "Apollo",
  "LinkedIn Sales Navigator",
  "Gong",
  "Other",
];

export const DEAL_SIZES = ["Under £10k", "£10k-£50k", "£50k-£150k", "£150k+"];

export const OTE_RANGES = [
  "Under £40k",
  "£40k-£60k",
  "£60k-£80k",
  "£80k-£100k",
  "£100k+",
];

export const NOT_IN_SALES_OPTIONS = [
  "Recent graduate",
  "Career changer",
  "Finished a sales bootcamp",
  "Other",
];

export const AVAILABILITY_OPTIONS = [
  "Actively looking",
  "Open to offers",
  "Not looking right now",
];

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

export const SENIORITY_LEVELS = [
  "SDR",
  "Junior AE",
  "Mid-Market AE",
  "Enterprise AE",
  "Sales Manager",
];

export const HIRING_TIMELINES = [
  "ASAP",
  "Within 1 month",
  "1-3 months",
  "Just exploring",
];

// Swipe deck daily limits (see the Discover tab on the rep dashboard and the
// new-candidates section on the company dashboard). Companies get a small,
// curated trickle rather than a full list, that's the point, it's meant to
// feel hand-picked. Reps get more since applying costs them nothing until
// they've already said yes to a company. Fixed for everyone for now, not
// worth making configurable per account until there's real volume to
// justify it.
export const COMPANY_DAILY_SWIPE_CAP = 8;
export const REP_DAILY_SWIPE_CAP = 18;
