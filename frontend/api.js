async function requestJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  const data = text ? safeParseJson(text) : {};

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && data.error) ||
      (typeof text === "string" ? text : "") ||
      "Request failed";
    throw new Error(String(message));
  }

  return data;
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildListQuery({ page, limit, q }) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy: "id",
    sortOrder: "asc"
  });

  if (q.trim()) {
    params.set("q", q.trim());
  }

  return `/api/customers?${params.toString()}`;
}

async function fetchCustomers({ page, limit, q }) {
  return requestJson(buildListQuery({ page, limit, q }));
}

async function updateCustomer(id, fields) {
  return requestJson("/api/customers", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...fields })
  });
}

async function deleteCustomer(id) {
  return requestJson(`/api/customers?id=${id}`, { method: "DELETE" });
}
