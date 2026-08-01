import { describe, expect, it } from "vitest";
import { taskCatalog } from "./appData";

const task = (id: string) => taskCatalog.find((item) => item.id === id);

describe("reading completion rules", () => {
  it("allows Chinese reading tasks to be completed without a timer", () => {
    for (const id of ["chinese-morning-reading", "chinese-night-reading"]) {
      expect(task(id)).toMatchObject({ completionMode: "auto", minimumScore: 0 });
      expect(task(id)?.minimumDuration).toBeUndefined();
    }
  });

  it("keeps the English listening timer unchanged", () => {
    expect(task("english-daily")).toMatchObject({ completionMode: "timer", minimumDuration: 900 });
  });
});
