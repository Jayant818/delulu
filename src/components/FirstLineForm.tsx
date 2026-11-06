// "Write your first line": a plain GET form, so it works without JS. /app reads ?draft= and puts the line in the chat
// box; she still taps Send. A two-line box with the button under it: side by side (the design's pill), the hero
// placeholder was cut at every width measured (375 to 1440 px). Two lines also read as a diary page.
export function FirstLineForm({ id, placeholder, label }: { id: string; placeholder: string; label?: string }) {
  return (
    <form action="/app" method="get" className="flex w-full max-w-[520px] flex-col gap-2.5 text-left">
      {label ? (
        <label htmlFor={id} className="font-mono text-xs uppercase tracking-[0.12em] text-l-muted">
          {label}
        </label>
      ) : null}
      <div className="flex flex-col gap-2 rounded-[22px] border border-l-field bg-l-card p-2 focus-within:border-l-ink">
        <textarea
          id={id}
          name="draft"
          rows={2}
          maxLength={2000}
          placeholder={placeholder}
          aria-label={label ? undefined : "Write your first line"}
          className="min-w-0 resize-none bg-transparent px-3 py-2 font-serif text-lg italic leading-snug text-l-ink outline-none placeholder:text-l-muted"
        />
        <button type="submit" className="whitespace-nowrap rounded-full bg-brand px-5 py-3 text-[15px] font-semibold text-l-ink active:scale-[0.98]">
          Make it write back
        </button>
      </div>
      <p className="text-[13px] text-l-muted">Free · in your browser · no sign-up · chats sealed on 0G</p>
    </form>
  );
}
