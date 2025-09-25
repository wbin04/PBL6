// hooks/useToast.ts
import * as React from "react";
import ToastMessage from "react-native-toast-message";

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

export type ToastActionElement = React.ReactElement | undefined;

export type ToastProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
  variant?: "default" | "destructive" | "success" | "error" | "info";
  position?: "top" | "bottom";
};

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

type ActionType = typeof actionTypes;

type Action =
  | { type: ActionType["ADD_TOAST"]; toast: ToasterToast }
  | { type: ActionType["UPDATE_TOAST"]; toast: Partial<ToasterToast> }
  | { type: ActionType["DISMISS_TOAST"]; toastId?: ToasterToast["id"] }
  | { type: ActionType["REMOVE_TOAST"]; toastId?: ToasterToast["id"] };

interface State {
  toasts: ToasterToast[];
}

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: "REMOVE_TOAST", toastId });
  }, TOAST_REMOVE_DELAY);
  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };
    case "DISMISS_TOAST": {
      const { toastId } = action;
      if (toastId) addToRemoveQueue(toastId);
      else state.toasts.forEach((t) => addToRemoveQueue(t.id));
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined ? { ...t, open: false } : t
        ),
      };
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) return { ...state, toasts: [] };
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.toastId) };
  }
};

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
}

type ToastInput = Omit<ToasterToast, "id">;

function mapVariantToType(v?: ToastProps["variant"]) {
  if (v === "destructive" || v === "error") return "error";
  if (v === "success") return "success";
  if (v === "info") return "info";
  return "default";
}

export function toast({ ...props }: ToastInput) {
  const id = genId();

  ToastMessage.show({
    type: mapVariantToType(props.variant) as any,
    text1: typeof props.title === "string" ? props.title : undefined,
    text2: typeof props.description === "string" ? props.description : undefined,
    position: props.position ?? "top",
    visibilityTime: props.duration ?? 4000,
    onShow: () => props.onOpenChange?.(true),
    onHide: () => props.onOpenChange?.(false),
  });

  const update = (next: ToasterToast) =>
    dispatch({ type: "UPDATE_TOAST", toast: { ...next, id } });

  const dismiss = () => {
    ToastMessage.hide();
    dispatch({ type: "DISMISS_TOAST", toastId: id });
  };

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return { id, dismiss, update };
}

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

