// Grantable sidebar sections for the custom-role permission editor (Permissions /
// Custom Roles / Add New User views). KEEP THE IDS IN SYNC WITH the `sidebarItems`
// array in SuperAdminSidebar.tsx - these are display copies of the same ids/labels,
// not a shared import, to avoid touching that large existing component's structure.
// "admin-management" is intentionally excluded: it is always superadmin-only and
// can never be granted, to prevent an admin from managing roles/admins/permissions
// and self-escalating.
export interface AdminSectionItem {
  id: string;
  label: string;
  description: string;
}

export interface AdminSectionGroup {
  section: string;
  items: AdminSectionItem[];
}

export const ADMIN_SECTION_GROUPS: AdminSectionGroup[] = [
  {
    section: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", description: "Main analytics overview" },
      { id: "insights", label: "Business Insights", description: "Key business metrics" },
    ],
  },
  {
    section: "User Management",
    items: [
      { id: "users", label: "User Analytics", description: "User registration & activity" },
      { id: "trials", label: "Trial Management", description: "Free trial tracking" },
      { id: "onboarding", label: "User Onboarding", description: "Signup flow analytics" },
      { id: "authentication", label: "Auth Tracking", description: "Login & security events" },
    ],
  },
  {
    section: "Business Operations",
    items: [
      { id: "revenue", label: "Revenue Analytics", description: "Financial performance" },
      { id: "subscriptions", label: "Subscriptions", description: "Plan management" },
      { id: "organizations", label: "Organizations", description: "Church & org tracking" },
      { id: "conversion", label: "Conversion Funnel", description: "User journey optimization" },
    ],
  },
  {
    section: "Referral Analytics",
    items: [
      { id: "referral-requests", label: "Referral Requests", description: "Review and approve referral partner applications" },
    ],
  },
  {
    section: "Platform Management",
    items: [
      { id: "system", label: "System Health", description: "Platform monitoring" },
      { id: "notifications", label: "Notifications", description: "Email & alert systems" },
      { id: "database", label: "Database Analytics", description: "Data storage metrics" },
      { id: "api", label: "API Usage", description: "Endpoint performance" },
    ],
  },
  {
    section: "Content & Features",
    items: [
      { id: "bible-widget", label: "Bible Widget Usage", description: "AI Bible companion analytics" },
      { id: "features", label: "Feature Adoption", description: "Product feature tracking" },
      { id: "feedback", label: "User Feedback", description: "Support & testimonials" },
      { id: "global", label: "Global Reach", description: "Worldwide usage patterns" },
      { id: "policies", label: "Policies", description: "Privacy, refund, and legal policy management" },
      { id: "media-assets", label: "Media & Assets", description: "Cloud media assets management for all users" },
    ],
  },
  {
    section: "Administration",
    items: [
      { id: "contact-data", label: "Contact Data", description: "Manage contact form submissions" },
      { id: "reports", label: "Custom Reports", description: "Export & data analysis" },
      { id: "settings", label: "Admin Settings", description: "Platform configuration" },
      { id: "support", label: "Support Center", description: "Help desk management" },
      { id: "resource-centre", label: "Resource Centre", description: "Manage Help & Support content" },
      { id: "bible-management", label: "Bible Management", description: "Audit, repair, and import Bible translations" },
    ],
  },
];

export const ALL_GRANTABLE_SECTION_IDS: string[] = ADMIN_SECTION_GROUPS.flatMap((group) =>
  group.items.map((item) => item.id)
);
