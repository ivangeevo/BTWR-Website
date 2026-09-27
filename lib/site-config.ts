export const siteName = "BTW: Remastered";
export const siteDescription =
  "A Minecraft modpack re-imagining the Better Than Wolves experience, built from the ground for modern minecraft versions.";
export const siteUrl = "https://btwr.org";

// Roadmap page/nav link is unfinished — flip to true to bring it back.
export const enableRoadmap = false;

// Outpost admin panel (/outpost-admin): on under `next dev`, and in local
// builds with NEXT_PUBLIC_OUTPOST_ADMIN=1 in .env.local (for Live Server
// previews of out/). Off in the deployed site, which CI builds without it —
// the route exports as a 404 and the links to it are left out. Settings
// already in a browser's localStorage still apply; this only removes the
// easy way in. NEXT_PUBLIC_OUTPOST_ADMIN=0 turns it off even under
// `next dev` (the "player view" dev task in .vscode/tasks.json).
const outpostAdminEnv = process.env.NEXT_PUBLIC_OUTPOST_ADMIN;
export const enableOutpostAdmin =
  outpostAdminEnv === "1" ||
  (outpostAdminEnv !== "0" && process.env.NODE_ENV === "development");

export const discordInviteUrl: string | null =
  "https://discord.com/invite/PxECJTzGfh";

export const githubRepoUrl: string | null = "https://github.com/BTWR-Team";

// Where the Outpost's "Report a bug" link opens a new issue (HubSection.tsx
// pre-fills the version). null hides the link.
export const outpostBugReportUrl: string | null = "https://github.com/ivangeevo/BTWR-Website/issues/new";

// Support page (/support) links — null shows a "Coming soon" card.
export const kofiUrl: string | null = "https://ko-fi.com/btwremastered";
// A personal Revolut.me link, e.g. https://revolut.me/<name>
export const revolutUrl: string | null = "https://revolut.me/ivangeevo";
