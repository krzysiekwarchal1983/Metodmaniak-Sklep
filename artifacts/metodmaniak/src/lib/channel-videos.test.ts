import { test } from "node:test";
import assert from "node:assert/strict";
import { CHANNEL_VIDEOS, pickChannelVideo } from "./channel-videos";

test("every random interval selects exactly one verified channel video", () => {
  assert.equal(CHANNEL_VIDEOS.length, 6);
  for (let index = 0; index < CHANNEL_VIDEOS.length; index++) {
    const video = pickChannelVideo(() => (index + 0.5) / CHANNEL_VIDEOS.length);
    assert.equal(video, CHANNEL_VIDEOS[index]);
    assert.match(video.videoUrl, /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}/);
    assert.match(video.thumbnail, /^\/api\/storage\/public-objects\//);
    assert.ok(Number.isFinite(Date.parse(video.createdAt)));
  }
  assert.equal(pickChannelVideo(() => 0), CHANNEL_VIDEOS[0]);
  assert.equal(pickChannelVideo(() => 0.999999), CHANNEL_VIDEOS.at(-1));
});
