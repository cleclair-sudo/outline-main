import { createContext } from "@server/context";
import { buildDocument, buildUser } from "@server/test/factories";
import Revision from "./Revision";

describe("#findLatest", () => {
  test("should return latest revision", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      title: "Title",
      text: "Content",
      userId: user.id,
    });
    const ctx = createContext({ user });
    await Revision.createFromDocument(ctx, document);
    document.title = "Changed 1";
    await document.save();
    await Revision.createFromDocument(ctx, document);
    document.title = "Changed 2";
    await document.save();
    await Revision.createFromDocument(ctx, document);
    const revision = await Revision.findLatest(document.id);
    expect(revision?.title).toBe("Changed 2");
  });
});

describe("#before", () => {
  test("finds the previous revision when timestamps are equal", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      title: "Title",
      text: "Content",
      userId: user.id,
    });
    const ctx = createContext({ user });
    const createdAt = new Date();

    document.setDataValue("updatedAt", createdAt);
    const previous = await Revision.createFromDocument(ctx, document);

    document.title = "Updated title";
    document.setDataValue("updatedAt", createdAt);
    const current = await Revision.createFromDocument(ctx, document);

    expect((await current.before())?.id).toBe(previous.id);
  });
});
