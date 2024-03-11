
export enum ERilogEvent {
    REQUEST,
    CLICK,
    INPUT,
    CONSOLE_ERROR,
    DEBUG_MESSAGE,
}

export interface IRilogLocation {
    origin: string | null;
    href: string | null;
}

export interface IRilogEventItem {
    _id: string;
    type: ERilogEvent;
    date: string;
    data: any;
    location: IRilogLocation;
}

export interface IRilogResponse {
    result: "success" | "error";
}
