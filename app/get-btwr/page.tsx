import type { Metadata } from "next";
import Image from "next/image";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Get BTWR!",
  description:
    "Step-by-step instructions to install the BTW: Remastered modpack through the Modrinth App.",
  alternates: { canonical: "/get-btwr" },
};

const installSteps = [
  {
    title: "Create a new instance",
    description: "In the Modrinth App, click the + button in the sidebar.",
    image: "/community-guide/step1.webp",
    alt: "The Create new instance button in the Modrinth App sidebar",
    width: 236,
    height: 68,
  },
  {
    title: "Start from a mod or modpack",
    description:
      "In the Create Instance dialog, pick this option instead of a custom setup.",
    image: "/community-guide/step2.webp",
    alt: "The Start from a mod or modpack option in the Create instance dialog",
    width: 596,
    height: 465,
  },
  {
    title: "Search for BTWR and install it",
    description:
      "Select the BTWR [Alpha] modpack from the results, then click the green + Install button.",
    image: "/community-guide/step3.webp",
    alt: "The + Install button on a Modrinth search result",
    width: 198,
    height: 100,
  },
  {
    title: "Play!",
    description:
      "Once the modpack finishes installing, click the green Play button in the top right.",
    image: "/community-guide/step4.webp",
    alt: "The Play button on an installed instance",
    width: 260,
    height: 80,
  },
];

export default function GetBtwrPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div>
        <h1 className="font-heading text-3xl font-extrabold tracking-wide text-chrome-dark dark:text-chrome">
          Get BTWR!
        </h1>
      </div>

      <Reveal className="mt-8">
        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            How to Install
          </h2>
          <p className="mt-2 text-slate-700 dark:text-slate-300">
            The easiest way to play BTWR is through the{" "}
            <a
              href="https://modrinth.com/app"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-glow underline"
            >
              Modrinth App
            </a>
            , a free launcher that installs the whole modpack — mods,
            resource packs, and shaders — in a couple of clicks.
          </p>

          <ol className="mt-8 space-y-10">
            {installSteps.map((step, i) => (
              <li key={step.title}>
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-chrome-dark text-sm font-bold text-white dark:bg-chrome dark:text-chrome-dark">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {step.description}
                    </p>
                  </div>
                </div>
                <Image
                  src={step.image}
                  alt={step.alt}
                  width={step.width}
                  height={step.height}
                  className="mt-4 ml-10 max-w-full rounded-lg border border-slate-200 dark:border-slate-700"
                />
              </li>
            ))}
          </ol>
        </section>
      </Reveal>
    </div>
  );
}
