import { getTranslations } from "next-intl/server";
import { ACTIVITIES, type Activity } from "@/lib/seasons";

const COLORS: Record<Activity, string> = {
  directSowing: "bg-[#9cc58a] dark:bg-[#4c7a3f]",
  seedbed: "bg-[#e8c48f] dark:bg-[#8a6a3a]",
  transplant: "bg-[#a7c7e7] dark:bg-[#3a5a7a]",
  harvest: "bg-[#c8873a] dark:bg-[#e0a35c]",
};

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export async function MonthCalendar({ months, currentMonth }: { months: Record<Activity, number[]>; currentMonth: number }) {
  const t = await getTranslations();
  // Os 12 meses não cabem num celular: a tabela rola dentro do próprio bloco, nunca a página.
  return (
    <div className="overflow-x-auto">
    <table className="w-full min-w-[40rem] table-fixed border-separate border-spacing-1 text-center text-xs">
      <thead>
        <tr>
          <th className="w-32" />
          {MONTHS.map((m) => (
            <th
              key={m}
              data-testid={m === currentMonth ? "current-month" : undefined}
              className={`rounded-lg py-1 ${m === currentMonth ? "bg-primary text-primary-text" : "text-muted"}`}
            >
              {t(`months.${m}`)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ACTIVITIES.map((activity) => (
          <tr key={activity}>
            <th className="text-left text-sm font-semibold">{t(`activities.${activity}`)}</th>
            {MONTHS.map((m) => {
              const on = months[activity].includes(m);
              return (
                <td
                  key={m}
                  data-testid={on ? `month-cell-${activity}-${m}` : undefined}
                  aria-label={on ? `${t(`activities.${activity}`)} — ${t(`months.${m}`)}` : undefined}
                  className={`h-8 rounded-lg ${on ? COLORS[activity] : "bg-bg"}`}
                />
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
