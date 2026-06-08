import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePagination } from "../backend/pagination";

describe("parsePagination", () => {
  it("returns defaults when no input is provided", () => {
    assert.deepEqual(parsePagination({}), {
      page: 1,
      limit: 20,
      offset: 0
    });
  });

  it("parses valid inputs", () => {
    assert.deepEqual(parsePagination({ page: "2", limit: "10" }), {
      page: 2,
      limit: 10,
      offset: 10
    });
  });

  it("caps limit to max value", () => {
    assert.deepEqual(parsePagination({ page: "1", limit: "300" }), {
      page: 1,
      limit: 100,
      offset: 0
    });
  });

  it("throws on invalid page", () => {
    assert.throws(() => parsePagination({ page: "0" }), /Invalid page/);
  });

  it("throws on invalid limit", () => {
    assert.throws(() => parsePagination({ limit: "-1" }), /Invalid limit/);
  });
});
