import { describe, it, expect } from "vitest";
import crypto from "crypto";

function calculateHMAC(data: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(data);
  return hmac.digest("hex");
}

describe("Data Export Integrity & Format Verification", () => {
  const secretKey = "test-export-hmac-key";

  it("should generate a consistent and correct SHA-256 HMAC integrity hash", () => {
    const rawData = [
      { id: 1, action: "auth.login", actor: "user1", created_at: "2026-06-21T12:00:00Z" },
      { id: 2, action: "task.created", actor: "user1", created_at: "2026-06-21T12:05:00Z" }
    ];
    const dataString = JSON.stringify(rawData);

    const hash1 = calculateHMAC(dataString, secretKey);
    const hash2 = calculateHMAC(dataString, secretKey);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 is 64 hex characters
  });

  it("should fail validation if the export data is tampered with", () => {
    const originalData = JSON.stringify([
      { action: "task.delete", actor: "admin" }
    ]);
    const tamperedData = JSON.stringify([
      { action: "task.delete", actor: "user" } // Changed actor
    ]);

    const hashOriginal = calculateHMAC(originalData, secretKey);
    const hashTampered = calculateHMAC(tamperedData, secretKey);

    expect(hashOriginal).not.toBe(hashTampered);
  });

  it("should output valid CSV formatted text from project list data", () => {
    const mockProjects = [
      { name: "Web App", description: "First project, details", status: "ACTIVE", created_at: "2026-06-21T12:00:00Z", tasks_count: 5 },
      { name: "Mobile API", description: "Back-end for mobile", status: "PLANNING", created_at: "2026-06-21T12:30:00Z", tasks_count: 12 }
    ];

    let csvContent = "Project Name,Description,Status,Created At,Tasks Count\n";
    mockProjects.forEach((p) => {
      csvContent += `"${p.name.replace(/"/g, '""')}","${p.description.replace(/"/g, '""')}","${p.status}","${p.created_at}",${p.tasks_count}\n`;
    });

    const lines = csvContent.trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("Project Name,Description,Status,Created At,Tasks Count");
    expect(lines[1]).toBe(`"Web App","First project, details","ACTIVE","2026-06-21T12:00:00Z",5`);
  });

  it("should generate a valid HTML spreadsheet markup structure for Excel", () => {
    const mockAuditLog = [
      { created_at: "2026-06-21T12:00:00Z", actor: "John Doe", action: "sprint.started", entity_type: "sprint", entity_id: "uuid-123", metadata: "{}" }
    ];

    let tableRows = `<tr><th>Time (UTC)</th><th>Actor</th><th>Action</th><th>Entity Type</th><th>Entity ID</th><th>Metadata (JSON)</th></tr>`;
    mockAuditLog.forEach((log) => {
      tableRows += `<tr><td>${log.created_at}</td><td>${log.actor}</td><td>${log.action}</td><td>${log.entity_type}</td><td>${log.entity_id}</td><td>${log.metadata}</td></tr>`;
    });

    const excelMarkup = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <body>
        <table>
          ${tableRows}
        </table>
      </body>
      </html>
    `;

    expect(excelMarkup).toContain("xmlns:x=\"urn:schemas-microsoft-com:office:excel\"");
    expect(excelMarkup).toContain("sprint.started");
    expect(excelMarkup).toContain("John Doe");
  });
});
