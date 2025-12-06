declare module "@hello-pangea/dnd" {
  import * as React from "react"

  export type DropResult = {
    draggableId: string
    type?: string
    reason?: "DROP" | "CANCEL"
    source: {
      index: number
      droppableId: string
    }
    destination?: {
      index: number
      droppableId: string
    } | null
    mode?: string
  }

  // Provided / snapshot types matching the runtime callbacks used in the codebase
  export type DroppableProvided = {
    droppableProps: Record<string, any>
    innerRef: (el: HTMLElement | null) => void
    placeholder: React.ReactNode
  }

  export type DroppableStateSnapshot = {
    isDraggingOver: boolean
    draggingOverWith?: string | null
  }

  export type DraggableProvided = {
    draggableProps: Record<string, any>
    dragHandleProps?: Record<string, any> | null
    innerRef: (el: HTMLElement | null) => void
  }

  export type DraggableStateSnapshot = {
    isDragging: boolean
    isDropAnimating?: boolean
    draggingOver?: string | null
  }

  // Minimal component types used in the project
  export const DragDropContext: React.ComponentType<{
    onDragEnd?: (result: DropResult) => void
    children?: React.ReactNode
  }>

  export const Droppable: React.ComponentType<{
    droppableId: string
    children?: (provided: DroppableProvided, snapshot: DroppableStateSnapshot) => React.ReactNode
    childrenProps?: any
  }>

  export const Draggable: React.ComponentType<{
    draggableId: string
    index: number
    children?: (provided: DraggableProvided, snapshot: DraggableStateSnapshot) => React.ReactNode
    childrenProps?: any
  }>

  export default any
}
