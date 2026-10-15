/**
 * A live interface on the top plate. `act` names the flow an action triggers, the control
 * that fired it and the values that fill the flow's placeholders (the card, the ticket…).
 * Controls that trigger a flow carry data-flow (and data-id), so the stack can show where
 * they lead before they are pressed, and a guided run can find them.
 */
export type MiniProps = { act: (flow: string, from: HTMLElement, values?: Record<string, string | number>) => void };
