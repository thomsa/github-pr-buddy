import { Link } from "@heroui/link";
import { button as buttonStyles } from "@heroui/theme";
import { FaGithub } from "react-icons/fa";

import { siteConfig } from "@/config/site";
import { title, subtitle } from "@/components/primitives";
import { GithubIcon } from "@/components/icons";
import DefaultLayout from "@/layouts/default";

export default function IndexPage() {
  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        {/* Hero Icon */}
        <div className="flex flex-col items-center">
          <FaGithub size={80} className="text-gray-800" />
        </div>

        {/* Product Title and Description */}
        <div className="inline-block max-w-xl text-center">
          <span className={title()}>GitHub </span>
          <span className={title({ color: "violet" })}>PR Buddy</span>
          <p className={subtitle({ class: "mt-4" })}>
            The ultimate dashboard to monitor, filter, and manage your GitHub
            pull requests.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <Link
            className={buttonStyles({
              color: "primary",
              radius: "full",
              variant: "shadow",
            })}
            href="/pr-browser"
          >
            Create your dashboard
          </Link>
          <Link
            isExternal
            className={buttonStyles({ variant: "bordered", radius: "full" })}
            href={"https://github.com/thomsa/github-pr-buddy"}
          >
            <GithubIcon size={20} />
            GitHub
          </Link>
        </div>
      </section>
    </DefaultLayout>
  );
}
