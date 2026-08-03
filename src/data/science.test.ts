import { describe, expect, it } from "vitest";
import { getDailyScienceEpisode, scienceEpisodes } from "./science";

describe("daily science comics", () => {
  it("keeps the same episode throughout a calendar day", () => {
    const first = getDailyScienceEpisode(new Date("2026-08-03T00:05:00"));
    const second = getDailyScienceEpisode(new Date("2026-08-03T23:55:00"));
    expect(second.id).toBe(first.id);
  });

  it("rotates episodes on the next calendar day", () => {
    const first = getDailyScienceEpisode(new Date("2026-08-03T12:00:00"));
    const second = getDailyScienceEpisode(new Date("2026-08-04T12:00:00"));
    expect(second.id).not.toBe(first.id);
  });

  it("provides complete comic panels for every topic", () => {
    expect(scienceEpisodes.length).toBeGreaterThanOrEqual(7);
    for (const episode of scienceEpisodes) {
      expect(episode.title).toBeTruthy();
      expect(episode.topic).toBeTruthy();
      expect(episode.panels.length).toBeGreaterThanOrEqual(3);
      for (const panel of episode.panels) {
        expect(panel.character).toMatch(/^(hello-kitty|my-melody|kuromi|cinnamoroll)$/);
        expect(panel.dialogue).toBeTruthy();
        expect(panel.fact).toBeTruthy();
        expect(panel.caption).toBeTruthy();
      }
    }
  });
});
