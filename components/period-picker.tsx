"use client";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import styles from "./period-picker.module.css";

const options = [
  { value: "7", label: "7 hari terakhir" },
  { value: "30", label: "30 hari terakhir" },
  { value: "3650", label: "Semua waktu" },
];

export default function PeriodPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const active = options.find((option) => option.value === value) ?? options[1];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); button.current?.focus(); }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  return <div className={styles.root} ref={root}>
    <button type="button" ref={button} className={styles.trigger} aria-label={`Periode produk: ${active.label}`}
      aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((wasOpen) => !wasOpen)}>
      <CalendarDays size={13}/><span>{active.label}</span><ChevronDown size={12}/>
    </button>
    {open && <div className={styles.menu} role="menu" aria-label="Pilih periode produk">
      {options.map((option) => <button type="button" key={option.value} className={styles.option} role="menuitemradio"
        aria-checked={option.value === value} onClick={() => { onChange(option.value); setOpen(false); button.current?.focus(); }}>
        {option.label}{option.value === value && <Check size={14} aria-hidden="true"/>}
      </button>)}
    </div>}
  </div>;
}
