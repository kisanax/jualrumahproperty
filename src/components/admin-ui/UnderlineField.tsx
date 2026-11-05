import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SharedProps = {
  label: string;
  hint?: string;
  error?: string;
};

function FieldHelp({
  error,
  hint,
  id,
}: {
  error?: string;
  hint?: string;
  id?: string;
}) {
  if (!error && !hint) return null;
  return (
    <p
      id={id}
      role={error ? "alert" : undefined}
      className={cn("text-xs leading-4", error ? "text-destructive" : "text-muted-foreground")}
    >
      {error ?? hint}
    </p>
  );
}

export function UnderlineField({
  label,
  hint,
  error,
  className,
  ...props
}: SharedProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id ?? props.name;
  const helpId = id ? `${id}-help` : undefined;

  return (
    <div className={cn("grid gap-1.5", error && "aria-invalid", className)}>
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <Input
        {...props}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? helpId : undefined}
      />
      <FieldHelp error={error} hint={hint} id={helpId} />
    </div>
  );
}

export function UnderlineTextarea({
  label,
  hint,
  error,
  className,
  ...props
}: SharedProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = props.id ?? props.name;
  const helpId = id ? `${id}-help` : undefined;

  return (
    <div className={cn("grid gap-1.5", error && "aria-invalid", className)}>
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <Textarea
        {...props}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? helpId : undefined}
      />
      <FieldHelp error={error} hint={hint} id={helpId} />
    </div>
  );
}
