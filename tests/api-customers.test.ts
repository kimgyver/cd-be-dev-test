import assert from "node:assert/strict";
import { describe, it } from "node:test";
import handler from "../backend/api/customers";
import { createJsonReq, createReq, createRes } from "./helpers/http-mocks";

describe("customers API", () => {
  it("returns 405 for non-GET method", async () => {
    const req = createReq("POST", "/api/customers");
    const { res, state } = createRes();

    await handler(req, res);

    assert.equal((res as unknown as { statusCode: number }).statusCode, 405);
    const parsed = JSON.parse(state.body) as { error: string };
    assert.match(parsed.error, /Method not allowed/);
  });

  it("returns 400 for invalid sortBy", async () => {
    const req = createReq("GET", "/api/customers?sortBy=website");

    const { res, state } = createRes();
    await handler(req, res);

    assert.equal((res as unknown as { statusCode: number }).statusCode, 400);
    const parsed = JSON.parse(state.body) as { error: string };
    assert.match(parsed.error, /Invalid sortBy/);
  });

  it("returns 400 for invalid delete id", async () => {
    const req = createReq("DELETE", "/api/customers?id=0");

    const { res, state } = createRes();
    await handler(req, res);

    assert.equal((res as unknown as { statusCode: number }).statusCode, 400);
    const parsed = JSON.parse(state.body) as { error: string };
    assert.match(parsed.error, /Invalid id/);
  });

  it("returns paginated items for a valid request", async () => {
    const req = createReq(
      "GET",
      "/api/customers?page=1&limit=5&sortBy=first_name&sortOrder=asc&q=laura"
    );

    const { res, state } = createRes();
    await handler(req, res);

    assert.equal((res as unknown as { statusCode: number }).statusCode, 200);

    const parsed = JSON.parse(state.body) as {
      page: number;
      limit: number;
      sortBy: string;
      sortOrder: string;
      items: Array<{ first_name: string }>;
    };

    assert.equal(parsed.page, 1);
    assert.equal(parsed.limit, 5);
    assert.equal(parsed.sortBy, "first_name");
    assert.equal(parsed.sortOrder, "asc");
    assert.ok(Array.isArray(parsed.items));
  });

  it("updates a customer via PUT and reflects the change in GET search", async () => {
    const updatedCompany = "ZZ_TEST_COMPANY";

    const putReq = createJsonReq("PUT", "/api/customers", {
      id: 2,
      company: updatedCompany,
      title: "Updated Title"
    });
    const { res: putRes, state: putState } = createRes();

    await handler(putReq, putRes);

    assert.equal((putRes as unknown as { statusCode: number }).statusCode, 200);
    const putParsed = JSON.parse(putState.body) as {
      message: string;
      item: { id: number; company: string; title: string };
    };
    assert.equal(putParsed.message, "Customer updated");
    assert.equal(putParsed.item.id, 2);
    assert.equal(putParsed.item.company, updatedCompany);
    assert.equal(putParsed.item.title, "Updated Title");

    const getReq = createReq(
      "GET",
      `/api/customers?page=1&limit=10&q=${encodeURIComponent(updatedCompany)}`
    );
    const { res: getRes, state: getState } = createRes();

    await handler(getReq, getRes);

    assert.equal((getRes as unknown as { statusCode: number }).statusCode, 200);
    const getParsed = JSON.parse(getState.body) as {
      items: Array<{ id: number; company: string }>;
    };
    assert.ok(
      getParsed.items.some(
        item => item.id === 2 && item.company === updatedCompany
      )
    );
  });

  it("deletes a customer via DELETE and then returns 404 on PUT", async () => {
    const deleteReq = createReq("DELETE", "/api/customers?id=980");
    const { res: deleteRes, state: deleteState } = createRes();

    await handler(deleteReq, deleteRes);

    assert.equal(
      (deleteRes as unknown as { statusCode: number }).statusCode,
      200
    );
    const deleteParsed = JSON.parse(deleteState.body) as {
      message: string;
      id: number;
    };
    assert.equal(deleteParsed.message, "Customer deleted");
    assert.equal(deleteParsed.id, 980);

    const putMissingReq = createJsonReq("PUT", "/api/customers", {
      id: 980,
      company: "should-fail"
    });
    const { res: putMissingRes, state: putMissingState } = createRes();

    await handler(putMissingReq, putMissingRes);

    assert.equal(
      (putMissingRes as unknown as { statusCode: number }).statusCode,
      404
    );
    const putMissingParsed = JSON.parse(putMissingState.body) as {
      error: string;
    };
    assert.match(putMissingParsed.error, /Customer not found/);
  });

  it("returns results sorted in descending order", async () => {
    const req = createReq(
      "GET",
      "/api/customers?page=1&limit=3&sortBy=id&sortOrder=desc"
    );
    const { res, state } = createRes();

    await handler(req, res);

    assert.equal((res as unknown as { statusCode: number }).statusCode, 200);
    const parsed = JSON.parse(state.body) as {
      items: Array<{ id: number }>;
      sortOrder: string;
    };

    assert.equal(parsed.sortOrder, "desc");
    assert.ok(parsed.items.length > 0);
    // Check descending order
    for (let i = 1; i < parsed.items.length; i++) {
      assert.ok(parsed.items[i].id < parsed.items[i - 1].id);
    }
  });

  it("caps limit to 100 maximum", async () => {
    const req = createReq("GET", "/api/customers?page=1&limit=500");
    const { res, state } = createRes();

    await handler(req, res);

    assert.equal((res as unknown as { statusCode: number }).statusCode, 200);
    const parsed = JSON.parse(state.body) as {
      limit: number;
      items: Array<unknown>;
    };

    assert.equal(parsed.limit, 100);
    assert.ok(parsed.items.length <= 100);
  });

  it("returns empty results for non-matching search query", async () => {
    const req = createReq(
      "GET",
      "/api/customers?page=1&limit=10&q=ZZZZNOTEXIST"
    );
    const { res, state } = createRes();

    await handler(req, res);

    assert.equal((res as unknown as { statusCode: number }).statusCode, 200);
    const parsed = JSON.parse(state.body) as {
      items: Array<unknown>;
      total: number;
      totalPages: number;
    };

    assert.equal(parsed.items.length, 0);
    assert.equal(parsed.total, 0);
    assert.equal(parsed.totalPages, 1);
  });

  it("returns 400 for PUT with empty required field", async () => {
    const req = createJsonReq("PUT", "/api/customers", {
      id: 1,
      first_name: ""
    });
    const { res, state } = createRes();

    await handler(req, res);

    assert.equal((res as unknown as { statusCode: number }).statusCode, 400);
    const parsed = JSON.parse(state.body) as { error: string };
    assert.match(parsed.error, /first_name cannot be empty/);
  });

  it("handles OPTIONS preflight request", async () => {
    const req = createReq("OPTIONS", "/api/customers");
    const { res, state } = createRes();

    await handler(req, res);

    assert.equal((res as unknown as { statusCode: number }).statusCode, 204);
    assert.equal(state.body, "");
  });

  it("returns 400 for negative limit", async () => {
    const req = createReq("GET", "/api/customers?limit=-5");
    const { res, state } = createRes();

    await handler(req, res);

    assert.equal((res as unknown as { statusCode: number }).statusCode, 400);
    const parsed = JSON.parse(state.body) as { error: string };
    assert.match(parsed.error, /Invalid limit/);
  });

  it("trims whitespace from search query", async () => {
    const req = createReq(
      "GET",
      "/api/customers?page=1&limit=5&q=%20%20laura%20%20"
    );
    const { res, state } = createRes();

    await handler(req, res);

    assert.equal((res as unknown as { statusCode: number }).statusCode, 200);
    const parsed = JSON.parse(state.body) as {
      items: Array<{ first_name: string }>;
    };

    // Should find results despite whitespace
    assert.ok(parsed.items.length > 0);
  });
});
