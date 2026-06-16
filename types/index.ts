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

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type SprintStatus = "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export type Sprint = {
  id: string;
  organization_id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: SprintStatus;
  created_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  organization_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  due_date: string | null;
  sprint_id: string | null;
  board_index: number;
  created_at: string;
  updated_at: string;
};

export type Comment = {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type CommentWithUser = Comment & {
  user: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
};

export type Attachment = {
  id: string;
  task_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_url: string;
  storage_path: string;
  created_at: string;
};

export type AttachmentWithUser = Attachment & {
  user: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
};

export type NotificationType =
  | "GENERAL"
  | "TASK_OVERDUE"
  | "SPRINT_STARTED"
  | "SPRINT_ENDED"
  | "MEMBER_INVITED"
  | "PROJECT_COMPLETED";

export type Notification = {
  id: string;
  user_id: string;
  content: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
};

export type NotificationPreference = {
  id: string;
  user_id: string;
  type: NotificationType;
  in_app: boolean;
  email: boolean;
  created_at: string;
  updated_at: string;
};

export type Label = {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  created_at: string;
};

export type SavedView = {
  id: string;
  user_id: string;
  organization_id: string;
  name: string;
  filters: {
    priorities?: TaskPriority[];
    statuses?: TaskStatus[];
    assigneeIds?: (string | null)[];
    labelIds?: string[];
  };
  created_at: string;
};

export type SearchResultProject = Pick<Project, "id" | "name" | "status" | "description">;

export type SearchResultTask = Pick<Task, "id" | "title" | "status" | "priority" | "project_id">;

export type SearchResultMember = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: MembershipRole;
};

export type SearchResult = {
  projects: SearchResultProject[];
  tasks: SearchResultTask[];
  members: SearchResultMember[];
};

export type TeamMember = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  role: MembershipRole;
  assigned_task_count: number;
  active_project_count: number;
};




