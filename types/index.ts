export type MembershipRole = "OWNER" | "ADMIN" | "MEMBER";

export type UserProfile = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

export type Membership = {
  id: string;
  user_id: string;
  organization_id: string;
  role: MembershipRole;
  created_at: string;
};

export type OrganizationWithRole = Organization & {
  role: MembershipRole;
};
