import { ERilogEvent, IRilogEventItem } from '../types/rilog';

const getEventTypeLabel = (eventType: ERilogEvent): string => {
  switch (eventType) {
    case ERilogEvent.REQUEST:       return 'REQUEST';
    case ERilogEvent.CLICK:         return 'CLICK';
    case ERilogEvent.INPUT:         return 'INPUT';
    case ERilogEvent.CONSOLE_ERROR: return 'CONSOLE_ERROR';
    case ERilogEvent.DEBUG_MESSAGE: return 'DEBUG_MESSAGE';
    case ERilogEvent.CONSOLE_WARN:  return 'CONSOLE_WARN';
    default:                        return 'UNKNOWN';
  }
};

const getEventRequestStatus = (eventItem: IRilogEventItem): string => {
  const data = eventItem.data as { response?: { status?: string | null } };
  return eventItem.type === ERilogEvent.REQUEST && data?.response?.status
    ? `:${data.response.status}`
    : '';
};

export { getEventTypeLabel, getEventRequestStatus };
