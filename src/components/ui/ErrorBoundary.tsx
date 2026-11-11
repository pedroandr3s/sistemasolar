"use client";

import { Component, type ReactNode } from "react";

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

/** Captura errores de componentes pesados (WebGL, mapa) y muestra una alternativa. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[sistema-solar] componente con error:", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
