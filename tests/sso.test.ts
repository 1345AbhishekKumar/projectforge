import { describe, it, expect } from "vitest";

const PUBLIC_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "aol.com",
  "icloud.com"
];

interface OrgMock {
  id: string;
  name: string;
  slug: string;
}

interface MembershipMock {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  email?: string;
}

interface DatabaseMock {
  organizations: OrgMock[];
  memberships: MembershipMock[];
}

function isPublicDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !domain || PUBLIC_DOMAINS.includes(domain);
}

function getDomainPrefix(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain || PUBLIC_DOMAINS.includes(domain)) return null;
  return domain.split(".")[0];
}

// Simulates the JIT provisioning logic in the webhook and syncProfile
async function mockJITProvision({
  email,
  userId,
  databaseMock
}: {
  email: string;
  userId: string;
  databaseMock: DatabaseMock;
}) {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain || PUBLIC_DOMAINS.includes(domain)) {
    return { skipped: true, reason: "Public or invalid email domain" };
  }

  const domainPrefix = domain.split(".")[0];

  // 1. Search for existing organization
  let org = databaseMock.organizations.find((o) => o.slug === domainPrefix);
  if (!org) {
    org = databaseMock.organizations.find((o) => o.name.toLowerCase().includes(domainPrefix));
  }

  // Verify domain matching members exist in the organization
  let targetOrgId: string | undefined = org?.id;
  if (targetOrgId) {
    const orgMemberships = databaseMock.memberships.filter((m) => m.organization_id === targetOrgId);
    const hasDomainMember = orgMemberships.some((m) => m.email?.toLowerCase().endsWith(`@${domain}`));
    
    // If there are members but none have the same email domain, we do NOT auto-join.
    if (!hasDomainMember && orgMemberships.length > 0) {
      targetOrgId = undefined;
    }
  }

  if (targetOrgId) {
    // 2. Link user as MEMBER
    databaseMock.memberships.push({
      id: `membership-${userId}-${targetOrgId}`,
      organization_id: targetOrgId,
      user_id: userId,
      role: "MEMBER",
      email
    });
    return { success: true, action: "JOINED", orgId: targetOrgId };
  } else {
    // 3. Auto-create organization and link as OWNER
    const newOrgId = `org-${domainPrefix}`;
    const newOrgName = `${domainPrefix.charAt(0).toUpperCase()}${domainPrefix.slice(1)} Workspace`;
    const newOrg = { id: newOrgId, name: newOrgName, slug: domainPrefix };
    
    // Check if slug taken (simulating duplicate slug fallback)
    const slugTaken = databaseMock.organizations.some((o) => o.slug === domainPrefix);
    if (slugTaken) {
      const fallbackSlug = domain.replace(/\./g, "-");
      newOrg.slug = fallbackSlug;
    }

    databaseMock.organizations.push(newOrg);
    databaseMock.memberships.push({
      id: `membership-${userId}-${newOrg.id}`,
      organization_id: newOrg.id,
      user_id: userId,
      role: "OWNER",
      email
    });
    return { success: true, action: "CREATED", orgId: newOrg.id };
  }
}

describe("SSO JIT Provisioning Logic Tests", () => {
  it("should detect public consumer domains and filter them", () => {
    expect(isPublicDomain("user@gmail.com")).toBe(true);
    expect(isPublicDomain("user@yahoo.com")).toBe(true);
    expect(isPublicDomain("user@acme.com")).toBe(false);
  });

  it("should extract domain prefix correctly from corporate domains", () => {
    expect(getDomainPrefix("john@acme.com")).toBe("acme");
    expect(getDomainPrefix("admin@devops-pioneers.org")).toBe("devops-pioneers");
    expect(getDomainPrefix("user@gmail.com")).toBeNull();
  });

  it("should auto-join user to existing organization matching the domain slug", async () => {
    const databaseMock = {
      organizations: [
        { id: "org-acme-123", name: "Acme Corp", slug: "acme" }
      ],
      memberships: []
    };

    const res = await mockJITProvision({
      email: "engineer@acme.com",
      userId: "user_sso_1",
      databaseMock
    });

    expect(res.success).toBe(true);
    expect(res.action).toBe("JOINED");
    expect(res.orgId).toBe("org-acme-123");
    expect(databaseMock.memberships).toHaveLength(1);
    expect(databaseMock.memberships[0]).toEqual({
      id: "membership-user_sso_1-org-acme-123",
      organization_id: "org-acme-123",
      user_id: "user_sso_1",
      role: "MEMBER",
      email: "engineer@acme.com"
    });
  });

  it("should auto-create a workspace and assign user as OWNER if domain doesn't exist", async () => {
    const databaseMock = {
      organizations: [] as OrgMock[],
      memberships: [] as MembershipMock[]
    };

    const res = await mockJITProvision({
      email: "ceo@skynet.com",
      userId: "user_sso_2",
      databaseMock
    });

    expect(res.success).toBe(true);
    expect(res.action).toBe("CREATED");
    expect(res.orgId).toBe("org-skynet");
    expect(databaseMock.organizations).toHaveLength(1);
    expect(databaseMock.organizations[0].name).toBe("Skynet Workspace");
    expect(databaseMock.memberships).toHaveLength(1);
    expect(databaseMock.memberships[0].role).toBe("OWNER");
  });

  it("should fallback to full domain slug if the prefix slug is already taken", async () => {
    const databaseMock = {
      organizations: [
        { id: "existing-slug", name: "Acme Team", slug: "acme" }
      ],
      memberships: [
        {
          id: "membership-owner",
          organization_id: "existing-slug",
          user_id: "owner-1",
          role: "OWNER",
          email: "owner@acme.com"
        }
      ]
    };

    // Attempting JIT for a new user with acme.io email where 'acme' is already taken
    const res = await mockJITProvision({
      email: "user@acme.io",
      userId: "user_sso_3",
      databaseMock
    });

    expect(res.success).toBe(true);
    expect(res.action).toBe("CREATED");
    const createdOrg = databaseMock.organizations.find((o) => o.id === "org-acme");
    expect(createdOrg?.slug).toBe("acme-io");
  });

  it("should skip JIT provisioning if the email uses a public domain", async () => {
    const databaseMock = {
      organizations: [],
      memberships: []
    };

    const res = await mockJITProvision({
      email: "someone@gmail.com",
      userId: "user_sso_4",
      databaseMock
    });

    expect(res.skipped).toBe(true);
    expect(databaseMock.organizations).toHaveLength(0);
    expect(databaseMock.memberships).toHaveLength(0);
  });
});
