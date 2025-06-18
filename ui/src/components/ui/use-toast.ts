// Inspired by react-hot-toast library
import * as React from "react"

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterProps = {
  toasts: ToasterToast[]
  toast: (toast: Omit<ToasterToast, "id">) => {
    id: string
    dismiss: () => void
    update: (props: ToasterToast) => void
  }
  dismiss: (toastId?: string) => void
}

const listeners: Array<(props: ToasterProps) => void> = []

let memoryState: ToasterProps = { toasts: [], toast: () => { throw new Error("Not implemented") }, dismiss: () => {} }

function dispatch() {
  memoryState = reducer(memoryState, { type: "DISPATCH" })
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Action =
  | { type: "ADD_TOAST"; toast: Omit<ToasterToast, "id"> }
  | { type: "UPDATE_TOAST"; toast: Partial<ToasterToast> }
  | { type: "DISMISS_TOAST"; toastId?: ToasterToast["id"] }
  | { type: "REMOVE_TOAST"; toastId?: ToasterToast["id"] }
  | { type: "DISPATCH" }


interface ToastProps extends React.ComponentPropsWithoutRef<typeof Toast> {}

const reducer = (state: ToasterProps, action: Action): ToasterProps => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [
          ...state.toasts,
          { ...action.toast, id: Math.random().toString(36).substr(2, 9) },
        ].slice(-TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
    case "DISPATCH": {
        return state
    }
  }
}

function toast(props: Omit<ToasterToast, "id">) {
  const id = Math.random().toString(36).substr(2, 9)

  dispatch()

  const update = (props: ToasterToast) => {
    // TODO: implement
  }
  const dismiss = () => {
    // TODO: implement
  }

  return {
    id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<ToasterProps>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => {
      // TODO: implement
    },
  }
}

export { useToast, toast }
