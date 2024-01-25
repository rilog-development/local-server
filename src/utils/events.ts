import { ERilogEvent } from "../types/rilog"

const getEventTypeLabel = (eventType: ERilogEvent): string => {
    if (eventType === ERilogEvent.CLICK) return "Click"
    if (eventType === ERilogEvent.INPUT) return "Input"
    if (eventType === ERilogEvent.DEBUG_MESSAGE) return "Debug msg"
    if (eventType === ERilogEvent.REQUEST) return "Request"
    if (eventType === ERilogEvent.CONSOLE_ERROR) return "CONSOLE"
    return "";
}

export { getEventTypeLabel } 