import Image from "next/image";
import MentionBox from "./components/MentionBox";

export default function Page() {
  return (
    <main className="min-h-screen px-4 py-10 sm:py-14">
      <section className="panel-rise mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            Airport Mentions
          </h1>
          <a
            href="https://github.com/bgar324/vaya-takehome"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50"
          >
            <Image
              src="/static/SVG/GitHub_Invertocat_Black.svg"
              alt=""
              aria-hidden="true"
              width={16}
              height={16}
              className="h-4 w-4"
            />
            <span>GitHub</span>
          </a>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Type @ to search. Enter or Tab to insert.
        </p>

        <div className="mt-6">
          <MentionBox />
        </div>
      </section>
    </main>
  );
}
