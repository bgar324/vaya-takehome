import MentionBox from "./components/MentionBox";

export default function Page() {
  return (
    <main className="min-h-screen px-4 py-10 sm:py-14">
      <section className="panel-rise mx-auto max-w-3xl">
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
          Airport Mentions
        </h1>
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
