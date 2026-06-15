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

export type ProjectStatus = "PLANNING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type Project = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
};

