export const IDLE_TAB_TITLE = "Masz branie! Wróć tutaj";
export const IDLE_DELAY_MS = 60_000;
let normalTitle: string | null = null;
let idle = false;

export function setPageTitle(title: string) {
  normalTitle = title;
  document.title = idle ? IDLE_TAB_TITLE : title;
}

export function setIdleTabTitle(value: boolean) {
  if (normalTitle === null) normalTitle = document.title;
  idle = value;
  document.title = idle ? IDLE_TAB_TITLE : normalTitle;
}

/** Activity updates a timestamp rather than rescheduling a timer on every pointer movement. */
export function trackTabInactivity(target: EventTarget, page: Pick<Document, "visibilityState">, onIdle: (value: boolean) => void, delay = IDLE_DELAY_MS) {
  let lastActive = Date.now();
  let isIdle = false;
  let timer: ReturnType<typeof setTimeout>;
  const options = { capture: true, passive: true };
  const events = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart", "focus"];

  function check() {
    const remaining = delay - (Date.now() - lastActive);
    if (remaining > 0) { timer = setTimeout(check, remaining); return; }
    isIdle = true;
    onIdle(true);
  }
  function active() {
    lastActive = Date.now();
    if (isIdle) {
      isIdle = false;
      onIdle(false);
      clearTimeout(timer);
      timer = setTimeout(check, delay);
    }
  }
  function visibility() {
    if (page.visibilityState === "visible") active();
    else {
      lastActive = Date.now();
      clearTimeout(timer);
      timer = setTimeout(check, delay);
    }
  }
  onIdle(false);
  timer = setTimeout(check, delay);
  events.forEach((name) => target.addEventListener(name, active, options));
  target.addEventListener("visibilitychange", visibility, options);
  return () => {
    clearTimeout(timer);
    events.forEach((name) => target.removeEventListener(name, active, options));
    target.removeEventListener("visibilitychange", visibility, options);
    onIdle(false);
  };
}
