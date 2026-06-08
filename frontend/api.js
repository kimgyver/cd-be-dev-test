async function requestJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
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
