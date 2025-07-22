import { useToast } from "@/hooks/use-toast";

export default function Test() {
  const { toasts } = useToast();

  return (
    <div>
      <h2>Toast Count: {toasts.length}</h2>
      <ul>
        {toasts.map((t) => (
          <li key={t.id}>
            <strong>{t.title}</strong>: {t.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
