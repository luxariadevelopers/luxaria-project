type AuthFailureListener = () => void;

let onAuthFailure: AuthFailureListener | null = null;

export function setAuthFailureHandler(handler: AuthFailureListener | null) {
  onAuthFailure = handler;
}

export function notifyAuthFailure() {
  onAuthFailure?.();
}
