import { outpostBugReportUrl } from "@/lib/site-config";

// The Outpost's version, shown small and gray in its bottom-right corner
// (HubSection.tsx's OutpostFrame) next to the "Report a bug" link. Bump it
// here, and only here, whenever an Outpost update ships.
export const OUTPOST_VERSION = "0.1.0";

// The "Report a bug" link (beside the version, and in AlphaNotice.tsx) opens
// a GitHub issue with the version already filled in, so every report says
// which build it's from.
export const outpostBugReportHref =
  outpostBugReportUrl &&
  `${outpostBugReportUrl}?${new URLSearchParams({
    title: `[Outpost v${OUTPOST_VERSION}] `,
    body: [
      `**Outpost version:** ${OUTPOST_VERSION}`,
      "",
      "**What happened?**",
      "",
      "",
      "**What did you expect to happen?**",
      "",
      "",
      "**Steps to reproduce (if you know them):**",
      "",
      "",
      "_If you can, attach a save export (Progress tab → Export save) and a screenshot._",
    ].join("\n"),
  })}`;
