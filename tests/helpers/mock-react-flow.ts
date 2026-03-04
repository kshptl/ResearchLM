import { vi } from "vitest"
import React from "react"

vi.mock("@xyflow/react", () => {
  const ReactFlowProvider = ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "rf-provider" }, children)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ReactFlow = (props: any) => {
    const nodes = (props.nodes ?? []) as Array<{
      id: string
      type?: string
      data: Record<string, unknown>
      selected?: boolean
    }>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeTypes = (props.nodeTypes ?? {}) as Record<string, React.ComponentType<any>>
    const onNodeClick = props.onNodeClick as ((event: React.MouseEvent, node: { id: string }) => void) | undefined
    const onPaneClick = props.onPaneClick as (() => void) | undefined

    return React.createElement(
      "div",
      {
        "data-testid": "rf-canvas",
        onClick: (e: React.MouseEvent) => {
          if ((e.target as HTMLElement).dataset?.testid === "rf-canvas") {
            onPaneClick?.()
          }
        },
      },
      nodes.map((node) => {
        const Component = nodeTypes[node.type ?? "default"]
        if (Component) {
          return React.createElement(
            "div",
            {
              key: node.id,
              "data-testid": `rf-node-${node.id}`,
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation()
                onNodeClick?.(e, node)
              },
            },
            React.createElement(Component, {
              id: node.id,
              data: node.data,
              selected: node.selected ?? false,
            })
          )
        }
        return React.createElement("div", { key: node.id, "data-testid": `rf-node-${node.id}` })
      }),
      props.children as React.ReactNode
    )
  }

  const MiniMap = () => React.createElement("div", { "data-testid": "rf-minimap" })

  const Background = () => React.createElement("div", { "data-testid": "rf-background" })

  const Handle = () => React.createElement("div", { "data-testid": "rf-handle" })

  const NodeResizer = () => React.createElement("div", { "data-testid": "rf-node-resizer" })

  const useReactFlow = () => ({
    setViewport: vi.fn(),
    getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
    fitView: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
  })

  return {
    ReactFlow,
    ReactFlowProvider,
    MiniMap,
    Background,
    BackgroundVariant: { Dots: "dots", Lines: "lines", Cross: "cross" },
    Handle,
    NodeResizer,
    Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
    useReactFlow,
  }
})
