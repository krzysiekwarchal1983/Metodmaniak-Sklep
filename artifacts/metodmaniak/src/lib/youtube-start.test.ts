import { test } from "node:test";
import assert from "node:assert/strict";
import { youtubeStartSeconds } from "./youtube-start";

test("preserves the supplied 2:49 timestamp and other YouTube time formats", () => {
  assert.equal(youtubeStartSeconds("https://www.youtube.com/watch?v=lFkDdWQ7EbY&t=169s"), 169);
  assert.equal(youtubeStartSeconds("https://youtu.be/lFkDdWQ7EbY?t=169"), 169);
  assert.equal(youtubeStartSeconds("https://youtu.be/lFkDdWQ7EbY?t=2m49s"), 169);
  assert.equal(youtubeStartSeconds("https://youtu.be/lFkDdWQ7EbY?t=1h2m3s"), 3723);
  assert.equal(youtubeStartSeconds("https://youtu.be/lFkDdWQ7EbY#t=169"), 169);
  assert.equal(youtubeStartSeconds("https://youtu.be/lFkDdWQ7EbY?start=99&t=169"), 99);
});
test("missing, invalid, negative and unsafe timestamps cannot enter an embed URL", () => {
  for (const value of ["not a URL", "https://youtu.be/lFkDdWQ7EbY", "https://youtu.be/lFkDdWQ7EbY?t=-4", "https://youtu.be/lFkDdWQ7EbY?t=<script>", "https://youtu.be/lFkDdWQ7EbY?t=99999999999999999999999"]) {
    assert.equal(youtubeStartSeconds(value), 0);
  }
});
