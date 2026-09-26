import type {
  onDisconnectPayload,
  onLoadDocumentPayload,
  Extension,
  connectedPayload,
  onConnectPayload,
} from "@hocuspocus/server";
import Logger from "@server/logging/Logger";
import type { withContext } from "./types";

export default class LoggerExtension implements Extension {
  async onLoadDocument(data: withContext<onLoadDocumentPayload>) {
    Logger.debug("multiplayer", `Loaded document "${data.documentName}"`, {
      userId: data.context.user?.id,
    });
  }

  async onConnect(data: withContext<onConnectPayload>) {
    Logger.debug("multiplayer", `New connection to "${data.documentName}"`);
  }

  async connected(data: withContext<connectedPayload>) {
    Logger.debug(
      "multiplayer",
      `Authenticated connection to "${data.documentName}"`
    );
  }

  async onDisconnect(data: withContext<onDisconnectPayload>) {
    Logger.debug("multiplayer", `Closed connection to "${data.documentName}"`, {
      userId: data.context.user?.id,
    });
  }
}
