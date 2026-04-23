import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { hasError: boolean; message: string };

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message || "Error desconocido" };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("RootErrorBoundary:", err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-background p-8 text-center">
          <h1 className="text-xl font-semibold text-foreground">Algo salió mal</h1>
          <p className="text-sm text-muted-foreground max-w-md break-words">{this.state.message}</p>
          <button
            type="button"
            className="rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            Recargar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
