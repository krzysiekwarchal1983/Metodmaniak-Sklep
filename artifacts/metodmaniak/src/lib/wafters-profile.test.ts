import { test } from "node:test";
import assert from "node:assert/strict";
import { getWaftersProfile } from "./wafters-profile";

const p = (subcategory: string, color = "Różowy wyprany", category = "waftersy") => ({ category, subcategory, color });
test("size determines the owner's exact season, fish weight and hook methodology", () => {
  const expected = [
    ["6mm", "Wiosna / jesień", "down", "1 kg", "14–12", "Cienki drut"],
    ["8mm", "Lato", null, "1–3 kg", "12–10", "Gruby drut"],
    ["10mm", "Lato", "up", "3 kg", "10–8", "Duży, gruby drut"],
  ] as const;
  for (const [size, season, direction, weight, hook, wire] of expected) {
    const profile = getWaftersProfile(p(size))!;
    assert.deepEqual([profile.seasonLabel, profile.weightDirection, profile.weight, profile.hookSize, profile.wire], [season, direction, weight, hook, wire]);
    assert.deepEqual(getWaftersProfile(p(size.replace("mm", " mm"))), profile);
  }
});
test("weather follows colour, not size, and distinguishes natural, washed and vivid colours", () => {
  for (const size of ["6mm", "8mm", "10mm"]) {
    assert.deepEqual(getWaftersProfile(p(size, "Ciemny brązowy"))!.weather, ["sun"]);
    assert.deepEqual(getWaftersProfile(p(size))!.weather, ["sun", "cloud"]);
    assert.deepEqual(getWaftersProfile(p(size, "Żółty fluo"))!.weather, ["cloud", "rain"]);
    assert.deepEqual(getWaftersProfile(p(size, "Żółty fluo z pomarańczowym"))!.weather, ["cloud", "rain"]);
  }
});
test("never invents size guidance for other categories or unknown sizes or weather for unknown colours", () => {
  assert.equal(getWaftersProfile(p("6mm", "Brązowy", "pellety")), null);
  assert.equal(getWaftersProfile(p("12mm")), null);
  assert.deepEqual(getWaftersProfile(p("6mm", "Nowy kolor"))!.weather, []);
});
