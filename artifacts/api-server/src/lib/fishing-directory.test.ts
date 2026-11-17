import { test } from "node:test";
import assert from "node:assert/strict";
import { fishingEventInput, fisheryInput } from "./fishing-directory";
import { ListFishingEventsResponse } from "@workspace/api-zod";

const event = {
  name: " Zawody testowe ", description: "", eventDate: "2028-02-29", startTime: "06:30",
  location: "", country: "PL", category: "Method Feeder", link: "", posterUrl: "", latitude: null, longitude: null,
};
const fishery = {
  name: " Łowisko testowe ", description: "", location: "", country: "pl", voivodeship: "",
  fisheryType: "commercial", maxDepth: "", phone: "", link: "", googleMapsLink: "", latitude: null, longitude: null, images: [],
};
test("calendar date stays an exact string through input and response, including leap day", () => {
  const data = fishingEventInput.parse(event);
  assert.equal(data.eventDate, "2028-02-29");
  assert.equal(data.name, "Zawody testowe");
  assert.equal(data.country, "pl");
  const [response] = ListFishingEventsResponse.parse([{ ...data, id: 1, version: 0, createdAt: "2026-11-11T00:00:00Z", updatedAt: "2026-11-11T00:00:00Z" }]);
  assert.equal(response.eventDate, event.eventDate);
  assert.equal(typeof response.eventDate, "string");
});
test("invalid dates and times are rejected instead of silently normalized", () => {
  for (const eventDate of ["2027-02-29", "2026-02-30", "2026-04-31", "2026-13-01", "11/11/2026", "2026-11-11T00:00:00Z", null, 0]) {
    assert.equal(fishingEventInput.safeParse({ ...event, eventDate }).success, false, String(eventDate));
  }
  for (const startTime of ["24:00", "06:60", "6:30"]) {
    assert.equal(fishingEventInput.safeParse({ ...event, startTime }).success, false);
  }
  assert.equal(fishingEventInput.safeParse({ ...event, startTime: "" }).success, true);
});
test("coordinates must be a valid pair and optional values can be explicitly cleared", () => {
  for (const input of [event, fishery]) {
    const schema = "eventDate" in input ? fishingEventInput : fisheryInput;
    assert.equal(schema.safeParse({ ...input, latitude: 50, longitude: null }).success, false);
    assert.equal(schema.safeParse({ ...input, latitude: null, longitude: 19 }).success, false);
    assert.equal(schema.safeParse({ ...input, latitude: 91, longitude: 19 }).success, false);
    assert.equal(schema.safeParse({ ...input, latitude: 0, longitude: 0 }).success, true);
    assert.equal(schema.safeParse({ ...input, latitude: null, longitude: null }).success, true);
  }
  const cleared = fisheryInput.parse(fishery);
  assert.deepEqual(cleared.images, []);
  assert.equal(cleared.googleMapsLink, "");
  assert.equal(cleared.latitude, null);
});
test("names, enum values and URLs are checked without importing arbitrary HTML or inline media", () => {
  assert.equal(fisheryInput.safeParse({ ...fishery, name: "   " }).success, false);
  assert.equal(fisheryInput.safeParse({ ...fishery, fisheryType: "invalid" }).success, false);
  for (const link of ["javascript:alert(1)", "data:text/html,test", "https://user:password@example.com"]) {
    assert.equal(fisheryInput.safeParse({ ...fishery, link }).success, false);
    assert.equal(fishingEventInput.safeParse({ ...event, link }).success, false);
  }
  assert.equal(fisheryInput.safeParse({ ...fishery, images: ["data:image/png;base64,AAAA"] }).success, false);
  assert.equal(fisheryInput.safeParse({ ...fishery, images: ["https://example.com/fishery.webp"] }).success, true);
  assert.equal(fisheryInput.safeParse({ ...fishery, images: Array(11).fill("https://example.com/photo.webp") }).success, false);
  assert.equal(fishingEventInput.safeParse({ ...event, posterUrl: "https://example.com/poster.webp" }).success, true);
});
