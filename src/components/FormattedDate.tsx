"use client";

/**
 * Client component that formats dates in the user's local timezone.
 * Server components run in UTC (on Vercel), so all date display
 * should go through this component to show correct local times.
 */
export function FormattedDate({
  date,
  format = "long",
}: {
  date: string;
  format?: "long" | "short";
}) {
  const d = new Date(date);

  if (format === "short") {
    return (
      <>{d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })}</>
    );
  }

  return (
    <>{d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })}</>
  );
}

export function FormattedTime({ date }: { date: string }) {
  const d = new Date(date);
  return (
    <>{d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}</>
  );
}

export function FormattedDateTime({
  date,
  format = "short",
}: {
  date: string;
  format?: "long" | "short";
}) {
  return (
    <>
      <FormattedDate date={date} format={format} /> · <FormattedTime date={date} />
    </>
  );
}
