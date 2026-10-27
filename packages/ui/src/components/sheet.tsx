"use client";

import { Dialog } from "radix-ui";
import { X } from "lucide-react";

/** shadcn-style Sheet on Radix Dialog: focus trap, Escape, focus return. */
export function Sheet(props: { trigger: React.ReactNode; title: string; children: React.ReactNode; side?: "left" | "right" }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{props.trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[300] bg-black/40" />
        <Dialog.Content
          className={`fixed inset-y-0 z-[300] flex w-[min(20rem,85vw)] flex-col bg-[var(--surface)] p-4 shadow-[var(--shadow-3)] ${props.side === "left" ? "left-0" : "right-0"}`}
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-lg font-semibold">{props.title}</Dialog.Title>
            <Dialog.Close aria-label="Đóng" className="grid size-11 place-items-center rounded-full hover:bg-[var(--surface-2)]">
              <X size={20} strokeWidth={1.5} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Điều hướng chính của ZSOPO</Dialog.Description>
          <div className="mt-4 flex-1 overflow-y-auto">{props.children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const SheetClose = Dialog.Close;
