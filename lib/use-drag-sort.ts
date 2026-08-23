"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

const SETTLE = "transform 220ms cubic-bezier(0.2, 0, 0, 1)";

/* Die Drag-Animation läuft bewusst am DOM statt über React-State: bei 60 fps
   wäre ein Re-Render pro Frame Verschwendung. Die Helfer stehen außerhalb des
   Hooks, damit klar bleibt, dass hier nur imperativ das Layout bewegt wird. */

function applyTransform(el: HTMLElement, dx: number, dy: number, scale: number) {
  el.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`;
}

function beginDrag(el: HTMLElement) {
  el.style.transition = "none";
  el.style.willChange = "transform";
}

function settleBack(el: HTMLElement) {
  el.style.transition = SETTLE;
  el.style.transform = "";
  const clear = () => {
    el.style.transition = "";
    el.style.willChange = "";
    el.removeEventListener("transitionend", clear);
  };
  el.addEventListener("transitionend", clear);
}

/** FLIP: erst an die alte Stelle zurücksetzen, dann in die neue gleiten. */
function flip(el: HTMLElement, dx: number, dy: number) {
  el.style.transition = "none";
  el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  requestAnimationFrame(() => {
    el.style.transition = SETTLE;
    el.style.transform = "";
  });
}

function measureWithoutTransform(el: HTMLElement): DOMRect {
  const previous = el.style.transform;
  el.style.transform = "";
  const rect = el.getBoundingClientRect();
  el.style.transform = previous;
  return rect;
}

/**
 * Sortieren per Drag & Drop, ausgelegt auf Grids (nicht nur Listen) und Touch.
 *
 * Die vorige Version verglich nur clientY und bewegte die gezogene Karte gar
 * nicht — dadurch wirkte jedes Umsortieren wie ein Sprung. Hier folgt die Karte
 * dem Finger, das Zielfeld ergibt sich aus der 2D-Distanz zu den
 * Slot-Mittelpunkten, und die verdrängten Karten gleiten per FLIP mit.
 */
export function useDragSort(order: string[], onReorder: (next: string[]) => void) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [previewOrder, setPreviewOrder] = useState<string[] | null>(null);

  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  /** Slot-Positionen der letzten Layout-Runde, Basis für FLIP und Trefferzone. */
  const rectsRef = useRef<Map<string, DOMRect>>(new Map());
  /** Zeiger-Ursprung, laufend korrigiert wenn der eigene Slot wandert. */
  const originRef = useRef({ x: 0, y: 0 });
  const pointerRef = useRef({ x: 0, y: 0 });
  const draggingIdRef = useRef<string | null>(null);
  const orderRef = useRef<string[]>(order);
  const movedRef = useRef(false);
  const autoScrollRef = useRef<number | null>(null);

  // Die Vorschau überlagert die Quelle nur so lange, bis diese nachgezogen
  // hat — und immer gefiltert auf tatsächlich vorhandene Einträge, damit ein
  // zwischenzeitlich gelöschtes Element keine Karteileiche hinterlässt.
  const displayOrder = useMemo(() => {
    if (!previewOrder) return order;
    const known = new Set(order);
    const kept = previewOrder.filter((id) => known.has(id));
    if (kept.length === order.length) return kept;
    return [...kept, ...order.filter((id) => !kept.includes(id))];
  }, [previewOrder, order]);

  const setItemRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  }, []);

  /**
   * Alle Slot-Positionen frisch messen. Nötig direkt beim Start jedes Zugs:
   * rectsRef wird sonst nur nachgezogen, wenn sich displayOrder ändert — ein
   * Layout-Sprung, der die Reihenfolge nicht betrifft (typischerweise das
   * Einschalten des Bearbeiten-Modus selbst, das jede Karte um Knöpfe und
   * Griff-Symbol größer macht), aktualisiert die gespeicherten Rechtecke
   * nicht mit. Ein Zug, der auf diesen veralteten Koordinaten aufbaut, springt
   * dann beim ersten Vergleich auf einen Slot, der mit der echten Position des
   * Zeigers nichts zu tun hat — genau das sah aus wie zufälliges Herumspringen.
   */
  const remeasure = useCallback(() => {
    const next = new Map<string, DOMRect>();
    for (const [id, el] of itemRefs.current) {
      next.set(id, id === draggingIdRef.current ? measureWithoutTransform(el) : el.getBoundingClientRect());
    }
    rectsRef.current = next;
  }, []);

  const moveDraggedToPointer = useCallback(() => {
    const id = draggingIdRef.current;
    if (!id) return;
    const el = itemRefs.current.get(id);
    if (!el) return;
    applyTransform(
      el,
      pointerRef.current.x - originRef.current.x,
      pointerRef.current.y - originRef.current.y,
      1.04
    );
  }, []);

  // Nach jeder Reihenfolge-Änderung: verdrängte Karten gleiten an ihre neue
  // Position, und der Ursprung der gezogenen Karte wird um die Strecke
  // korrigiert, die ihr eigener Slot gewandert ist — sonst springt sie weg.
  useLayoutEffect(() => {
    orderRef.current = displayOrder;

    const next = new Map<string, DOMRect>();
    for (const id of displayOrder) {
      const el = itemRefs.current.get(id);
      if (!el) continue;
      next.set(id, id === draggingIdRef.current ? measureWithoutTransform(el) : el.getBoundingClientRect());
    }

    for (const [id, el] of itemRefs.current) {
      const previous = rectsRef.current.get(id);
      const now = next.get(id);
      if (!previous || !now) continue;
      const dx = previous.left - now.left;
      const dy = previous.top - now.top;
      if (dx === 0 && dy === 0) continue;

      if (id === draggingIdRef.current) {
        originRef.current.x -= dx;
        originRef.current.y -= dy;
        moveDraggedToPointer();
      } else {
        flip(el, dx, dy);
      }
    }

    rectsRef.current = next;
  }, [displayOrder, moveDraggedToPointer]);

  /**
   * Der Slot, dessen Mittelpunkt dem Zeiger am nächsten liegt, tauscht mit der
   * gezogenen Karte den Platz.
   *
   * Vorher wurde die gezogene Karte an der Zielposition eingefügt (Splice) —
   * in einer Liste unauffällig, aber in einem mehrspaltigen Grid verschob das
   * jede Karte zwischen alter und neuer Position um einen Platz. Eine
   * Reihenänderung ließ so plötzlich vier Karten gleichzeitig springen, ohne
   * dass erkennbar war, was eigentlich mit was getauscht hat. Ein reiner
   * Platztausch betrifft dagegen immer genau zwei Karten — unabhängig davon,
   * wie weit man zieht.
   */
  const reorderToPointer = useCallback(() => {
    const id = draggingIdRef.current;
    if (!id) return;
    const current = orderRef.current;
    const fromIndex = current.indexOf(id);
    if (fromIndex === -1) return;

    let bestIndex = fromIndex;
    let bestDistance = Infinity;
    for (let i = 0; i < current.length; i++) {
      const rect = rectsRef.current.get(current[i]);
      if (!rect) continue;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const distance = (pointerRef.current.x - cx) ** 2 + (pointerRef.current.y - cy) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    if (bestIndex === fromIndex) return;
    const next = [...current];
    [next[fromIndex], next[bestIndex]] = [next[bestIndex], next[fromIndex]];
    setPreviewOrder(next);
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current !== null) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  }, []);

  // Am oberen/unteren Rand mitscrollen, damit auch lange Listen erreichbar sind.
  const startAutoScroll = useCallback(() => {
    const EDGE = 90;
    const MAX_SPEED = 14;

    const step = () => {
      const y = pointerRef.current.y;
      const height = window.innerHeight;
      let speed = 0;
      if (y < EDGE) speed = -MAX_SPEED * (1 - y / EDGE);
      else if (y > height - EDGE) speed = MAX_SPEED * (1 - (height - y) / EDGE);

      if (speed !== 0) {
        window.scrollBy(0, speed);
        for (const [id, el] of itemRefs.current) {
          if (id === draggingIdRef.current) continue;
          rectsRef.current.set(id, el.getBoundingClientRect());
        }
        originRef.current.y -= speed;
        moveDraggedToPointer();
        reorderToPointer();
      }
      autoScrollRef.current = requestAnimationFrame(step);
    };

    autoScrollRef.current = requestAnimationFrame(step);
  }, [moveDraggedToPointer, reorderToPointer]);

  /* Bewusst KEIN setPointerCapture: beim Umsortieren verschiebt React den
     DOM-Knoten der gezogenen Karte, und ein Knotenwechsel gibt die Capture
     sofort wieder frei ("lostpointercapture" noch vor "pointerup"). Das
     Loslassen käme dann nie an und die Karte bliebe schweben. Deshalb hängen
     Move und Up für die Dauer des Ziehens am window. */
  const detachRef = useRef<(() => void) | null>(null);

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      const id = draggingIdRef.current;
      if (!id) return;
      pointerRef.current = { x: clientX, y: clientY };

      if (!movedRef.current) {
        const dx = clientX - originRef.current.x;
        const dy = clientY - originRef.current.y;
        // Kleine Schwelle, damit ein Tap kein Drag auslöst.
        if (Math.hypot(dx, dy) < 5) return;

        movedRef.current = true;
        remeasure();
        setDraggingId(id);
        setPreviewOrder(orderRef.current);
        const el = itemRefs.current.get(id);
        if (el) beginDrag(el);
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
        startAutoScroll();
      }

      moveDraggedToPointer();
      reorderToPointer();
    },
    [moveDraggedToPointer, reorderToPointer, remeasure, startAutoScroll]
  );

  const handleUp = useCallback(() => {
    const id = draggingIdRef.current;
    detachRef.current?.();
    detachRef.current = null;
    if (!id) return;
    stopAutoScroll();

    const el = itemRefs.current.get(id);
    const wasDragging = movedRef.current;
    draggingIdRef.current = null;
    movedRef.current = false;

    if (!wasDragging) return;
    if (el) settleBack(el);

    const final = orderRef.current;
    setDraggingId(null);

    // Die Vorschau bleibt stehen, bis die Quelle die neue Reihenfolge
    // übernommen hat — sonst sprängen die Karten für einen Frame zurück.
    if (final.join(",") === order.join(",")) setPreviewOrder(null);
    else onReorder(final);
  }, [onReorder, order, stopAutoScroll]);

  const onPointerDown = useCallback(
    (id: string, e: ReactPointerEvent<HTMLElement>) => {
      // Taps auf Buttons und Links im Inneren bleiben Taps.
      if ((e.target as HTMLElement).closest("button, a, input, [data-no-drag]")) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

      detachRef.current?.();
      draggingIdRef.current = id;
      movedRef.current = false;
      originRef.current = { x: e.clientX, y: e.clientY };
      pointerRef.current = { x: e.clientX, y: e.clientY };

      const move = (ev: PointerEvent) => handleMove(ev.clientX, ev.clientY);
      const up = () => handleUp();
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      detachRef.current = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
      };
    },
    [handleMove, handleUp]
  );

  // Beim Verlassen der Seite mitten im Ziehen nichts hängen lassen.
  useEffect(
    () => () => {
      detachRef.current?.();
      if (autoScrollRef.current !== null) cancelAnimationFrame(autoScrollRef.current);
    },
    []
  );

  const dragHandlers = useCallback(
    (id: string) => ({
      onPointerDown: (e: ReactPointerEvent<HTMLElement>) => onPointerDown(id, e),
    }),
    [onPointerDown]
  );

  return { displayOrder, draggingId, setItemRef, dragHandlers };
}
